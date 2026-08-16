# Tea Connect Mansion — QR table ordering

A customer menu that opens from the QR code on a table, and a kitchen pass that
receives the orders. Two screens, one shared store.

```bash
npm install
npm run dev
```

Then open <http://localhost:5173/?table=4>.

With no configuration the app stores orders in the browser only, which is enough
to walk through both screens on one machine. To let a customer's phone reach the
kitchen tablet, connect a database:

```bash
npm run setup
```

That asks for the Supabase URL and key, the GST rate and a pass code, writes
`.env.local`, and then checks the database really has the tables it needs. Run
`npm run check` any time to re-verify without changing anything.

**[DEPLOY.md](DEPLOY.md)** has the full path to a free public demo.
**[SETUP.md](SETUP.md)** covers rolling it out in an actual café.

---

## The two views

Both live at the same URL and are chosen by query string.

| What you want | URL |
| --- | --- |
| Customer menu for table 4 | `/?table=4` |
| Customer menu, any table | `/?table=11`, `/?table=T2` … |
| The scan prompt (no table set) | `/` |
| Kitchen pass | `/?view=admin` |

**To see the handoff, open two windows side by side**: `/?table=4` in one and
`/?view=admin` in the other. Place an order on the left and it lands on the
right immediately, with the bell and a drop-in on the ticket.

In development — or on any URL carrying `?demo` — the menu footer gains an
**Open the kitchen pass** button and the scan prompt gains table shortcuts, so
you can walk both sides without editing the address bar. Neither appears in a
production build unless `?demo` is present.

The kitchen pass has a **Table codes** panel that generates and prints a real QR
card per table. Each code encodes this app's own URL with `?table=N`, so the
codes work from whatever host you deploy to.

---

## How the shared state works

`src/store/backend.js` holds two adapters behind one interface, and picks one at
build time:

| Mode | When | Orders cross devices? |
| --- | --- | --- |
| **cloud** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set | **Yes** |
| **local** | neither is set | No — one browser profile only |

**Cloud** is Supabase Postgres with realtime subscriptions. This is what a real
dining room needs: a customer's phone reaches the kitchen tablet. Run
`supabase/schema.sql` once to create the table, then set the two variables. See
[DEPLOY.md](DEPLOY.md).

**Local** keeps orders in one `localStorage` key and announces every write twice
— over a `BroadcastChannel` (instant, same browser) and via the native `storage`
event as the fallback. Good for a single-tablet setup where a waiter takes orders
on the same device that shows the pass.

Either way, listeners re-read the store rather than trusting a message payload,
so it stays the single source of truth and duplicate notifications are harmless.
`src/store/OrdersContext.jsx` holds only React state and the operations the UI
needs, so switching backends never touches a component. The pass displays which
mode is active, because "no orders yet" and "orders are going nowhere" must not
look the same.

Status changes are optimistic so the pass feels instant under a tap, with a retry
banner if a write is rejected. A failed order placement keeps the customer's cart
and says so — never clear someone's order and tell them it worked.

`src/store/CartContext.jsx` holds the cart for one seating. It is scoped per
table and kept in `sessionStorage`, so a refresh does not lose the order but a
new customer at the same table starts clean. A cart line is keyed by item +
serving size + required choice + add-on, so a single Adrak Chai and a Pot for 4
are two separate lines.

---

## Layout

```
src/
  data/menu.js               the printed card, transcribed — 257 items
  store/
    backend.js               where orders live: Supabase, or this browser
    OrdersContext.jsx        the shared order store the UI talks to
    AvailabilityContext.jsx  what the kitchen has run out of
    CartContext.jsx          one table's cart
  lib/
    useRoute.js              ?table= / ?view= parsing, and tableUrl() for QR
    useChime.js              the pass bell, synthesised in WebAudio
    tax.js                   the configured GST rate, applied
    format.js                rupees, clock time, held time
  components/
    ornament/Ornaments.jsx   brass rules, frames, chef mark, veg mark
    chit/ChitPaper.jsx       the chit — shared by the cart and the ticket
    customer/
      TableGate.jsx          shown when no table is in the URL
      CustomerMenu.jsx       header, search, section rail, chit tab
      SectionBlock.jsx       a menu page and its groups
      ItemRow.jsx            name ⋯ price, made tappable
      CartSheet.jsx          the bill, with notes and add-ons
      OrderPlaced.jsx        the stamped chit, tracking live status
    admin/
      PassGate.jsx           the staff PIN on the pass
      AdminDashboard.jsx     the pass: counts, filters, the rail
      OrderTicket.jsx        the kitchen's copy of the chit
      SoldOut.jsx            mark items off, put them back
      TableCodes.jsx         printable QR cards
scripts/setup-supabase.mjs   npm run setup — configure and verify
supabase/schema.sql          run once to create the tables
.env.example                 the four settings, explained
```

