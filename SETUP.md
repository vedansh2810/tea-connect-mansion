# Setting this up in the cafe

A complete rollout guide for Tea Content Mansion's QR ordering system — from the
code as it stands today to a working dining room.

Read section 1 before buying anything or printing anything.

---

## 1. Read this first: what works today, and what doesn't

The app is finished and working. But the order store is **per-browser**, not
per-restaurant.

`src/store/OrdersContext.jsx` keeps orders in one `localStorage` key and
announces changes over a `BroadcastChannel`. Both of those are scoped to a
single browser profile on a single device.

**What that means in practice:**

| Scenario | Works? |
| --- | --- |
| Two tabs on the kitchen tablet | Yes |
| Two windows on the same laptop | Yes |
| Customer's own phone → kitchen tablet | **No** |
| Waiter's tablet → kitchen tablet | **No** |
| Any two separate devices | **No** |

A customer scanning the QR on their phone gets a working menu and can build an
order — and it goes nowhere. It sits in their phone's storage.

So there are two ways to open:

- **Track A — one device, this week.** A waiter carries a tablet to the table
  and takes the order on it; the same tablet is the pass. Zero backend, zero
  hosting cost, works with today's code exactly as it is. This is a real,
  usable product — it is just a digital order pad, not customer self-ordering.

- **Track B — customer phones, real QR ordering.** Requires swapping the store
  for a hosted database. About half a day of work, then it does what the QR
  codes promise. Section 4 has the exact steps and code.

**Do not print QR table cards until you have finished Track B.** Under Track A
the codes have nothing to point at.

---

## 2. Choose your model

Answer these three questions.

**Do you want customers ordering from their own phones, or staff taking orders?**
Customers' phones → Track B. Staff → Track A works now.

**How many tables?** Under about 15, either track is fine. More than that and
Track A's single tablet becomes a bottleneck at peak.

**Is your Wi-Fi reliable for guests?** Customer self-ordering fails badly on
patchy Wi-Fi. If guest Wi-Fi is weak, either fix it first (section 8) or start
with Track A.

**Recommendation for a 24×7 cafe:** run Track A for one or two weeks first. It
gets your staff fluent in the statuses and surfaces menu errors while the stakes
are low. Then do Track B and switch the room to customer phones. The customer
menu and the pass do not change between tracks — only the store behind them.

---

## 3. Track A — running it this week (no backend)

### 3.1 Build it

On the machine that will serve it, or any machine:

```bash
npm install
npm run build
```

That writes a static site to `dist/`.

### 3.2 Serve it on the cafe's own network

You do not need the internet for Track A. Pick one:

**Simplest — run from the tablet itself.** Install a static file server and
serve `dist/`:

```bash
npx serve dist --listen 8080
```

Then open `http://localhost:8080/?view=admin` on that device.

**Better — one always-on machine (an old laptop or a mini PC) serves the room.**
Run the same command on it, find its local IP (`ipconfig` on Windows,
`ifconfig` on macOS/Linux — something like `192.168.1.40`), and open
`http://192.168.1.40:8080/?view=admin` on the tablet. Give that machine a static
IP or a DHCP reservation in your router so the address never moves.

Note that under Track A, orders live in the **tablet's** browser profile. If the
waiter's tablet and the kitchen tablet are different devices, they will not see
each other. One device only.

### 3.3 The waiter's flow

1. Waiter opens `http://<host>:8080/?table=4` on the tablet at the table.
2. Takes the order, types any special requests into the note field.
3. Taps **Order now**. The order appears on the pass.
4. Back at the pass, switch to `?view=admin` to see the ticket. Kitchen works it.

To change table between visits, the header has a **Not table 4?** link, or just
edit the `?table=` number in the address bar.

### 3.4 What to skip

Under Track A, skip sections 6 (QR cards) and 4 (backend). Everything else —
kitchen device setup, staff training, menu verification, daily operations —
applies exactly the same.

---

## 4. Track B — real QR ordering from customer phones

This replaces the browser-local store with a hosted database. The customer menu,
the cart, the pass, the tickets and the QR panel all keep working unchanged —
they only talk to `OrdersContext`, and that is the single file you swap.

I recommend **Supabase**: hosted Postgres with realtime subscriptions, a free
tier that comfortably covers a single cafe, and nothing for you to run or patch.
If you would rather self-host, section 4.5 covers that.

