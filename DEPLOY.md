# Deploying the demo — free hosting, step by step

Getting Tea Content Mansion onto a public URL you can hand to the café owner,
where they can scan a code with their own phone and watch the order land on your
laptop.

**Time:** about 60–90 minutes the first time. **Cost:** nothing.

Everything the app needs is already built. What follows is configuration and
hosting, not development.

---

## 0. What changed, and what "ready" now means

The order store used to be browser-local, which meant a customer's phone could
never reach the kitchen screen. That is fixed. `src/store/backend.js` now holds
two adapters behind one interface:

| Mode | When | Orders cross devices? |
| --- | --- | --- |
| **local** | no database configured | No — one browser only |
| **cloud** | `VITE_SUPABASE_*` set | **Yes** |

The app picks automatically at build time. Nothing else in the code knows or
cares — components only ask `mode` so the pass can display it honestly.

The pass header shows which mode it is in: a brass **This device only** badge,
or a green **Live** dot. If you ever demo and see "This device only", your
environment variables did not reach the build.

Also added since the last handover:

- **A PIN on the pass** (`VITE_PASS_PIN`), so a public demo URL is not wide open.
- **Failed orders no longer vanish.** If the network drops mid-order the cart is
  kept and the bill says "Not sent — your order is still here". Silently
  clearing a customer's order while telling them it worked was the worst bug
  this screen could have.
- **Optimistic status changes**, so the pass feels instant on café Wi-Fi, with a
  retry banner if a write is rejected.
- **Reconnect on wake.** A tablet that sleeps overnight re-reads on waking.

---

## 1. What you need before you start

- **Node.js 18 or newer.** Check with `node --version`.
- **A GitHub account** (free) — for connecting the host to the code.
- **A Supabase account** (free) — the order database.
- **A Cloudflare account** (free) — hosting.
- **Two devices for testing**: a laptop and a phone. Both are essential; you
  cannot verify the thing that matters with one device.

---

## 2. Choose a host — read this before picking

Free tiers differ in ways that matter for a business, not just technically.

| Host | Free tier | Commercial use | Notes |
| --- | --- | --- | --- |
| **Cloudflare Pages** | Very generous | **Allowed** | What I recommend |
| **Netlify** | 100 GB/month | **Allowed** | Also fine; has drag-and-drop deploy |
| **Vercel Hobby** | Generous | **Not allowed** | Hobby is non-commercial per their terms |

**Do not run a paying café on Vercel's Hobby plan.** It is excellent for
personal projects, but its free tier excludes commercial use — and a restaurant
taking orders is commercial. Use Cloudflare Pages or Netlify, or pay for Vercel
Pro. Verify current terms yourself before committing; these things change.

This guide uses **Cloudflare Pages**. Netlify steps are in section 5.4.

---

## 3. Create the order database

### 3.1 New project

1. Go to supabase.com, sign in, **New project**.
2. Name it `tea-content-mansion`.
3. Set a database password and **save it somewhere** — you will not be shown it
   again.
4. Region: pick the one closest to the café. For India, **Mumbai (ap-south-1)**.
   This directly affects how fast orders appear.
5. Wait for provisioning, usually a minute or two.

### 3.2 Create the table

1. In the left sidebar, **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` from this project, copy the whole file, paste it
   in.
3. Click **Run**. You should see "Success. No rows returned."

That creates the `orders` table, the `TCM-0001` bill-number sequence, the index,
the realtime publication and the demo access policies.

Verify: **Table Editor** in the sidebar should now list `orders` with no rows.

### 3.3 Copy your keys

**Project Settings** → **API**. You need two values:

- **Project URL** — like `https://abcdefgh.supabase.co`
- **anon public** key — a long string starting `eyJ...`

The anon key is *designed* to be public and shipped in a browser bundle. That is
fine. **Never copy the `service_role` key into this project** — that one bypasses
all access rules.

### 3.4 One free-tier gotcha that will bite you

**Supabase pauses free projects after about a week of no activity.** If you set
this up, then demo to the café ten days later, the database will be asleep and
the demo will fail in front of your client.

Either:

- Open the Supabase dashboard once every few days, or
- Place a test order on your deployed site every few days, or
- Run the demo within a few days of setting up.

Check the dashboard the morning of the meeting regardless. If it is paused,
there is a **Restore** button — it takes a couple of minutes, so do not discover
this five minutes before.

---

## 4. Connect it locally and prove multi-device works

Do this on your own machine before deploying anything. It is much easier to
debug locally than through a host's build logs.

### 4.1 Configure

Run the setup script. It asks for each value, validates it, writes `.env.local`,
and then checks the database actually answers:

```bash
npm run setup
```

It asks four things:

| Prompt | Where it comes from |
| --- | --- |
| Project URL | Supabase → Project Settings → API |
| Anon public key | same page — the **anon public** one |
| GST percent | the café's accountant, or blank |
| Pass code | your choice, 3–12 characters, or blank |

Press Enter at any prompt to keep an existing value, so re-running it to change
one setting is safe. Your previous file is saved as `.env.local.bak`, and any
settings the project does not manage are carried over.

Three things it will stop you doing:

- **Pasting the `service_role` or `sb_secret_` key.** It decodes the key, and
  refuses outright rather than warning. That key bypasses every access rule and
  would be compiled into the JavaScript handed to every customer's phone.
- Entering a nonsense URL, an `http://` URL, or a GST value that is not a number.
- Silently ending up with no pass code — it warns that the pass would be open.

If the schema has not been applied yet, the script says so and offers to run it
for you with a personal access token, or points you at the SQL editor. Either
way it re-checks afterwards.

To verify an existing setup without changing anything:

```bash
npm run check
```

That exits non-zero if anything is wrong, so you can use it before a deploy.

`.env.local` and its backup are both gitignored and never deployed.

Leave GST blank if the café has not confirmed a rate — the bill then reads "GST
extra, as applicable", like the printed card. Do not guess a rate on their
behalf.

### 4.2 Restart the dev server

Vite reads environment variables at startup, so **you must restart** — a hot
reload will not pick these up. Stop it and run:

```bash
npm run dev
```

### 4.3 Verify

`npm run setup` already confirmed the database answers and has the right tables.
What remains is proving that a *second device* reaches it.

1. Open `http://localhost:5173/?view=admin`. It should ask for your PIN.
2. Enter it. The header badge should now read **Live** with a green dot, not
   "This device only". If it still says "This device only", your `.env.local` is
   not being read — check the filename and that you restarted.
3. Find your machine's LAN address (`ipconfig` on Windows, look for IPv4).
4. On your **phone**, on the same Wi-Fi, open
   `http://192.168.1.x:5173/?table=4`.
5. Place an order on the phone.
6. **It should appear on the laptop within a second or two.**

That last step is the whole product. If it works here, the rest is deployment
mechanics.

If it does not: open the browser console on the phone. A red error mentioning
`row-level security` means section 3.2's policies did not apply — re-run the SQL.

---

## 5. Deploy

### 5.1 Put the code on GitHub

If this is not a git repo yet:

```bash
git init
git add .
git commit -m "Tea Content Mansion — QR table ordering"
```

Confirm `.env.local` is **not** in that commit:

```bash
git status --short
```

You should not see `.env.local` listed. It is covered by the `*.local` line in
`.gitignore`. If it appears, stop and fix that before pushing — you would be
publishing your keys.

Create an empty repo on GitHub (private is fine), then:

```bash
git remote add origin https://github.com/yourname/tea-content-mansion.git
git branch -M main
git push -u origin main
```

### 5.2 Connect Cloudflare Pages

1. Go to dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Authorise GitHub and pick the repo.
3. Build settings:

   | Field | Value |
   | --- | --- |
   | Framework preset | `Vite` (or None) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | leave blank |

4. **Before clicking deploy**, expand **Environment variables** and add them all:

   ```
   VITE_SUPABASE_URL       = https://abcdefgh.supabase.co
   VITE_SUPABASE_ANON_KEY  = eyJhbGciOi...
   VITE_GST_PERCENT        = 5
   VITE_PASS_PIN           = 4821
   ```

   These are baked in at build time. **If you add them after the first deploy
   you must trigger a rebuild** — an existing build will not pick them up. This
   is the single most common cause of a deployed site showing "This device only".

