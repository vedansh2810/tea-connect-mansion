# Tea Connect Mansion â€” Complete Project Context

> **Project**: Tea Connect Mansion (TCM)  
> **Type**: QR-code table ordering system & live kitchen pass  
> **Description**: Zero-friction digital menu for a 24x7 vegetarian cafe. Customers scan a QR code at their table to browse the menu and place orders; kitchen staff manage orders on a live real-time dashboard.

---

## 1. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend Framework** | React | 19.0.0 |
| **Build Tool** | Vite | 6.0.0 |
| **CSS Framework** | Tailwind CSS v4 | 4.0.0 |
| **Icons** | lucide-react | 0.475.0 |
| **QR Code Generation** | qrcode | 1.5.4 |
| **Backend / Database** | Supabase (PostgreSQL + Realtime + Auth) | supabase-js 2.112.3 |
| **Testing** | Vitest + Testing Library (React + User Event + jest-dom) | vitest 4.1.11 |
| **Language** | JavaScript (ES Modules) | â€” |
| **Hosting** | Static SPA (Cloudflare Pages / Netlify / Vercel) | â€” |

---

## 2. Project Structure

```
fl/
+-- index.html                          # SPA entry point (fonts, viewport, #root)
+-- vite.config.js                      # Vite config (React plugin, Tailwind plugin, Vitest, port 5173)
+-- package.json                        # Dependencies & scripts
+-- .env.example                        # Environment variable template (with security docs)
+-- .env.local                          # Local env overrides (gitignored)
+-- README.md                           # Project documentation
+-- SETUP.md                            # Setup guide
+-- DEPLOY.md                           # Deployment guide
+-- tea connent mansion menu.pdf        # Physical menu card reference
|
+-- supabase/
|   +-- schema.sql                      # Complete database schema (tables, RLS, triggers, indexes)
|
+-- scripts/
|   +-- setup-supabase.mjs              # Interactive CLI for Supabase project setup
|   +-- seed-menu.mjs                   # Seeds menu data into Supabase tables
|
+-- src/
    +-- main.jsx                        # React DOM mount point
    +-- App.jsx                         # Root router, context provider tree, session management
    +-- index.css                       # Global styles, Tailwind v4 theme, design tokens, animations
    +-- test-setup.js                   # Vitest setup (imports @testing-library/jest-dom/vitest)
    |
    +-- __tests__/
    |   +-- App.routing.test.jsx        # Integration tests for URL routing & view rendering
    |   +-- SessionLifecycle.test.jsx   # Integration tests for idle timeout, background grace, table clearing
    |
    +-- data/
    |   +-- menu.js                     # Static menu source of truth (7 sections, 42 groups, 257 items)
    |
    +-- lib/
    |   +-- format.js                   # Currency, time, elapsed duration, line description formatters
    |   +-- tableToken.js               # Signed table token encoding/decoding for QR URLs
    |   +-- tax.js                      # GST calculation & display utilities
    |   +-- useChime.js                 # Web Audio API synthesized notification sounds
    |   +-- useRoute.js                 # Query-string router (customer <-> admin view switching)
    |   +-- __tests__/
    |       +-- tableToken.test.js      # Unit tests for token encode/decode & tamper detection
    |       +-- useRoute.test.js        # Unit tests for routing hook & URL parsing
    |
    +-- store/
    |   +-- backend.js                  # Dual-adapter data layer (Supabase cloud <-> localStorage local)
    |   +-- OrdersContext.jsx           # Order lifecycle state & operations
    |   +-- CartContext.jsx             # Shopping cart state (per-table, sessionStorage)
    |   +-- MenuContext.jsx             # Menu data provider (cloud CMS <-> static fallback)
    |   +-- AvailabilityContext.jsx     # Real-time sold-out item tracking
    |   +-- WaiterCallContext.jsx       # Customer waiter-call request system
    |
    +-- components/
        +-- chit/
        |   +-- ChitPaper.jsx           # Torn bill slip visual container (ChitPaper, ChitLine, ChitRule)
        |
        +-- ornament/
        |   +-- Ornaments.jsx           # Decorative SVG elements (CrownRule, DotTriad, OrnateFrame, etc.)
        |
        +-- customer/
        |   +-- TableGate.jsx           # QR scan prompt (landing screen, no table param)
        |   +-- CustomerMenu.jsx        # Main customer menu view (search, sections, cart bar, waiter call)
        |   +-- SectionBlock.jsx        # Menu section renderer (groups -> items)
        |   +-- ItemRow.jsx             # Individual menu item (pricing tiers, choices, sold-out badge)
        |   +-- CartSheet.jsx           # Cart modal (order draft, customer info, GST, submit)
        |   +-- OrderPlaced.jsx         # Order confirmation & live status tracker
        |   +-- SessionEnded.jsx        # Session termination screen (cleared / timeout)
        |   +-- __tests__/
        |       +-- SessionEnded.test.jsx # Unit tests for session ended screen
        |
        +-- admin/
            +-- PassGate.jsx            # Auth gate: Supabase Auth (cloud) or PIN fallback (local)
            +-- AdminDashboard.jsx      # Kitchen pass dashboard (order rail, KPIs, chimes, modals)
            +-- OrderTicket.jsx         # Individual kitchen order ticket (edit, void, advance status)
            +-- CombinedBill.jsx        # Consolidated table bill (aggregate completed orders)
            +-- WaiterCallBar.jsx       # Waiter call notification strip
            +-- SoldOut.jsx             # Sold-out item management modal
            +-- MenuManager.jsx         # Menu CMS (edit names, prices, chef specials, CRUD items)
            +-- Analytics.jsx           # Business intelligence dashboard (revenue, top items, charts)
            +-- TableCodes.jsx          # QR code generator & print layout
```

---

## 3. Environment Variables

| Variable | Purpose | Required | Example |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project REST API URL | No (falls back to local mode) | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable anon key | No (falls back to local mode) | `eyJhbGciOi...` |
| `VITE_GST_PERCENT` | GST tax rate for bills | No (shows "GST extra" note) | `5` |
| `VITE_PASS_PIN` | Kitchen pass PIN code (3-12 chars, local mode only) | No (pass is open) | `1234` |
| `VITE_TABLE_SECRET` | Secret for signing QR table tokens | No (uses default key) | `my-random-secret` |

---

## 4. Routing

Routing is **query-string based** via the custom `useRoute()` hook â€” no client-side router library.

| URL Pattern | View | Description |
|---|---|---|
| `/?t=<signed-token>` | Customer Menu | Active ordering session for a verified table |
| `/` (no params) | Table Gate | QR scan prompt landing page |
| `/?view=admin` or `/admin` | Kitchen Pass | Admin dashboard (behind auth gate) |
| Any URL with `?demo` | Demo Mode | Enables quick table/view switching shortcuts |