### 4.1 Create the project

1. Sign up at supabase.com and create a project. Choose the region closest to
   the cafe — for India, Mumbai (`ap-south-1`).
2. Note your **Project URL** and **anon public key** from Project Settings →
   API. You will need both.

### 4.2 Create the table

In the Supabase SQL editor, run this:

```sql
-- Orders. One row per chit.
create table orders (
  id          text primary key,
  seq         integer not null,
  table_label text not null,
  lines       jsonb   not null,
  note        text    not null default '',
  subtotal    integer not null,
  status      text    not null default 'pending'
                check (status in ('pending','preparing','served','completed')),
  placed_at   timestamptz not null default now(),
  history     jsonb   not null default '[]'
);

-- Human-readable sequential bill numbers: TCM-0001, TCM-0002, …
create sequence orders_seq;
alter table orders alter column seq set default nextval('orders_seq');

create or replace function set_order_id() returns trigger as $$
begin
  new.id := 'TCM-' || lpad(new.seq::text, 4, '0');
  return new;
end $$ language plpgsql;

create trigger orders_set_id
  before insert on orders
  for each row execute function set_order_id();

-- Realtime so the pass updates without polling
alter publication supabase_realtime add table orders;

create index orders_status_placed_idx on orders (status, placed_at desc);
```

### 4.3 Lock down who can do what

This matters. Without it, anyone who finds your URL can read every order in the
restaurant and mark them all completed.

```sql
alter table orders enable row level security;

-- A guest may place an order, and may read orders (needed to track their own).
create policy "anon can place orders"
  on orders for insert to anon with check (true);

create policy "anon can read orders"
  on orders for select to anon using (true);

-- Only signed-in staff may change or remove an order.
create policy "staff can update"
  on orders for update to authenticated using (true);

create policy "staff can delete"
  on orders for delete to authenticated using (true);
```

Then create your staff login: Supabase → Authentication → Users → Add user.
Use a real email and a strong password, one shared account is fine for one cafe.

**Honest limitation of the policy above:** a guest can read *all* orders, not
just their own, because the app has no per-guest identity. For a cafe this is
low-risk — the data is table numbers and dish names — but do not put anything
sensitive in the note field. If you want it tighter, add a `session_token`
column, store a random token in the customer's `sessionStorage`, and change the
select policy to match on it.

### 4.4 Swap the store

```bash
npm install @supabase/supabase-js
```

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Add `.env.local` to `.gitignore` (it is already covered by the `*.local` entry).

Create `src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

/** Database row → the shape the rest of the app already expects. */
export function fromRow(row) {
  return {
    id: row.id,
    seq: row.seq,
    table: row.table_label,
    lines: row.lines,
    note: row.note ?? '',
    subtotal: row.subtotal,
    status: row.status,
    placedAt: row.placed_at,
    history: row.history ?? [],
  }
}
```

Now replace the body of `OrdersProvider` in `src/store/OrdersContext.jsx`. Keep
`STATUSES` and `STATUS_META` exactly as they are — every component imports them.

```jsx
export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState([])

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('placed_at', { ascending: false })
    if (!error && data) setOrders(data.map(fromRow))
  }, [])

  useEffect(() => {
    refresh()
    // Realtime: any insert or update on the table re-reads it, so the store
    // stays the single source of truth exactly as it did before.
    const channel = supabase
      .channel('orders-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refresh)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [refresh])

  const placeOrder = useCallback(
    async ({ table, lines, note, subtotal }) => {
      const { data, error } = await supabase
        .from('orders')
        .insert({ table_label: String(table), lines, note: note?.trim() || '', subtotal })
        .select()
        .single()
      if (error) throw error
      const order = fromRow(data)
      setOrders((current) => [order, ...current])
      return order
    },
    [],
  )

  const setStatus = useCallback(async (orderId, status) => {
    const current = orders.find((o) => o.id === orderId)
    await supabase
      .from('orders')
      .update({
        status,
        history: [...(current?.history ?? []), { status, at: new Date().toISOString() }],
      })
      .eq('id', orderId)
  }, [orders])

  const advance = useCallback(
    (orderId) => {
      const order = orders.find((candidate) => candidate.id === orderId)
      const next = order && STATUS_META[order.status]?.next
      if (next) setStatus(orderId, next)
    },
    [orders, setStatus],
  )

  const clearCompleted = useCallback(async () => {
    await supabase.from('orders').delete().eq('status', 'completed')
  }, [])

  const resetAll = useCallback(async () => {
    await supabase.from('orders').delete().neq('id', '')
  }, [])

  const value = useMemo(
    () => ({ orders, placeOrder, setStatus, advance, clearCompleted, resetAll }),
    [orders, placeOrder, setStatus, advance, clearCompleted, resetAll],
  )

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}
```