5. **Save and Deploy.** It takes a minute or two.

You get a URL like `https://tea-content-mansion.pages.dev`.

### 5.3 No routing configuration needed

Both screens are query strings, not paths:

- Customer menu: `https://your-site.pages.dev/?table=4`
- Kitchen pass: `https://your-site.pages.dev/?view=admin`

So there is nothing to configure — no SPA rewrites, no redirects file. HTTPS is
automatic.

### 5.4 Netlify instead

**With Git:** same idea — build command `npm run build`, publish directory
`dist`, environment variables under Site settings → Environment variables, then
**Trigger deploy → Clear cache and deploy**.

**Without Git**, for a fast one-off demo:

```bash
npm run build
```

Then drag the `dist` folder onto app.netlify.com/drop. Note the catch: `dist` was
built from your local `.env.local`, so your keys and PIN are already compiled in.
That works, but every update means rebuilding and re-dragging, and there is no
version history. Fine for a demo tomorrow; use Git if the café says yes.

---

## 6. Lock down the pass

Right now anyone who guesses `?view=admin` and your PIN can change orders. Two
layers, and you want both.

### 6.1 The PIN (already done)

Set via `VITE_PASS_PIN`. Staff enter it once and the device is remembered.

**Be clear-eyed about what it is:** the PIN is compiled into the JavaScript, so
anyone who opens the browser's source can find it. It stops a curious customer
tapping around and closing everybody's bills. It is not real security.

Changing the PIN and redeploying logs out every device — that is the intended
way to revoke access when staff leave.

### 6.2 Host-level access control (do this before real service)

This is the layer that actually holds.

**Cloudflare Access** (free for up to 50 users):

1. In the Cloudflare dashboard: **Zero Trust** → **Access** → **Applications** →
   **Add an application** → **Self-hosted**.
2. Set the domain to your Pages site.
3. Add a policy: **Allow**, with an **Emails** rule listing the café's staff
   email addresses.
4. Staff get a one-time code by email the first time on each device.

Caveat: Cloudflare Access protects by *path*, and both of our screens live at
`/`. So protecting `/` would also lock out customers. To use Access properly,
serve the pass on its own hostname — e.g. `pass.yourdomain.com` pointed at the
same Pages project, with Access applied only to that hostname. Then give staff
`https://pass.yourdomain.com/?view=admin`.

**Simpler alternative:** deploy the pass as a second Pages project from the same
repo, and apply Netlify's password protection or Cloudflare Access to that whole
project. Slightly wasteful, entirely effective.

**For the demo meeting itself, the PIN alone is enough.** Just do not leave it
that way once real money is going through it.

### 6.3 Tighten the database before real service

`supabase/schema.sql` ships with **demo policies**: anyone with the anon key can
read, write, update and delete orders. That is what lets the pass work with no
login.

Before the café runs a real service, switch to the production policies at the
bottom of that file and add a staff login. The file explains both. This is the
one genuine security debt in the project, and it is documented rather than
hidden.

---

## 7. Test the deployed site properly

Do this on **mobile data, not the café or your home Wi-Fi** — it catches
mixed-content and CORS problems that localhost hides.

- [ ] `https://your-site.pages.dev/?table=1` loads, shows **Table 1**
- [ ] Padlock visible in the address bar
- [ ] Fonts render (Bodoni wordmark, monospace prices) — a blocked font network
      falls back, but check
- [ ] Search returns results; adding items works; the bill opens
- [ ] Placing an order shows the stamped chit
- [ ] **On the laptop**, `?view=admin` asks for the PIN
- [ ] After the PIN, the badge reads **Live**, green dot — not "This device only"
- [ ] **The phone's order is visible on the laptop within about a second**
- [ ] Tap **Start preparing** on the laptop → the phone's chit updates to
      "Being prepared" without reloading
- [ ] **Table codes** → the URL under each code is your real domain, not
      `localhost`
- [ ] Turn Airplane mode on, try to order → you get "Not sent", and the cart is
      still there