### Route Resolution Logic (`useRoute.js`)
1. Parse `window.location.href` search params
2. `view`: `'admin'` if path ends with `/admin` or has `?view=admin`; else `'menu'`
3. `table`: Decoded from signed token `?t=<token>` via `decodeTable()`
4. `demo`: Present if `?demo` param exists or `import.meta.env.DEV` is true
5. `navigate(next)`: Uses `history.pushState` with re-encoded signed token

### Table Token Signing (`tableToken.js`)
- Encodes table number with dual hash (FNV-1a + djb2) keyed by `VITE_TABLE_SECRET`
- Produces URL-safe Base64 token: `base64url(table + '.' + hash)`
- Prevents casual table number spoofing in QR URLs
- Validates table format: `/^[A-Za-z0-9-]{1,6}$/`

---

## 5. Application Shell & View Router (`App.jsx`)

### Constants

| Constant | Value | Description |
|---|---|---|
| `IDLE_MS` | `30 * 60 * 1000` (30 min) | Customer inactivity timeout |
| `BACKGROUND_GRACE_MS` | `2 * 60 * 1000` (2 min) | Tab-hidden grace before dropping Realtime |

### Context Provider Tree

```
+- Admin Path -------------------------------------------------------------+
| PassGate -> MenuProvider -> OrdersProvider -> AvailabilityProvider        |
|          -> WaiterCallProvider -> AdminDashboard                          |
+--------------------------------------------------------------------------+

+- Customer Path -----------------------------------------------------------+
| MenuProvider -> OrdersProvider(table) -> AvailabilityProvider             |
|              -> WaiterCallProvider -> CartProvider(table)                 |
|              -> SessionWatcher + CustomerMenu                            |
+--------------------------------------------------------------------------+
```

### Internal Components

- **`SessionWatcher({ onExpire })`**: Monitors `useOrders()` â€” when `hadOrders` ref is true and orders drop to 0 (table cleared by staff), fires `onExpire('cleared')`. Returns `null`.

### View Rendering Decision

```
if view === 'admin'       -> PassGate -> AdminDashboard
if table && expired       -> SessionEnded
if !table                 -> TableGate
else (active session)     -> CustomerMenu
```

### Session Lifecycle
- **Idle Timeout**: 30-minute inactivity timer (tracks `touchstart`, `mousedown`, `scroll`, `keydown`)
- **Background Grace**: 2-minute grace period when tab is hidden (`visibilitychange`); disconnects Supabase Realtime after grace expires
- **Pagehide**: Immediately calls `backend.disconnect()` on `pagehide`/`beforeunload`
- **Table Cleared**: `SessionWatcher` monitors orders; when staff clears/pays the table and order count drops to 0, triggers `expired='cleared'`

---

## 6. Database Schema (Supabase / PostgreSQL)

### 6.1 Tables

#### `orders`
| Column | Type | Constraints | Default | Notes |
|---|---|---|---|---|
| `id` | `text` | `PRIMARY KEY` | Set by trigger | Format: `TCM-0001`, `TCM-0002`, ... |
| `seq` | `integer` | `NOT NULL` | `nextval('orders_seq')` | Monotonic ordering sequence |
| `table_label` | `text` | `NOT NULL` | â€” | Table identifier (e.g. `4`, `T2`) |
| `lines` | `jsonb` | `NOT NULL` | â€” | Array of cart items `[{name, tier, choice, addOn, qty, price}]` |
| `note` | `text` | `NOT NULL` | `''` | Kitchen notes / special requests |
| `subtotal` | `integer` | `NOT NULL` | â€” | Sum before GST (INR) |
| `status` | `text` | `NOT NULL`, `CHECK IN ('pending','preparing','served','completed')` | `'pending'` | Order workflow state |
| `placed_at` | `timestamptz` | `NOT NULL` | `now()` | Order creation timestamp |
| `history` | `jsonb` | `NOT NULL` | `'[]'` | State transition log `[{status, at}]` |
| `tax_percent` | `numeric(5,2)` | `NOT NULL` | `0` | GST rate locked at placement |
| `tax_amount` | `integer` | `NOT NULL` | `0` | Calculated GST (INR) |
| `total` | `integer` | Nullable | `NULL` | Grand total `subtotal + tax_amount` |
| `customer_name` | `text` | `NOT NULL` | `''` | Customer name |
| `customer_phone` | `text` | `NOT NULL` | `''` | Customer phone |
| `archived` | `boolean` | `NOT NULL` | `false` | Soft-delete flag for pass clearance |

#### `unavailable_items`
| Column | Type | Constraints | Default |
|---|---|---|---|
| `item_id` | `text` | `PRIMARY KEY` | â€” |
| `since` | `timestamptz` | `NOT NULL` | `now()` |

#### `menu_sections`
| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `text` | `PRIMARY KEY` | â€” |
| `name` | `text` | `NOT NULL` | â€” |
| `kicker` | `text` | Nullable | `NULL` |
| `note` | `text` | Nullable | `NULL` |
| `sort_order` | `integer` | `NOT NULL` | `0` |

#### `menu_groups`
| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `text` | `PRIMARY KEY` | â€” |
| `section_id` | `text` | `NOT NULL`, `FK -> menu_sections(id) ON DELETE CASCADE` | â€” |
| `name` | `text` | `NOT NULL` | â€” |
| `tiers` | `jsonb` | Nullable | `NULL` |
| `add_on` | `jsonb` | Nullable | `NULL` |
| `footnote` | `text` | Nullable | `NULL` |
| `sort_order` | `integer` | `NOT NULL` | `0` |

#### `menu_items`
| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `text` | `PRIMARY KEY` | â€” |
| `group_id` | `text` | `NOT NULL`, `FK -> menu_groups(id) ON DELETE CASCADE` | â€” |
| `name` | `text` | `NOT NULL` | â€” |
| `price` | `integer` | Nullable | `NULL` |
| `prices` | `jsonb` | Nullable | `NULL` |
| `note` | `text` | Nullable | `NULL` |
| `choices` | `jsonb` | Nullable | `NULL` |
| `chef` | `boolean` | `NOT NULL` | `false` |
| `is_available` | `boolean` | `NOT NULL` | `true` |
| `sort_order` | `integer` | `NOT NULL` | `0` |

#### `waiter_calls`
| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `serial` | `PRIMARY KEY` | Auto-increment |
| `table_label` | `text` | `NOT NULL` | â€” |
| `status` | `text` | `NOT NULL`, `CHECK IN ('pending','acknowledged','dismissed')` | `'pending'` |
| `created_at` | `timestamptz` | `NOT NULL` | `now()` |

#### `order_audit_log`
| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `serial` | `PRIMARY KEY` | Auto-increment |
| `order_id` | `text` | `NOT NULL` | â€” |
| `action` | `text` | `NOT NULL` | â€” |
| `detail` | `jsonb` | `NOT NULL` | `'{}'` |
| `created_at` | `timestamptz` | `NOT NULL` | `now()` |