Add the imports at the top of the file and drop the now-unused `read`, `write`,
`makeOrderId`, `STORAGE_KEY` and `CHANNEL_NAME`:

```js
import { supabase, fromRow } from '../lib/supabase'
```

Two things to know: `placeOrder` is now `async`, and `CartSheet.jsx` already
awaits its placement path, so no change is needed there. And `useTableOrders`
keeps working unchanged, because it filters the same `orders` array.

### 4.5 Self-hosted alternative

If you would rather not use a third party: a Node server with SQLite and
Server-Sent Events does the same job in about 80 lines — `GET /orders`,
`POST /orders`, `PATCH /orders/:id`, and `GET /events` as the SSE stream. Swap
`supabase.channel(...)` for `new EventSource('/events')` and the queries for
`fetch`. You then own uptime, backups and TLS, which for a 24×7 cafe is a real
ongoing job. I would only do this if you already run a server.

### 4.6 Add a staff login to the pass

Right now `?view=admin` is open to anyone who guesses it. With Supabase auth in
place, gate it. The smallest honest version — add to `AdminDashboard.jsx`:

```jsx
const [session, setSession] = useState(null)

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => setSession(data.session))
  const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
  return () => sub.subscription.unsubscribe()
}, [])

if (!session) return <StaffLogin />
```

`StaffLogin` is a small form calling
`supabase.auth.signInWithPassword({ email, password })`. Staff sign in once per
device; the session persists.

If you want it even simpler, most hosts can password-protect a path for you —
see section 5.3.

---

## 5. Deploy and host it

### 5.1 Pick a host

Any static host works; the build output is plain files. **Cloudflare Pages**,
**Netlify** and **Vercel** all have free tiers that cover a single cafe, deploy
straight from a Git repo, and give you HTTPS automatically.

```bash
npm run build     # produces dist/
```

Point the host at the repo with build command `npm run build` and output
directory `dist`. Add your two `VITE_SUPABASE_*` values as environment variables
in the host's dashboard — the `.env.local` file is not deployed.

### 5.2 Use a short, memorable domain

The QR codes encode this URL, and customers occasionally type it. Something like
`order.teacontentmansion.com` or `tcm.cafe` beats a long default subdomain. Set
it up before generating codes — changing the domain later means reprinting every
table card.

**HTTPS is required.** All three hosts do it automatically. Without it, phones
show a "Not secure" warning on a page where people are placing orders.

### 5.3 No routing config needed

Both views are query strings, not paths:

- Customer menu: `https://order.yourcafe.com/?table=4`
- Kitchen pass: `https://order.yourcafe.com/?view=admin`

So you do **not** need SPA rewrite rules. (`useRoute.js` also accepts an
`/admin` path, which *would* need a rewrite — just use `?view=admin` and skip
the config.)

To password-protect the pass at the host level instead of in code: Cloudflare
Access, or Netlify's password protection on a redirect from `/pass`.

### 5.4 Verify the deployment before printing anything

On a phone on mobile data — not the cafe Wi-Fi:

- [ ] `https://order.yourcafe.com/?table=1` loads and shows Table 1
- [ ] Search works, adding items works, the bill opens
- [ ] Placing an order shows the stamped chit
- [ ] On a second device, `?view=admin` shows that order within a second or two
- [ ] Advancing the status on the pass updates the customer's chit
- [ ] The padlock shows in the address bar

If the fourth item fails, Track B is not finished. Stop and fix it.

---

## 6. Produce the QR table cards

Only after section 5.4 passes.

### 6.1 Decide your table numbering

Use whatever is already painted on your tables. The app accepts up to 6
characters, letters, digits and hyphens — `4`, `12`, `T7`, `G-2` all work. It
must match the physical plaque exactly, because that number is what the kitchen
reads off the ticket to find the table.

Count your tables including any outdoor or terrace seating.

### 6.2 Generate

