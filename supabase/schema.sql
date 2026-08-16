-- Tea Content Mansion — order store
--
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to re-run: every statement guards against already existing.
--
-- See DEPLOY.md section 3 for where this fits.

-- ── The table ───────────────────────────────────────────────────────────────
create table if not exists orders (
  id          text primary key,
  seq         integer not null,
  table_label text    not null,
  lines       jsonb   not null,
  note        text    not null default '',
  subtotal    integer not null,
  status      text    not null default 'pending'
                check (status in ('pending', 'preparing', 'served', 'completed')),
  placed_at   timestamptz not null default now(),
  history     jsonb   not null default '[]'
);

-- Tax, recorded on the order rather than recomputed. A rate change next month
-- must not rewrite what a customer was quoted today. Zero when no rate is
-- configured, which is the printed card's "GST extra, as applicable".
alter table orders add column if not exists tax_percent numeric(5, 2) not null default 0;
alter table orders add column if not exists tax_amount  integer       not null default 0;
alter table orders add column if not exists total       integer;

-- ── Sold out ────────────────────────────────────────────────────────────────
-- A row here means the kitchen has run out. Absence means available, so the
-- common case costs nothing. The id matches `id` in src/data/menu.js.
create table if not exists unavailable_items (
  item_id text primary key,
  since   timestamptz not null default now()
);

do $$
begin
  alter publication supabase_realtime add table unavailable_items;
exception
  when duplicate_object then null;
end $$;

-- ── Human-readable bill numbers: TCM-0001, TCM-0002, … ──────────────────────
create sequence if not exists orders_seq;
alter table orders alter column seq set default nextval('orders_seq');

create or replace function set_order_id() returns trigger as $$
begin
  new.id := 'TCM-' || lpad(new.seq::text, 4, '0');
  return new;
end $$ language plpgsql;

drop trigger if exists orders_set_id on orders;
create trigger orders_set_id
  before insert on orders
  for each row execute function set_order_id();

-- ── The pass reads newest-first and filters by status ───────────────────────
create index if not exists orders_status_placed_idx on orders (status, placed_at desc);

-- ── Realtime, so the pass updates without polling ───────────────────────────
do $$
begin
  alter publication supabase_realtime add table orders;
exception
  when duplicate_object then null;
end $$;

-- ── Access ──────────────────────────────────────────────────────────────────
--
-- READ THIS BEFORE GOING LIVE.
--
-- The policies below are the DEMO set. They let anyone holding the anon key —
-- which is public, it ships in the JavaScript — place, read, change and delete
-- orders. That is what makes the app work with no login, and it is fine for a
-- pilot: the data is table numbers and dish names.
--
-- It also means someone who finds your pass URL could mark every order
-- completed. Before this runs a real service, do BOTH of:
--
--   1. Put the pass behind host-level access control (DEPLOY.md section 6).
--   2. Swap to the PRODUCTION policies at the bottom of this file, and add a
--      staff login.
--
alter table orders enable row level security;

drop policy if exists "demo: anyone can place"  on orders;
drop policy if exists "demo: anyone can read"   on orders;
drop policy if exists "demo: anyone can update" on orders;
drop policy if exists "demo: anyone can delete" on orders;

create policy "demo: anyone can place"  on orders for insert to anon, authenticated with check (true);
create policy "demo: anyone can read"   on orders for select to anon, authenticated using (true);
create policy "demo: anyone can update" on orders for update to anon, authenticated using (true);
create policy "demo: anyone can delete" on orders for delete to anon, authenticated using (true);

-- Sold-out list. Every phone must be able to read it; only the pass should be
-- writing it, which is what the production policies below enforce.
alter table unavailable_items enable row level security;

drop policy if exists "sold out: anyone can read"  on unavailable_items;
drop policy if exists "sold out: anyone can write" on unavailable_items;
drop policy if exists "sold out: anyone can clear" on unavailable_items;

create policy "sold out: anyone can read"  on unavailable_items for select to anon, authenticated using (true);
create policy "sold out: anyone can write" on unavailable_items for insert to anon, authenticated with check (true);
create policy "sold out: anyone can clear" on unavailable_items for delete to anon, authenticated using (true);

-- ── PRODUCTION policies ─────────────────────────────────────────────────────
--
-- Guests may place an order and read orders; only signed-in staff may change
-- or delete one. Requires wiring Supabase auth into the pass — see DEPLOY.md
-- section 10. Drop the demo policies above before creating these.
--
-- create policy "guests can place" on orders
--   for insert to anon with check (true);
-- create policy "guests can read"  on orders
--   for select to anon using (true);
-- create policy "staff can update" on orders
--   for update to authenticated using (true);
-- create policy "staff can delete" on orders
--   for delete to authenticated using (true);
--
-- -- Guests read the sold-out list; only staff change it.
-- create policy "guests read sold out"  on unavailable_items
--   for select to anon, authenticated using (true);
-- create policy "staff mark sold out"   on unavailable_items
--   for insert to authenticated with check (true);
-- create policy "staff restore"         on unavailable_items
--   for delete to authenticated using (true);