- [ ] Turn Airplane mode off, tap **Try again** → it goes through
- [ ] On the laptop: **Sold out** → search an item → **Mark sold out**. On the
      phone, that row goes dim with a struck price and no add button
- [ ] Add something on the phone, then mark *that* item sold out from the laptop.
      The phone's bill should name it and refuse to send until it is removed
- [ ] **Put back** on the laptop → it becomes orderable on the phone again
- [ ] If you set a GST rate: the bill, the chit and the ticket all show the same
      **Total to pay**

That eleventh item is the demo. If it fails, everything else is decoration.

---

## 8. Print codes for the demo

For a meeting you do not need lamination or acrylic stands. Four cards on plain
paper is enough to make it real.

1. On the laptop, open the pass → **Table codes**.
2. Set **Tables** to `4`.
3. **Check the URL printed under a code is your live domain.** Codes are
   generated from whatever URL you are viewing — generating them from
   `localhost:5173` produces four dead codes, which is a bad way to open a
   client meeting.
4. **Print**, on the heaviest paper your printer takes.
5. **Scan every card with your own phone** and confirm each opens the right table
   number.

Bring a couple of spares. Printers smudge.

For the real rollout — matte lamination, 3 cm minimum, table tents, two spares
per table — see [SETUP.md](SETUP.md) section 6.

---

## 9. Running the demo meeting

Ten minutes, in this order. The point is to let them discover it, not to narrate
features at them.

**Before you arrive**

- Confirm the Supabase project is not paused (section 3.4).
- Test one full order end to end on the actual devices you are bringing.
- Charge everything. Have a phone hotspot as backup if the café's Wi-Fi is bad.
- Clear out your test orders: pass → filter **Completed** → **Clear closed**, and
  set any leftovers to Completed first. An empty pass makes the first real order
  land with impact.

**The demo**

1. Put the laptop on the table showing the pass, screen toward them. Say nothing
   about it yet.
2. Put a printed QR card in front of the owner. **Ask them to scan it with their
   own phone** — not yours. Using their phone, their camera, their hands is what
   makes it land.
3. Let them browse. Do not guide. Watch where they hesitate — that is your real
   feedback, and it is worth more than anything they say afterwards.
4. Ask them to order a chai and something from the kitchen, and to type a note
   like "kam meetha".
5. **They tap Order now.** The laptop chimes and the chit drops onto the pass.
   That moment is the entire pitch. Let it sit.
6. Point at the ticket: table number, the note boxed in red, held time.
7. **You tap Start preparing.** Ask them to look at their phone — the status has
   already changed. Then **Mark served**.
8. **Ask them what runs out most often.** Whatever they say, search it in
   **Sold out** and mark it off. Then ask them to reload their menu — it is
   struck through and cannot be ordered. This is the feature every café owner
   asks about, and answering it before they ask lands well.
9. Show **Table codes**: "this is how every table gets one."
10. Now tell them what it does not do yet — see section 11. Say it before they
    find out. It buys more trust than any feature.

**Questions to ask them, not tell them**

- How many tables, including outside?
- Is the Wi-Fi usable at the far tables?
- Does anything sell out mid-service? (It will — and it is the first thing to
  build.)
- Who watches the screen during a rush?
- Do you want customers ordering, or waiters on a tablet?

---

## 10. What the free tiers actually give you

Approximate, at the time of writing — verify current limits yourself.

**Supabase free:** ~500 MB database, 2 GB egress/month, realtime included,
**pauses after ~1 week idle**, no automatic backups.

A café order is roughly 1 KB. Even at 300 orders a day, that is under 10 MB a
month. The database size is not your constraint; the idle pause and the lack of
backups are. Clearing completed orders daily (built into the pass) keeps it
small indefinitely.

**Cloudflare Pages free:** unlimited requests and bandwidth, 500 builds/month,
custom domains included.

**Realistic verdict:** the free tiers genuinely run a single café. What you would
be paying for on the next tier up is daily backups, no idle pause, and support —
all of which matter once it is load-bearing, none of which matter for a demo.