1. Open the pass on a laptop: `https://order.yourcafe.com/?view=admin`
2. Click **Table codes**.
3. Set **Tables** to your count (up to 60).
4. Check that the URL printed under one of the codes is your real domain, not
   `localhost`. The codes are generated from whatever URL you are viewing, so
   generating them from a dev server bakes in a dead address.
5. Click **Print**.

If your tables are numbered non-sequentially (say 1–8 then 21–24), generate the
range that covers them and discard the cards you do not need, or copy individual
links with **Copy link** and make those cards separately.

### 6.3 Print and mount

- **Stock:** 250–300 gsm card. Thin paper curls and scans badly.
- **Size:** the code should end up at least 3 cm square. Bigger scans faster in
  low light — a 24×7 cafe has low light.
- **Finish:** matte lamination. Gloss reflects overhead lights straight into the
  camera and makes codes unreadable. This is the single most common cause of
  "the QR doesn't work."
- **Mount:** acrylic table tents, or laminated cards clipped to the menu holder.
  Avoid sticking them flat to the tabletop — people put plates on them, and a
  scratched code stops working.
- **Print two per table.** One spare per table, stored at the counter. They get
  spilled on.

### 6.4 Test every single card

Physically walk the room with two different phones — one Android, one iPhone —
and scan every card. Confirm each one opens the menu showing the *correct* table
number. A card printed for table 7 sitting on table 9 causes food to go to the
wrong table all day and is very hard to diagnose later.

Tick them off on a list as you go.

---

## 7. Set up the kitchen device

### 7.1 What to use

An old iPad, an Android tablet, or a cheap laptop. It needs a screen you can
read from a metre away and a speaker you can hear over kitchen noise. A 10-inch
tablet is the sweet spot.

If your kitchen and counter are separate rooms, put a device in each — with
Track B they stay in sync automatically.

### 7.2 Position and power

- Mount it where the person calling orders can see it without leaning — a wall
  bracket or a weighted stand, out of splash and steam range.
- **Keep it plugged in permanently.** This is a 24×7 service; a tablet on
  battery will die at 3 a.m.
- Screen brightness up. Heat plus glare makes dim screens unreadable.

### 7.3 Device settings

These matter more than they sound:

- **Disable screen sleep and auto-lock.** iPad: Settings → Display & Brightness
  → Auto-Lock → Never. Android: Settings → Display → Screen timeout → longest,
  and turn on Stay awake while charging in Developer options. Windows: Settings
  → Power → Screen never turns off when plugged in.
- **Disable automatic OS updates and scheduled restarts** during service hours.
- **Media volume high**, and check the device is not in silent mode.
- **Turn off notification popups** so a delivery-app alert does not cover a chit.

### 7.4 Browser setup

- Use Chrome or Safari. Open `https://order.yourcafe.com/?view=admin`.
- **Add it to the home screen** (iOS: Share → Add to Home Screen; Android:
  ⋮ → Add to Home screen). It then opens fullscreen with no address bar, which
  stops staff wandering off to other sites and gains you screen space.
- **Bookmark the customer view too**, at `?table=1`, for when a phone fails and
  a waiter needs to take the order manually.

### 7.5 The bell — an important quirk

Browsers refuse to play sound until someone taps the page, so **the bell has to
be switched on by hand after every reload.** The pass shows a brass **Turn on
the bell** button when it is off; once tapped, it reads **Bell on**.

Put this in the opening checklist. If nobody taps it, orders arrive silently and
get missed. The mute preference itself persists, but the browser's audio
permission does not survive a page reload.

---

## 8. Wi-Fi and network

Only critical for Track B with customer phones.

- **Coverage at every table, including the far corners and any terrace.** Walk
  the room with a phone and check you have a usable signal where people sit, not
  just near the router. Add a mesh node or access point where it drops.
- **A guest network, separate from the network your POS and back-office run on.**
  Standard security practice, and it stops guest traffic slowing your till.
- **No captive portal if you can avoid it.** Those "accept terms" splash pages
  frequently break the flow of opening a scanned link, and customers give up.
  If you must have one, print the Wi-Fi name and password on the table card
  alongside the QR code so people can connect before scanning.
- **The kitchen device should be on your own network, not guest**, and ideally on
  Ethernet if the position allows it.
- **What happens if the internet drops:** the pass keeps showing orders already
  loaded, but new orders cannot arrive and status changes do not save. Have a
  fallback — a pad of paper and the pre-existing verbal system. Tell staff the
  plan before it happens, not during.