#### `security_log`
| Column | Type | Constraints | Default |
|---|---|---|---|
| `id` | `serial` | `PRIMARY KEY` | Auto-increment |
| `event` | `text` | `NOT NULL`, `CHECK IN ('sign_in_success','sign_in_failure','sign_out','rate_limited')` | â€” |
| `email` | `text` | `NOT NULL` | â€” |
| `ip` | `text` | `NOT NULL` | â€” |
| `user_agent` | `text` | `NOT NULL` | â€” |
| `detail` | `jsonb` | `NOT NULL` | `'{}'` |
| `created_at` | `timestamptz` | `NOT NULL` | `now()` |

### 6.2 Sequences, Functions & Triggers

- **Sequence**: `orders_seq` â€” monotonic order counter
- **Function**: `set_order_id()` â€” sets `NEW.id := 'TCM-' || lpad(NEW.seq::text, 4, '0')`
- **Trigger**: `orders_set_id` â€” `BEFORE INSERT ON orders FOR EACH ROW EXECUTE FUNCTION set_order_id()`

### 6.3 Indexes

| Index Name | Table | Columns | Purpose |
|---|---|---|---|
| `orders_status_placed_idx` | `orders` | `(status, placed_at DESC)` | Kitchen pass filtering & sorting |
| `audit_order_idx` | `order_audit_log` | `(order_id)` | Audit log lookup |
| `security_log_created_idx` | `security_log` | `(created_at DESC)` | Security log recency queries |

### 6.4 Foreign Key Relationships

```
menu_sections --1:N--> menu_groups (section_id -> id, CASCADE)
menu_groups   --1:N--> menu_items  (group_id   -> id, CASCADE)
```

### 6.5 Realtime Publication

Tables added to `supabase_realtime` publication:
`orders`, `unavailable_items`, `menu_sections`, `menu_groups`, `menu_items`, `waiter_calls`

### 6.6 Row Level Security (RLS)

All tables have RLS enabled. Cloud mode uses **role-based policies** distinguishing `anon` (customer) from `authenticated` (staff) access. Local mode uses permissive demo policies.

| Table | anon | authenticated |
|---|---|---|
| `orders` | INSERT, SELECT | INSERT, SELECT, UPDATE, DELETE |
| `unavailable_items` | SELECT | SELECT, INSERT, DELETE |
| `menu_sections` | SELECT | SELECT, ALL |
| `menu_groups` | SELECT | SELECT, ALL |
| `menu_items` | SELECT | SELECT, ALL |
| `waiter_calls` | INSERT, SELECT | INSERT, SELECT, UPDATE, DELETE |
| `order_audit_log` | SELECT, INSERT | SELECT, INSERT |
| `security_log` | INSERT | INSERT, SELECT |

---

## 7. Backend Data Layer (`store/backend.js`)

### 7.1 Dual-Adapter Architecture

```
+----------------------------------------------------------+
|                    backend (exported)                     |
|          Unified async interface for all data ops        |
+------------------------+---------------------------------+
|    cloudBackend        |        localBackend             |
|  (Supabase Postgres    |  (localStorage +               |
|   + Realtime WS        |   BroadcastChannel +           |
|   + Auth)              |   StorageEvent)                |
+------------------------+---------------------------------+
|  Selection: isCloudConfigured ? cloudBackend : localBackend |
+----------------------------------------------------------+
```

- **`isCloudConfigured`**: `true` when both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- **Cloud mode**: Multi-device real-time ordering (phone <-> kitchen tablet) with Supabase Auth
- **Local mode**: Single-device offline demo; cross-tab sync via `BroadcastChannel` + `window.onstorage`
- **Data integrity**: Realtime events are treated as invalidation signals â€” the store re-reads full state rather than trusting event payloads

### 7.2 Supabase Client Configuration

```js
createClient(URL, ANON_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 5 } }
})
```

Lazy singleton initialized via dynamic `import('@supabase/supabase-js')` (zero bundle overhead in local mode).

### 7.3 Complete API Call Map

#### Table: `orders`

| Method | Operation | Supabase Query |
|---|---|---|
| `list()` | SELECT | `.from('orders').select('*').or('archived.is.null,archived.eq.false').order('placed_at', {ascending: false}).limit(500)` |
| `listForTable(table)` | SELECT | `.from('orders').select('*').eq('table_label', table).or('archived.is.null,archived.eq.false').order('placed_at', {ascending: false}).limit(100)` |
| `place(draft)` | INSERT | `.from('orders').insert({table_label, lines, note, subtotal, tax_percent, tax_amount, total, customer_name, customer_phone}).select().single()` |
| `update(id, patch)` | UPDATE | `.from('orders').update({status, history}).eq('id', id)` |
| `updateOrderLines(id, lines, subtotal, taxAmount, total)` | UPDATE | `.from('orders').update({lines, subtotal, tax_amount, total}).eq('id', id)` |
| `removeCompleted()` | UPDATE | `.from('orders').update({archived: true}).eq('status', 'completed')` |
| `removeOrdersByIds(ids)` | UPDATE | `.from('orders').update({archived: true}).in('id', ids)` |
| `removeAll()` | DELETE | `.from('orders').delete().neq('id', '')` |
| `queryAnalytics(from, to)` | SELECT | `.from('orders').select('*').gte('placed_at', from).lte('placed_at', to).order('placed_at', {ascending: false}).limit(5000)` |
| `clearAnalytics()` | DELETE | `.from('orders').delete().eq('archived', true)` + `.delete().eq('status', 'completed')` |

#### Table: `order_audit_log`

| Method | Operation | Supabase Query |
|---|---|---|
| `logAudit(orderId, action, detail)` | INSERT | `.from('order_audit_log').insert({order_id, action, detail})` |
| `listAudit(orderId)` | SELECT | `.from('order_audit_log').select('*').eq('order_id', orderId).order('created_at', {ascending: true})` |

#### Table: `unavailable_items`

| Method | Operation | Supabase Query |
|---|---|---|
| `listUnavailable()` | SELECT | `.from('unavailable_items').select('item_id')` |
| `setUnavailable(id, bool)` | UPSERT / DELETE | `bool ? .upsert({item_id}) : .delete().eq('item_id', id)` |
| `clearUnavailable()` | DELETE | `.from('unavailable_items').delete().neq('item_id', '')` |

#### Table: `waiter_calls`

| Method | Operation | Supabase Query |
|---|---|---|
| `placeWaiterCall(table)` | INSERT | `.from('waiter_calls').insert({table_label}).select().single()` |
| `listWaiterCalls()` | SELECT | `.from('waiter_calls').select('*').eq('status', 'pending').order('created_at', {ascending: false})` |
| `updateWaiterCall(id, status)` | UPDATE | `.from('waiter_calls').update({status}).eq('id', id)` |

#### Tables: `menu_sections`, `menu_groups`, `menu_items`