---

## Design notes

The visual direction is taken from the restaurant's own printed card rather
than invented: parchment stock, brass hairlines tipped with a small crown, the
oxblood double-rule frame, letterspaced Didone capitals, the chef's-hat mark on
specials.

**The chit is the signature.** One piece of paper, torn top and bottom, set in
monospace — it is the customer's bill while they order and the kitchen's ticket
once they have. The same artifact either side of the pass, which is also what
the shared store does. Nothing else in the app uses that treatment.

**The pass inverts the world.** Same tokens, dark ground: a parlour on one side
of the kitchen door, a ticket rail under warm light on the other.

**Didone for voice, mono for data.** Bodoni carries the wordmark and the section
titles. Every figure someone has to act on — table numbers, prices, held times —
is Plex Mono, because a Didone's hairlines thin out to nothing at numeral sizes
and a table number has to read across a hot kitchen.

Rows use the printed card's dot leader instead of photo cards: there are no
photographs of these dishes, and a leader row scans faster on a phone anyway.

Motion is one page-load rule draw, one chit drop on arrival, and the pass
flash — all of it dropped under `prefers-reduced-motion`.

---

## Menu data

Transcribed from `tea connent mansion menu.pdf`: 7 sections, 42 groups, 257
items, 18 chef's specials, with the three chai pot sizes, the group
add-ons (ice cream ₹40, cheese ₹30, curd-pickle-papad ₹60) and the plate
descriptions all carried across.

Where the printed card had clear typos, the app uses the corrected spelling so
the menu does not read as broken: *Cripsy → Crispy Pakode*, *Butterscoth →
Butterscotch*, *Pain Naan → Plain Naan*, *Fluroscent → Fluorescent Delight*,
*Khicdi → Khichdi*, *Aalo → Aloo*, and *Jeera Aalu → Jeera Aloo*. Prices,
grouping and section names are exactly as printed. To restore the original
spellings, edit `src/data/menu.js` — nothing else refers to the display names.

Items printed as a slash choice became a required pick the kitchen is told
about, rather than an ambiguous name: Veg Manchurian (Dry/Gravy), Chilli Paneer
(Dry/Gravy), Malai Kofta (Red/White), The Comfort Bowl (Dal/Choley), and
Coke/Sprite.

---

## Sold out, and GST

**Sold out** is shared through the same backend as orders, so the moment the
kitchen marks paneer off, every phone in the room stops offering it — the row
dims, the price is struck, the add button becomes "Sold out". If the item is
already in someone's cart, their bill names it and refuses to send until they
remove it; they keep the rest of the order. The pass keeps the count on its header
button, because an item left marked off after the delivery arrives loses sales
quietly all day.

**GST** is off unless `VITE_GST_PERCENT` is set — the rate is the café's tax
position, not a constant worth compiling in on their behalf. Blank means the bill
reads "GST extra, as applicable", like the printed card. Set it and the bill, the
chit and the ticket all show a GST line and a **Total to pay**. The rate is stored
on each order, so changing it later cannot rewrite what a customer was quoted.

It is still not a tax invoice — no CGST/SGST split, and the till remains the
system of record. What it buys is that nobody is surprised at the counter.

## What is deliberately not built

- **No payment.** Checkout ends at "Pay at the counter", as specified.
- **No customer-side cancel** after placing. Staff fix it on the pass.
- **Prices and new dishes need a redeploy** — sold-out is live, repricing is not.
- **The pass PIN is a speed bump, not security.** It ships in the bundle. Pair it
  with host-level access control — [DEPLOY.md](DEPLOY.md) section 6.
- **Demo database policies are permissive** by default so the pass works without
  a login. Tighten them before real service; `supabase/schema.sql` explains how.

The full list, in the order I would fix them, is in [SETUP.md](SETUP.md)
section 16.