---

## 9. Verify the menu, prices and tax

Do this with whoever sets your prices, before launch. Errors here cost real
money and are visible to every customer.

### 9.1 Check the data against the current card

Everything lives in one file: `src/data/menu.js`. It holds 7 sections, 42
groups, 257 items and 18 chef's specials, transcribed from
`tea connent mansion menu.pdf`.

Print the app's menu side by side with your current printed card and check every
price. The PDF I worked from may not be your latest revision.

### 9.2 Decide on the spellings

The printed card has some typos, and the app currently uses corrected spellings
so the live menu does not look broken:

| Printed card | App shows |
| --- | --- |
| CRIPSY PAKODE | Crispy Pakode |
| BUTTERSCOTH ICE CREAM | Butterscotch Ice Cream |
| PAIN NAAN | Plain Naan |
| FLUROSCENT DELIGHT | Fluorescent Delight |
| DESI GHEE KHICDI | Desi Ghee Khichdi |
| AALO / JEERA AALU | Aloo / Jeera Aloo |

If your staff and kitchen call them by the printed names, change them back in
`src/data/menu.js` — nothing else in the app refers to the display names.

### 9.3 Tax

The GST rate is configuration, not something baked into the code, because it is
the café's tax position rather than a guess worth compiling in.

**Leave `VITE_GST_PERCENT` blank** and the bill shows a subtotal with "GST extra,
as applicable" — exactly what the printed card says today.

**Set it** — `VITE_GST_PERCENT=5` — and the customer's bill, their chit and the
kitchen ticket all show a GST line and a **Total to pay**. Indian restaurant
service is commonly 5% without input tax credit, but confirm the rate with the
café's accountant rather than taking that as given.

The rate is **stored on each order** as it is placed, not recalculated later. A
rate change next month therefore cannot rewrite what a customer was quoted
today, and old chits stay accurate.

**This is still an order-taking system, not a billing system.** The counter POS
remains the system of record for the bill, the tax invoice and the accounts — and
a real GST invoice splits the rate into CGST and SGST, which this does not do.
What the total achieves is that nobody is surprised at the counter by a number
they were never shown.

### 9.4 Check the modelling of your actual menu

A few items were interpreted, not just copied. Confirm these are right:

- **Chai comes in three sizes** — Single, Pot for 2, Pot for 4 — as separate
  taps on one row.
- **Group add-ons**, offered on the bill rather than the menu row: ice cream ₹40
  on Cold Brews, Thick Shakes, Fluffy Pancakes and Artisan Waffles; cheese ₹30
  on Sandwiches; curd, pickle and papad ₹60 on Comfort Pot.
- **Required choices**, which the kitchen is told explicitly: Veg Manchurian
  (Dry/Gravy), Chilli Paneer (Dry/Gravy), Malai Kofta (Red/White), The Comfort
  Bowl (Dal/Choley), Coke/Sprite.
- **Everything is marked vegetarian.** If you ever add a non-veg item, the veg
  mark in the header becomes wrong and needs per-item handling.

### 9.5 Marking things sold out

The pass has a **Sold out** button in its header. Anything marked there stops
being orderable on every phone in the room immediately: the row dims, the price
is struck through, and the add button is replaced by "Sold out".

The panel is arranged around what the kitchen actually does:

- **Off the menu now**, at the top, with a **Put back** button on each item.
  Restoring is the urgent action — an item left marked off after the delivery
  arrives loses sales quietly all day.
- **Take something off**, below, behind a search. Marking something off should be
  deliberate.
- **Put everything back** clears the lot, for the start of a shift.

The count sits on the header button in dark red whenever anything is off, so
nobody forgets. **Make "check the sold-out list" part of the opening routine**
(section 13).

If an item sells out while it is already sitting in someone's cart, their bill
says so, names the item, offers to remove it, and will not send the order until
they do. They keep the rest of their order.

---

## 10. Train the staff

Budget about 30 minutes. Do it on the real devices, not by explaining.

### 10.1 What the four statuses mean

Agree the meaning out loud, because the words are only useful if everyone
reads them the same way:

| Status | Means | Who moves it |
| --- | --- | --- |
| **Pending** | Received, nobody has started | set automatically |
| **Preparing** | Kitchen has started cooking | kitchen, on starting |
| **Served** | Food is on the table | server, after delivering |
| **Completed** | Bill settled, table done | counter, after payment |