| Method | Operation | Supabase Query |
|---|---|---|
| `listMenu()` | SELECT (x3) | Parallel: `.from('menu_sections').select('*').order('sort_order')` + `menu_groups` + `menu_items` -> assembled into tree |
| `updateMenuItem(id, patch)` | UPDATE | `.from('menu_items').update(patch).eq('id', id)` |
| `createMenuItem(item)` | INSERT | `.from('menu_items').insert(item)` |
| `deleteMenuItem(id)` | DELETE | `.from('menu_items').delete().eq('id', id)` |
| `updateMenuGroup(id, patch)` | UPDATE | `.from('menu_groups').update(patch).eq('id', id)` |
| `createMenuGroup(group)` | INSERT | `.from('menu_groups').insert(group)` |
| `deleteMenuGroup(id)` | DELETE | `.from('menu_groups').delete().eq('id', id)` |
| `updateMenuSection(id, patch)` | UPDATE | `.from('menu_sections').update(patch).eq('id', id)` |
| `createMenuSection(section)` | INSERT | `.from('menu_sections').insert(section)` |
| `deleteMenuSection(id)` | DELETE | `.from('menu_sections').delete().eq('id', id)` |

#### Authentication & Security (cloud only)

| Method | Operation | Description |
|---|---|---|
| `signIn(email, password)` | Auth | Supabase email/password sign-in |
| `signOut()` | Auth | Supabase sign-out |
| `getUser()` | Auth | Returns current authenticated user or `null` |
| `onAuthStateChange(callback)` | Auth | Listener for auth state changes; returns unsubscribe function |
| `logSecurity(event, detail)` | INSERT | Logs to `security_log` table (`sign_in_success`, `sign_in_failure`, `sign_out`, `rate_limited`) |

### 7.4 Realtime Subscriptions

| Channel Name | Table | Filter | Used By |
|---|---|---|---|
| `'orders-feed'` | `orders` | â€” | `OrdersContext` (admin) |
| `'orders-table-${t}'` | `orders` | `table_label=eq.${t}` | `OrdersContext` (customer) |
| `'availability-feed'` | `unavailable_items` | â€” | `AvailabilityContext` |
| `'waiter-calls-feed'` | `waiter_calls` | â€” | `WaiterCallContext` |
| `'menu-feed-0'` | `menu_sections` | â€” | `MenuContext` |
| `'menu-feed-1'` | `menu_groups` | â€” | `MenuContext` |
| `'menu-feed-2'` | `menu_items` | â€” | `MenuContext` |

### 7.5 Row Normalization (`fromRow`)

Converts Supabase snake_case columns to frontend camelCase:

```
id -> id                    table_label -> table
seq -> seq                  lines -> lines
note -> note                subtotal -> subtotal
status -> status            placed_at -> placedAt
history -> history          tax_percent -> taxPercent
tax_amount -> taxAmount     total -> total
customer_name -> customerName
customer_phone -> customerPhone
```

### 7.6 Analytics Aggregation (`buildAnalyticsFromOrders`)

Computed from raw order records:
- **Revenue**: Sum of all order totals
- **Order count**: Total orders in range
- **Average order value**: Revenue / count
- **Top 15 items**: Ranked by volume and revenue
- **Hourly distribution**: 24-bucket array by `placed_at` hour
- **Table rankings**: Revenue and order count per table
- **Status breakdown**: Count per status (`pending`, `preparing`, `served`, `completed`)

---

## 8. State Management (React Contexts)

### 8.1 `OrdersContext.jsx`

**Scope**: Global (admin) or per-table (customer)

| Export | Type | Description |
|---|---|---|
| `STATUSES` | `string[]` | `['pending', 'preparing', 'served', 'completed']` |
| `STATUS_META` | `object` | Maps each status to `{ label, next, action }` |
| `OrdersProvider` | Component | Props: `table` (optional), `children` |
| `useOrders()` | Hook | Full orders context |
| `useTableOrders(table)` | Hook | Filtered orders for one table |

**Context Return Value**:
- `orders` â€” Array of Order objects
- `placeOrder(draft)` â€” insert new order, prepend to local state
- `setStatus(orderId, next)` â€” optimistic status transition + timestamped history entry
- `advance(orderId)` â€” step to next status per `STATUS_META`
- `editOrderLines(orderId, newLines, reason)` â€” recalculate totals, write audit log
- `voidItem(orderId, lineKey, reason)` â€” remove line, mark completed if last item, audit log
- `clearCompleted()` â€” archive completed orders
- `markTablePaid(tableNumber)` â€” archive all completed orders for a table
- `resetAll()` â€” wipe all active orders
- `refresh()` â€” re-fetch orders from backend
- `mode` â€” `'cloud' | 'local'`
- `connection` â€” `'connecting' | 'ready' | 'error'`
- `error` / `dismissError()` â€” error state management

**Internal Helper**: `humanError(cause)` â€” converts technical errors into kitchen-friendly messages (network, RLS/permissions, timeouts).

**Patterns**: Optimistic UI with rollback on failure; realtime events trigger full re-read; reconnects on `visibilitychange` and `online` events.

### 8.2 `CartContext.jsx`

**Scope**: Per-table, persisted in `sessionStorage` (`tcm.cart.<table>`)

| Export | Type | Description |
|---|---|---|
| `CartProvider` | Component | Props: `table`, `children` |
| `useCart()` | Hook | Cart state and actions |

**Line Key Format**: `${itemId}|${tierIndex}|${choice ?? '-'}|${addOn ? 'addon' : '-'}`

**Reducer Actions**:
- `hydrate` â€” load from sessionStorage
- `add` â€” append line or increment existing
- `setQty` â€” update quantity (remove if <= 0)
- `toggleAddOn` â€” toggle add-on, recalculate key/price, merge on collision
- `remove` â€” remove line by key
- `clear` â€” empty cart

**Context Return Value**:
- `lines` â€” Array of cart line items
- `add({ itemId, tierIndex?, choice?, addOn? })` â€” add item variant
- `setQty(key, qty)` â€” update quantity
- `remove(key)` â€” remove line
- `toggleAddOn(key)` â€” toggle add-on on/off
- `clear()` â€” clear all lines
- `count` â€” total quantity
- `subtotal` â€” total amount
- `qtyOfItem(itemId)` â€” count of specific item across all variants

**Helpers**:
- `lineKey(item)` â€” composite unique key
- `priceOf(item, tierIndex, addOn)` â€” unit price calculation

### 8.3 `MenuContext.jsx`

**Scope**: Global

| Export | Type | Description |
|---|---|---|
| `MenuProvider` | Component | Props: `children` |
| `useMenu()` | Hook | Menu state, item index, mutation methods |

**Behavior**:
- Cloud mode: Loads from Supabase via `backend.listMenu()` + realtime subscription sync
- Local/fallback: Uses static `MENU` / `ITEM_INDEX` from `src/data/menu.js`
- Internal `buildIndex(menu)` flattens hierarchy with inherited section/group metadata