**If the café says yes**, budget roughly USD 25/month for Supabase Pro, and
optionally a domain at USD 10–15/year. Cloudflare Pages can stay free. Say this
number out loud in the meeting; a surprise bill later damages the relationship
more than the amount ever would.

---

## 11. Tell them these limits before they find them

Say this in the meeting. All of it is in [SETUP.md](SETUP.md) section 16, in
priority order.

1. **Customers cannot cancel or edit** after placing. Staff fix it on the pass.
2. **No kitchen printer.** Screen only.
3. **Multiple chits per table are not merged** — the counter totals them.
4. **No sales reports.** The data is in the database, so this is a screen to
   build, not a rearchitecture.
5. **Prices and new dishes need a redeploy** — there is no menu admin UI.
   Sold-out is live; repricing is not. Fine for quarterly revisions, painful if
   they reprice weekly.
6. **Wi-Fi down means no new orders.** They need the paper fallback agreed in
   advance.
7. **The pass PIN is a speed bump, not security** (section 6).
8. **The GST total is not a tax invoice.** No CGST/SGST split. **The till remains
   the billing system of record.**

Two things that *are* now built, and worth demonstrating because every café owner
asks about them:

- **Sold out.** Header button on the pass. Mark paneer off and it stops being
  orderable on every phone in the room, immediately — and if it was already in
  someone's cart, their bill says so and blocks the order until they remove it.
- **GST.** Set `VITE_GST_PERCENT` and the bill, the chit and the ticket all show
  a GST line and a total to pay. Leave it blank and it behaves like the printed
  card. The rate is recorded on each order, so changing it later cannot rewrite
  old bills.

Being first to name these is the difference between "he knows what he built" and
"he sold me something half-finished".

---

## 12. What to hand over

If they say yes:

- The live URL, and the pass URL with its PIN, given separately.
- [SETUP.md](SETUP.md) — the operational guide: kitchen device setup, staff
  training, the go-live checklist, daily routine, troubleshooting.
- [README.md](README.md) — how the code is put together, for whoever maintains
  it.
- Ownership of the accounts. **Create the Supabase and Cloudflare projects under
  the café's own email**, or transfer them. Do not leave a business dependent on
  a vendor's personal accounts — it is the most common and most avoidable source
  of trouble later.
- The GitHub repo, transferred or with them added.
- Print-ready QR cards for every table, plus spares.

Agree in writing who fixes things and how fast, and what happens when they want
a menu change. "I'll sort it out" becomes a 2 a.m. phone call.

---

## 13. If something is wrong

| Symptom | Cause | Fix |
| --- | --- | --- |
| Pass says "This device only" | env vars missing, or added after the build | Add all three, then **trigger a fresh deploy** |
| Orders don't cross devices | Same as above | Check the badge first, always |
| Console: `new row violates row-level security` | Schema policies not applied | Re-run `supabase/schema.sql` |
| Everything worked, now nothing loads | Supabase project paused after idling | Dashboard → **Restore** (section 3.4). `npm run check` names this as a cause |
| Not sure whether the config is right | — | `npm run check` — verifies the URL, key, tables and columns |
| QR codes open `localhost` | Generated from the dev server | Regenerate from the live URL |
| Pass never asks for a PIN | `VITE_PASS_PIN` unset in the host | Add it, rebuild |
| No sound on new orders | Bell not switched on — browsers block audio until a tap | Tap **Turn on the bell**; needed after every reload |
| Build fails on the host | Node version, or a missing dependency | Check the build log; set Node 18+ in host settings |
| Fonts look wrong | Google Fonts blocked | Cosmetic; the fallback stack holds |

---

## 14. Do this in order

1. Supabase project + run `supabase/schema.sql` — section 3
2. `npm run setup`, restart the dev server, **verify phone → laptop locally** —
   section 4
3. Push to GitHub — section 5.1
4. Cloudflare Pages with all three env vars — section 5.2
5. Test the deployed site from mobile data, two devices — section 7
6. Print four QR cards from the **live** URL — section 8
7. Clear test orders, check Supabase is awake, run the meeting — section 9

Step 2 is the one not to skip. If phone → laptop works locally, deployment is
mechanics. If it does not, no amount of hosting will fix it.