The customer sees these on their own chit, so they mean something to guests too.
"Served" while the food is still on the pass will produce complaints.

### 10.2 Reading a ticket

Walk them through one real ticket on screen:

- **Table number** — largest thing on the chit, top left.
- **Held time** — how long since the order arrived. This is the number that
  matters at peak.
- **Running long** — appears in dark red when a pending or preparing order
  passes 10 minutes, and the whole ticket gets a red glow. Treat it as a prompt
  to check, not an alarm.
- **Special request** — boxed with a red edge. Teach them to read this *before*
  starting the dish. This is the field that causes remakes when missed.
- **Line detail** — the small grey line under a dish is the size, the choice or
  the add-on: "Pot for 4", "Gravy", "with ice cream". It is part of the order.

### 10.3 The controls

- The **dark button** does the obvious next step: Start preparing → Mark served
  → Close bill.
- The **four small buttons** underneath set any status directly, for fixing a
  mis-tap.
- **Filters** across the top: Live is the working view, oldest order first.
  Pending / Preparing / Served / Completed narrow it. All shows everything.
- **Clear N closed** removes completed orders from the screen.

### 10.4 A table ordering a second time

Each order is a separate chit. A table that orders dessert later produces a
second ticket for the same table number — it does not merge into the first. The
counter adds them up at the till. Make sure whoever settles bills knows to check
for more than one chit per table.

### 10.5 Things that will happen in week one

Rehearse the answers:

- *"The QR won't scan."* Check for glare, then hand them the card from the
  counter spare. If still failing, take the order on the staff tablet.
- *"I don't have a smartphone / no data."* Take the order on the staff tablet at
  `?table=N`. Never make this the customer's problem.
- *"I ordered but nothing came."* Check the pass, filtered to that table.
- *A customer wants to cancel.* There is no customer-side cancel. Staff set the
  order to Completed on the pass and tell the kitchen verbally.

---

## 11. Pilot for a week before committing the room

Do not switch every table on day one.

1. Pick **3 or 4 tables**, ideally in sight of the counter. Put QR cards only on
   those.
2. **Keep the printed menus on every table**, including the pilot ones, for the
   whole pilot.
3. Brief the staff that these tables are the test and to watch them.
4. Each day, note: orders that didn't arrive, codes that wouldn't scan, wrong
   prices, dishes customers couldn't find in search, anything the kitchen
   misread.
5. Fix the menu data and reprint cards as needed.

**Go/no-go after a week:** if orders arrive reliably, the kitchen is not asking
tables to repeat themselves, and prices are right, expand to the full room.
Otherwise fix what broke and pilot another week.

Keep printed menus in the room permanently regardless. Some customers will never
use the QR, and that is fine.

---

## 12. Go-live checklist

Print this and tick it.

**Before opening**

- [ ] Deployed to the real domain over HTTPS
- [ ] Order placed on one device appears on a *different* device (Track B only)
- [ ] Every price checked against the current printed card
- [ ] Every QR card scanned and opens the correct table number
- [ ] Two spare QR cards per table stored at the counter
- [ ] Kitchen device mounted, plugged in, screen sleep disabled
- [ ] Kitchen device volume up and **bell switched on**
- [ ] Pass added to the device home screen
- [ ] Staff briefed on the four statuses and the special-request box
- [ ] Wi-Fi tested at the furthest table
- [ ] Paper fallback agreed and staff know when to use it
- [ ] Admin view password-protected (section 4.6 or 5.3)
- [ ] Printed menus still on the tables

**First hour of service**

- [ ] Place a real order yourself from a customer phone and follow it through
      all four statuses
- [ ] Confirm the bell is audible from where the kitchen actually stands
- [ ] Watch one real customer scan and order without helping them, and note
      where they hesitate

---

## 13. Daily and weekly operations

### Opening a shift

1. Wake the kitchen device; confirm the pass is loaded.
2. **Tap the bell on.** It does not survive a reload.
3. **Check the Sold out button.** If it shows a count, open it and put back
   anything you now have. Yesterday's shortages are the easiest money to lose.
4. Filter to **Completed**, hit **Clear N closed** to clear yesterday out.
5. Confirm one test order still flows end to end.

### During service

- Advance statuses as work happens, not in a batch at the end. The customer is
  watching their own chit.