**Context Return Value**:
- `menu` â€” Full hierarchical menu
- `itemIndex` â€” Flattened items with section/group metadata
- `totalItems` â€” Item count
- `chefSpecials` â€” Filtered list where `chef: true`
- `findItem(itemId)` â€” Lookup by item ID
- `loading` â€” Initial load state
- `refresh()` â€” Refetch menu
- `isCloud` â€” Whether cloud database is configured
- **CMS Mutations** (cloud only):
  - `updateItem(id, patch)` â€” optimistic + `backend.updateMenuItem`
  - `createItem(item)` â€” `backend.createMenuItem` + refresh
  - `deleteItem(id)` â€” optimistic removal + `backend.deleteMenuItem`
  - `updateGroup(id, patch)` â€” optimistic + `backend.updateMenuGroup`
  - `updateSection(id, patch)` â€” optimistic + `backend.updateMenuSection`

### 8.4 `AvailabilityContext.jsx`

**Scope**: Global

| Export | Type | Description |
|---|---|---|
| `AvailabilityProvider` | Component | Props: `children` |
| `useAvailability()` | Hook | `{ unavailable, isSoldOut, toggle, restoreAll, count, error }` |

**State**: ES6 `Set<string>` of unavailable item IDs â€” O(1) lookup via `isSoldOut(itemId)`

**Operations**:
- `toggle(itemId)` â€” optimistic add/remove + `backend.setUnavailable`
- `restoreAll()` â€” optimistic clear + `backend.clearUnavailable`

### 8.5 `WaiterCallContext.jsx`

**Scope**: Global

| Export | Type | Description |
|---|---|---|
| `WaiterCallProvider` | Component | Props: `children` |
| `useWaiterCalls()` | Hook | `{ calls, placeCall, acknowledge, dismiss, count, error, refresh }` |

**Operations**:
- `placeCall(table)` â€” `backend.placeWaiterCall` + update local list
- `acknowledge(callId)` â€” optimistic filter + `backend.updateWaiterCall(id, 'acknowledged')`
- `dismiss(callId)` â€” optimistic filter + `backend.updateWaiterCall(id, 'dismissed')`

---

## 9. Component Map

### 9.1 Customer Domain

#### `TableGate.jsx`
- **When**: No `table` param in URL
- **Purpose**: QR scan prompt landing page
- **Props**: `onTable(tableNumber)`, `demo`, `onOpenPass()`
- **Features**: Restaurant branding, QR scanner button (Android ZXing intent), demo table shortcuts (2, 4, 7, 11)

#### `CustomerMenu.jsx`
- **When**: Active customer session (table verified)
- **Purpose**: Primary menu browsing, search, ordering, and waiter calling
- **Props**: `table`, `demo`, `onChangeTable()`, `onOpenPass()`
- **Contexts**: `useCart`, `useOrders`, `useMenu`, `useWaiterCalls`, `useTableOrders`
- **Constants**: `WAITER_COOLDOWN = 30_000` (30-second cooldown)
- **Features**:
  - Category tab pills + text search with `filterMenu()` pure function
  - Open order display ("Already with the kitchen")
  - Floating "Call waiter" button with 30-second cooldown
  - Floating cart bar (item count + subtotal)
  - Embedded `CartSheet` modal
  - `OrderPlaced` full-screen on successful submission

#### `SectionBlock.jsx`
- **Purpose**: Renders a menu section with nested `GroupBlock` -> `ItemRow`
- **Props**: `section`, `query`
- **Pure**: Stateless presentational component with anchor ID (`section-${section.id}`, `scroll-mt-32`)

#### `ItemRow.jsx`
- **Purpose**: Individual menu item with 3 pricing modes
- **Props**: `item`, `group`, `highlight`
- **Contexts**: `useCart`, `useAvailability`
- **Modes**:
  1. **Plain**: Single price + quantity stepper
  2. **Tiered**: Multi-tier chip buttons (e.g., Single / Pot for 2 / Pot for 4)
  3. **Choice**: Accordion for required selection (e.g., Dry / Gravy)
- **Sold-out handling**: Disabled interaction, badge overlay, struck-through prices

#### `CartSheet.jsx`
- **Purpose**: Slide-up cart modal with order submission
- **Props**: `open`, `onClose()`, `table`, `onPlace(payload)`
- **Contexts**: `useCart`, `useAvailability`, `useMenu`
- **Constants**: `NOTE_LIMIT = 200`
- **Form fields**: Customer name (required), phone (10-digit Indian mobile validation `^[6-9]\d{9}$`), kitchen notes (200 char max)
- **Features**: Line item steppers, add-on toggles, sold-out alert banner, GST breakdown, body scroll lock, resilient error handling with retry

#### `OrderPlaced.jsx`
- **Purpose**: Order confirmation with live status tracking
- **Props**: `orderId`, `table`, `onOrderMore()`
- **Context**: `useOrders` (reactive â€” watches real-time status transitions)
- **Status progress**: 4-segment bar (`pending` -> `preparing` -> `served` -> `completed`)
- **Features**: Tilted "SENT TO KITCHEN" stamp, itemized receipt, "Order something else" button

#### `SessionEnded.jsx`
- **Purpose**: Terminal screen when session concludes
- **Props**: `reason` (`'cleared'` | `'timeout'`, default `'cleared'`), `onRescan()`
- **Messages**: Reason-specific text for `'cleared'` (bill settled) and `'timeout'` (inactivity); unknown reasons default to cleared message

### 9.2 Admin / Kitchen Pass Domain

#### `PassGate.jsx`
- **Purpose**: Authentication gate for kitchen pass access
- **Exports**: `default PassGate`, `usePassAuth()` hook, `isPassProtected()` utility
- **Dual-mode authentication**:
  - **Cloud mode (`CloudGate`)**: Supabase email/password authentication, unlocks `authenticated` RLS role
    - **Brute-force lockout**: 5 consecutive failed attempts -> 60-second lockout with live countdown
    - **Security logging**: All auth events logged to `security_log` via `backend.logSecurity`
  - **Local mode (`PinGate`)**: `VITE_PASS_PIN` checked against `localStorage('tcm.pass.unlocked')`
- **`isPassProtected()`**: Returns `true` when `isCloudConfigured || Boolean(VITE_PASS_PIN)`
- **`usePassAuth()`**: Returns `{ user, signOut }` from the auth context

#### `AdminDashboard.jsx`
- **Purpose**: Central kitchen pass controller
- **Props**: `onOpenMenu()`
- **Contexts**: `useOrders`, `useChime`, `useAvailability`, `useWaiterCalls`
- **Constants**: `FILTERS` â€” array of filter definitions (`live`, `pending`, `preparing`, `served`, `completed`, `all`)
- **Internal Components**: `ConnectionBadge({ mode, connection, onRetry })`
- **Features**:
  - Dark theme (sets `document.body.style.backgroundColor` to `--color-ink-rail`)
  - Connection badge (Live / This device only / Offline)
  - Chime arm/mute toggle
  - KPI bar: Pending, Preparing, Served counts + Open revenue
  - Status filter tabs
  - Order ticket rail grid (sorted oldest-first in `'live'` filter)
  - Combined table bills for completed orders
  - New order detection -> Web Audio chime + flash animation (900ms `freshIds`)
  - Waiter call detection -> distinct chime
  - 15-second tick interval for elapsed time counters
  - Modal launchers: TableCodes, SoldOut, Analytics, MenuManager
  - Database error notification banner with retry/dismiss

#### `OrderTicket.jsx`
- **Purpose**: Individual kitchen order chit
- **Props**: `order`, `now`, `onAdvance(id)`, `onSetStatus(id, status)`, `fresh`
- **Context**: `useOrders` (`editOrderLines`, `voidItem`)
- **Constants**: `STATUS_TONE` (Tailwind classes per status), `VOID_REASONS` (`['Wrong item', 'Customer changed mind', 'Kitchen issue', 'Duplicate order', 'Other']`)
- **Features**:
  - Elapsed time with "running long" alert (>=10 min, glowing oxblood drop-shadow)
  - Customer contact chip (clickable `tel:` link)
  - Inline line editing mode (quantity steppers)
  - Inline void with reason dropdown
  - One-tap status advance button + direct status switcher pills
  - **Permission guard**: Editing and voiding disabled for completed orders
  - Audit logging on edit/void

#### `CombinedBill.jsx`
- **Purpose**: Consolidated table bill
- **Props**: `tableNumber`, `orders[]`, `onMarkPaid(tableNumber)`
- **Features**: Chronological order breakdown, aggregated subtotal/tax/total, "Mark paid" action

#### `WaiterCallBar.jsx`
- **Purpose**: Sticky notification strip for waiter calls
- **Props**: `calls[]`, `onAcknowledge(id)`, `onDismiss(id)`
- **Features**: Pulsing radar beacon (`animate-ping`), elapsed time (10s refresh interval), "On my way" / dismiss buttons

#### `SoldOut.jsx`
- **Purpose**: Sold-out item management modal
- **Props**: `open`, `onClose()`
- **Contexts**: `useAvailability`, `useMenu`
- **Features**: Currently-off list with "Put back", search to mark new items sold out (up to 40 results), "Put everything back" bulk action

#### `MenuManager.jsx`
- **Purpose**: Full in-app Menu CMS
- **Props**: `open`, `onClose()`
- **Contexts**: `useMenu`, `useAvailability`
- **Internal Components**: `EditableField`, `ItemRow`, `AddItemForm`, `GroupList`, `SectionAccordion`
- **Features**:
  - Accordion section/group hierarchy
  - Inline editable fields (name, price, prices array, note)
  - Chef special star toggle
  - Availability toggle
  - Add new item form (name, price, auto-slug: `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')`)
  - Delete item with `window.confirm` guard
  - Local mode warning banner

#### `Analytics.jsx`
- **Purpose**: Business intelligence dashboard
- **Props**: `open`, `onClose()`
- **API**: `backend.queryAnalytics()`, `backend.clearAnalytics()`
- **Helpers**: `getDayString(d)`, `getPresets()`
- **Presets**: Today, Yesterday, This Week, This Month, All Time, Custom
- **Metrics**: Revenue, order volume, AOV, status breakdown, 24-hour histogram, top 15 items, table performance
- **Features**: 2-step data purge confirmation

#### `TableCodes.jsx`
- **Purpose**: QR code generator & print layout
- **Props**: `open`, `onClose()`
- **Internal Components**: `QrCard({ table })`
- **Features**: Configurable table count (1-60, default 12), `QRCode.toCanvas` rendering (ink on ivory colors), clipboard copy, `window.print()` optimized layout

### 9.3 Shared Components

#### `ChitPaper.jsx` (3 exports)
- `ChitPaper({ children, className, edge })` â€” torn bill slip container with scalloped mask
- `ChitLine({ label, sub, amount, qty, children, strong })` â€” line item with dot leader
- `ChitRule({ dashed, className })` â€” horizontal divider

#### `Ornaments.jsx` (6 exports)
- `CrownRule({ className, dark })` â€” horizontal hairline with crown SVG finial
- `DotTriad({ className })` â€” three brass dots separator
- `OrnateFrame({ className, inset, dark })` â€” SVG double-rule frame (`vectorEffect="non-scaling-stroke"`)
- `ChefMark({ className, title })` â€” chef's toque SVG badge
- `VegMark({ className })` â€” green vegetarian square badge
- `TeaCup({ className })` â€” steaming teacup line illustration

---

## 10. Menu Data Structure (`src/data/menu.js`)

### 10.1 Restaurant Metadata

```js
RESTAURANT = {
  name: 'Tea Connect Mansion',
  shortName: 'TCM',
  hours: 'Open 24x7',
  taxNote: 'GST extra, as applicable',
  vegNote: 'Entirely vegetarian kitchen'
}
```

### 10.2 Hierarchical Menu Model

```
Section -> Group -> Item

Section: { id, name, kicker, note?, groups: Group[] }
Group:   { id, name, tiers?: string[], addOn?: {id, label, price}, footnote?, items: Item[] }
Item:    { id, name, price?: number, prices?: number[], note?, choices?: string[], chef?: boolean }
```

### 10.3 Menu Categories (7 Sections, 42 Groups, 257 Items)

| # | Section ID | Section Name | Kicker | Groups | Approx Items |
|---|---|---|---|---|---|
| 1 | `hot-brews` | Hot Brews & Blends | "Brewed to order" | chai-classics, tea-infusions, coffee-brews | ~19 |
| 2 | `crafted-coolers` | Crafted Coolers | "Shaken, iced, poured" | cold-brews, thick-shakes, tea-coolers, mocktails, chilled-sips | ~45 |
| 3 | `desi-cravings` | Desi Cravings | "Street-side classics" | bun-toast, vada-pav, maggi-bowls, poha-bowls, desi-chaat, crispy-pakode | ~32 |
| 4 | `global-bites` | Global Bites | "Wok, griddle, fryer" | wok-edit, nachos, momos, fries, wraps, rolls | ~30 |
| 5 | `bread-affair` | The Bread Affair | "Toasted, pressed, baked" | sandwich, panini, garlic-breads, pizza, pasta | ~28 |
| 6 | `desi-flavours` | Desi Flavours | "From the tandoor and the pot" | soup, tikka-bar, comfort-pot, parathas, desi-plates, royal-thali, mains, rice, breads, raita, extras | ~78 |
| 7 | `sweet-indulgences` | Sweet Indulgences | "The last course" | fluffy-pancakes, artisan-waffles, cheesecakes, brownie-melts, pastries, creamy-scoops | ~25 |