- Watch for **Running long**.
- Set orders to **Completed** as bills settle, so the Live view stays honest.

### Closing / shift change

- Clear completed orders.
- Reload the page once — and tap the bell on again afterwards.
- Note anything odd in a shared log: missed orders, scan failures, item
  complaints. Patterns show up in a week.

### Weekly

- Reprint any scuffed or scratched table cards.
- Reconcile the pass against the till for one busy hour, as a spot check that
  nothing is being lost.
- Check for stale open orders that were never closed.

### On order history and records

Under **Track A**, orders live only in that device's browser storage. Clearing
browser data deletes them. Under **Track B** they are rows in your Supabase
database, and **Clear closed permanently deletes them**.

Either way: **this is not your accounting record.** Your POS is. If you want
order history for analysis, export from Supabase before clearing, or change
`clearCompleted` to set an `archived` flag instead of deleting — a small change,
ask if you want it.

---

## 14. Changing the menu later

All menu content is in `src/data/menu.js`. There is no admin UI for it — editing
means a code change and a redeploy.

**To change a price:** find the item, change `price`, save, commit. Your host
rebuilds and deploys automatically, usually in under a minute.

**To add an item:** copy an existing entry into the right group. It needs a
unique `id` (lowercase, hyphenated), a `name` and a `price`. Optional:
`chef: true` for the chef's-hat mark, `note` for a description line, `choices`
for a required pick.

```js
{ id: 'kesar-badam-milk', name: 'Kesar Badam Milk', price: 150 },
{ id: 'tandoori-momos', name: 'Tandoori Momos', price: 185, chef: true },
```

**To remove an item:** delete its line. Orders already placed keep their own copy
of the line, so old chits stay readable.

**Tell customers about a price change before it goes live** — someone will have
the old page open on their phone.

If you will be changing prices weekly, the right answer is to move the menu into
the database with an admin screen. That is a bigger piece of work; worth it if
menu churn is high, not worth it if you revise twice a year.

---

## 15. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Customer orders never reach the pass | Track B not done, or Supabase keys missing in the host's env vars | Section 4; check the browser console on the customer device |
| QR won't scan | Glossy lamination reflecting light, code too small, or scratched | Matte finish, 3 cm minimum, use a spare card |
| Code opens the wrong table | Card printed for a different table | Reprint; check against your table list |
| Code opens `localhost` and fails | Codes generated from the dev server | Regenerate from the deployed URL (section 6.2) |
| Orders arrive silently | Bell not switched on after reload | Tap **Turn on the bell**; add to opening checklist |
| Pass shows nothing after a reload | Filter left on Completed, or Clear closed was pressed | Switch to **Live** |
| Customer sees "Scan the code on your table" | URL is missing `?table=` | Use the card, or type the table into the fallback field |
| Two chits for one table | Working as designed — a second order is a second chit | Counter totals both |
| Status changes don't stick | Not signed in as staff, so the RLS update policy blocks it | Sign in (section 4.6) |
| Page blank after a deploy | Build failed, or env vars missing on the host | Check the host's build log |

---

## 16. Known limits, and what to add next

Honest list of what this does not do, roughly in the order I would fix them for
a working cafe:

1. **No customer-side cancel or edit** after placing. Staff fix it on the pass.
2. **No kitchen printer integration.** The pass is a screen only. Thermal
   printing is a real addition if your kitchen prefers paper.
3. **No merged table bill.** Multiple chits per table are totalled by hand.
4. **No sales reporting.** No daily totals or best-seller view. The data is in
   the database if you add Track B, so this is mostly a reporting screen.
5. **No menu admin UI.** Price changes need a redeploy (section 14). Sold-out is
   live, but prices and new dishes are not.
6. **No order history archive.** Clear closed deletes.
7. **No offline support.** Wi-Fi down means no new orders.
8. **Single branch.** No concept of multiple locations.
9. **The GST total is not a tax invoice** — no CGST/SGST split (section 9.3).

None of these block opening. All of them are additions rather than rewrites,
because the store is behind one interface and the menu is one data file.

---

## Where to start

**This week, with what exists:** section 3. One tablet, one waiter, no backend,
no printing. You will learn more about how your room actually works in three
days of this than in a month of planning.

**Then, for real QR ordering:** section 4, then 5, then 6. Half a day of work
plus printing, and the codes on the tables start doing what they promise.