### 10.4 Derived Exports

| Export | Description |
|---|---|
| `MENU` | Full structured section/group/item tree |
| `ITEM_INDEX` | Flattened array of all 257 items enriched with `sectionId`, `sectionName`, `groupId`, `groupName`, `tiers`, `addOn`, `basePrice` |
| `TOTAL_ITEMS` | `257` |
| `CHEF_SPECIALS` | 18 items where `chef === true` |
| `findItem(id)` | Lookup function returning item from `ITEM_INDEX` by `id` |

---

## 11. Utility Libraries (`src/lib/`)

### `format.js` â€” Pure Formatting Functions

| Function | Input | Output | Example |
|---|---|---|---|
| `rupees(amount)` | number | Formatted INR string | `rupees(1240)` -> `'Rs.1,240'` |
| `clockTime(iso)` | ISO timestamp | 12-hour time string | `'7:42 pm'` |
| `elapsed(iso, now)` | ISO timestamp, now | Human duration | `'just now'`, `'4 min'`, `'1 h 12 min'` |
| `describeLine(line)` | Line object | Description string | `'Adrak Chai . Pot for 4 . with ice cream'` |

### `tax.js` â€” GST Computation

| Export | Type | Description |
|---|---|---|
| `showsTax` | `boolean` | True if `VITE_GST_PERCENT` is configured |
| `taxPercent` | `number` | Configured percentage or 0 |
| `taxOn(subtotal)` | Function -> `{percent, amount, total}` | Calculates rounded tax |
| `taxLabel(percent)` | Function -> string | e.g. `'GST @ 5%'` |

### `tableToken.js` â€” QR URL Token Signing

| Export | Description |
|---|---|
| `encodeTable(table)` | Produces `base64url(table + '.' + dualHash(table))` |
| `decodeTable(token)` | Verifies signature, returns table string or `null` |

**Hashing**: Dual FNV-1a + djb2 keyed by `VITE_TABLE_SECRET` (default: `'tcm-default-key-change-in-production'`); validated against `^[A-Za-z0-9-]{1,6}$`

### `useChime.js` â€” Web Audio Notification Sounds

| Export | Description |
|---|---|
| `useChime()` | Hook -> `{ arm, ring, ringWaiter, armed, muted, setMuted }` |

- `arm()` â€” Resume AudioContext (requires user gesture)
- `ring()` â€” Two struck brass tones (triangle waves, 784 Hz + 1175 Hz, hold 1.1s/0.9s, gain 0.22)
- `ringWaiter()` â€” Three ascending staccato tones (sine waves, 523/659/784 Hz, hold 0.22-0.35s, gain 0.28)
- `muted` / `setMuted` â€” Persisted in `localStorage('tcm.muted')`

### `useRoute.js` â€” Client-Side Router

| Export | Description |
|---|---|
| `useRoute()` | Hook -> `{ view, table, demo, navigate }` |
| `tableUrl(table)` | Generates full URL with signed `?t=<token>` parameter |

---

## 12. Design System

### 12.1 Typography

| Font | Family | Use |
|---|---|---|
| **Bodoni Moda** | Display serif | Headlines, brand wordmarks, section titles |
| **Spectral** | Body serif | Menu items, descriptions, body text |
| **IBM Plex Mono** | Monospace | Prices, table numbers, timestamps, kitchen tickets |

### 12.2 Color Palette

| Token | Hex | Use |
|---|---|---|
| `--color-parchment` | `#f6f1e4` | Main background (customer) |
| `--color-parchment-dim` | `#ece5d3` | Dimmed background |
| `--color-ivory` | `#fdfbf4` | Card / chit paper surface |
| `--color-ink` | `#33291f` | Primary text |
| `--color-ink-soft` | `#6b5c4a` | Secondary text |
| `--color-ink-deep` | `#241c14` | Dark emphasis text |
| `--color-ink-rail` | `#1b150f` | Kitchen pass dark background |
| `--color-brass` | `#b08422` | Accent, buttons, interactive elements |
| `--color-brass-light` | `#d9b65a` | Light accent |
| `--color-brass-dim` | `#8a6717` | Dimmed accent |
| `--color-oxblood` | `#7b3b2e` | Decorative borders, frames |
| `--color-veg` | `#4b7a4e` | Vegetarian badge |

### 12.3 Custom CSS Classes

| Class | Description |
|---|---|
| `.chit-paper` | Radial-gradient mask-composite for scalloped tear edges (`--notch: 7px`) |
| `.leader` | Dot leaders (name ...... price) via radial gradient repeat-x |
| `.rule-brass` | Brass hairline gradient fading at ends |
| `.letterpress` | White drop-shadow for etched text effect |
| `.figure` | Tabular monospace number styling (`tabular-nums`, weight 600, letter-spacing -0.02em) |
| `.safe-b` | `padding-bottom: env(safe-area-inset-bottom, 0px)` |

### 12.4 Animations

| Class | Keyframe | Description |
|---|---|---|
| `.anim-draw` | `draw-rule` | Rule drawing entrance (scaleX, 0.7s) |
| `.anim-rise` | `rise` | Content rise entrance (fade + translateY, 0.5s) |
| `.anim-chit` | `chit-drop` | Ticket drop entrance with rotation settle (0.45s) |
| `.anim-flash` | `rail-flash` | Header flash on new order (brass box-shadow pulse) |
| `.anim-steep` | `steep` | Tea steeping loader (360 deg rotation, 1.4s) |

All animations respect `prefers-reduced-motion`.

---

## 13. Data Flow Diagrams

### 13.1 Customer Order Flow

```
Customer scans QR -> URL with ?t=<token>
    |
    v
useRoute() decodes table token
    |
    v
App.jsx renders CustomerMenu with providers
    |
    +-- MenuContext loads menu (cloud or static)
    +-- AvailabilityContext loads sold-out items
    +-- CartContext hydrates from sessionStorage
    +-- OrdersContext subscribes to table orders
         |
         v
Customer browses menu -> adds items to cart
    |
    v
Opens CartSheet -> fills name/phone/notes -> submits
    |
    v
CartContext.lines -> OrdersContext.placeOrder(draft)
    |
    v
backend.place() -> INSERT into Supabase `orders` table
    |
    v
OrderPlaced screen -> realtime subscription watches status
    |
    v
Kitchen advances status -> customer sees live progress bar
```

### 13.2 Kitchen Pass Order Flow

```
Staff opens ?view=admin -> PassGate (Auth check)
    |
    +-- Cloud: Supabase email/password -> authenticated RLS role
    +-- Local: PIN check -> localStorage unlock
    |
    v
AdminDashboard subscribes to all orders + waiter calls
    |
    v
New order arrives -> chime sounds -> ticket appears with drop animation
    |
    v
Staff taps "Start preparing" -> status: pending -> preparing
    |
    v
Staff taps "Mark served" -> status: preparing -> served
    |
    v
Staff taps "Close bill" -> status: served -> completed
    |
    v
Completed orders group into CombinedBill per table
    |
    v
Staff taps "Mark paid" -> orders archived -> customer session ends
```

### 13.3 Admin Authentication Flow

```
Staff navigates to admin view
    |
    v
PassGate checks mode
    |
    +-- Cloud mode (isCloudConfigured):
    |   +-- CloudGate renders email/password form
    |       |
    |       +-- Success -> logSecurity('sign_in_success') -> render children
    |       +-- Failure -> logSecurity('sign_in_failure') -> increment attempt counter
    |       +-- 5 failures -> logSecurity('rate_limited') -> 60s lockout countdown
    |
    +-- Local mode (!isCloudConfigured):
        +-- PinGate checks VITE_PASS_PIN
            |
            +-- No PIN configured -> render children (open access)
            +-- PIN configured -> PIN entry form -> localStorage unlock
```

### 13.4 Component -> Context Dependency Matrix

| Component | Orders | Cart | Menu | Availability | WaiterCall |
|---|---|---|---|---|---|
| `CustomerMenu` | Y | Y | Y | â€” | Y |
| `ItemRow` | â€” | Y | â€” | Y | â€” |
| `CartSheet` | â€” | Y | Y | Y | â€” |
| `OrderPlaced` | Y | â€” | â€” | â€” | â€” |
| `AdminDashboard` | Y | â€” | â€” | Y | Y |
| `OrderTicket` | Y | â€” | â€” | â€” | â€” |
| `SoldOut` | â€” | â€” | Y | Y | â€” |
| `MenuManager` | â€” | â€” | Y | Y | â€” |
| `Analytics` | â€” | â€” | â€” | â€” | â€” |

---

## 14. Scripts

### `setup-supabase.mjs` (`npm run setup`)
Interactive CLI that:
1. Prompts for Supabase URL, anon key, GST %, pass PIN, table secret
2. Validates inputs (URL protocol, JWT structure, pin format)
3. Writes `.env.local` (with `.env.local.bak` backup)
4. Tests connectivity via PostgREST probes (`GET /rest/v1/orders?select=id&limit=1`)
5. Optionally executes `schema.sql` via Supabase Management API

**Exported utilities**: `readEnv()`, `writeEnv()`, `checkUrl()`, `checkKey()`, `checkGst()`, `checkPin()`, `probe()`

### `seed-menu.mjs`
Migration script that:
1. Reads `.env.local` / `.env` without external dotenv dependency
2. Connects to Supabase via `@supabase/supabase-js`
3. Dynamically imports `src/data/menu.js`
4. Sequentially upserts all sections, groups, and items into Supabase tables
5. Idempotent (safe to re-run)

---

## 15. Test Infrastructure

### Configuration

| Tool | Version | Config |
|---|---|---|
| Vitest | 4.1.11 | `vite.config.js` -> `test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test-setup.js'] }` |
| @testing-library/react | 16.3.2 | React DOM testing utilities |
| @testing-library/user-event | 14.6.6 | Simulated user interactions |
| @testing-library/jest-dom | 7.0.1 | Custom DOM matchers via `src/test-setup.js` |
| jsdom | 29.1.1 | Browser environment simulation |

### Commands

| Command | Description |
|---|---|
| `npm test` | `vitest run` â€” single run |
| `npm run test:watch` | `vitest` â€” watch mode |

### Test Suites

#### `src/__tests__/App.routing.test.jsx` â€” URL Routing Integration
Validates App.jsx routing decisions with mocked components and contexts:
- Root `/` renders `TableGate`
- Valid `?t=<token>` renders `CustomerMenu` with resolved table
- `?view=admin` and `/admin` render `PassGate` -> `AdminDashboard`
- `?demo` enables demo shortcuts
- Tampered tokens fall back to `TableGate`
- Demo round-trips (table switching, admin <-> customer)
- Alphanumeric table IDs (`VIP-1`) resolve correctly

#### `src/__tests__/SessionLifecycle.test.jsx` â€” Session Management Integration
Comprehensive tests for customer session lifecycle:
- **30-Min Idle Timeout** (TC-1.x): Activity events reset timer; untracked events don't; admin/no-table views skip timer; cleanup on unmount
- **2-Min Background Grace** (TC-2.x): Return within grace keeps connection; exceeding grace disconnects Realtime; rapid visibility flickers handled; `pagehide` immediately disconnects
- **Table Cleared** (TC-3.x): All orders archived triggers `SessionEnded(cleared)`; partial clearance keeps session; fresh zero-order sessions don't trigger; re-scan resets state
- **Edge Cases** (TC-4.x): Cleared before idle prioritizes cleared reason; concurrent timeouts fire safely

#### `src/lib/__tests__/tableToken.test.js` â€” Token Security Unit Tests
- Valid encode/decode round-trips (numeric, alphanumeric, hyphenated, boundary)
- Base64url compliance and payload structure
- Uniqueness and determinism
- Missing/empty token handling
- Tamper/spoof detection (modified table, modified hash, fabricated tokens, multi-dots, special chars, oversized payloads, unicode)
- Table ID regex validation
- Default secret fallback

#### `src/lib/__tests__/useRoute.test.js` â€” Routing Hook Unit Tests
- Navigation round-trips with signed tokens
- Admin route detection (`/admin` path, `?view=admin` query)
- `popstate` event handling
- `tableUrl()` URL generation
- Missing parameter resolution
- Demo mode parsing
- Legacy `?table=` cleanup
- Trailing slash handling

#### `src/components/customer/__tests__/SessionEnded.test.jsx` â€” Session End Screen Unit Tests
- Reason message correctness (`cleared`, `timeout`, unknown, omitted)
- `backend.disconnect()` behavior verification
- UI structure (heading, reason paragraph, CTA button, waiter help text, restaurant footer)

---

## 16. Key Design Decisions & Boundaries

1. **No payment processing** â€” settlement happens at the physical counter
2. **No customer cancellation** â€” once placed, orders can only be modified by kitchen staff
3. **Dual-mode auth** â€” Supabase Auth in cloud mode (email/password with brute-force lockout); simple PIN in local mode
4. **Event-driven invalidation** â€” realtime events trigger full re-read, never payload merging
5. **Optimistic UI everywhere** â€” instant local state updates with automatic rollback on failure
6. **Graceful degradation** â€” app fully works without Supabase (local mode with localStorage)
7. **Entirely vegetarian kitchen** â€” no meat/seafood categories in menu
8. **GST is stamped immutably** â€” tax rate locked onto order record at placement time
9. **Security audit trail** â€” auth events logged to `security_log` table with event type, email, IP, user agent
10. **Zero-leak WebSocket management** â€” Realtime channels actively closed on idle timeout, background grace, table clearing, and page unload
