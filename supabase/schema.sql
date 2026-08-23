-- Tea Connect Mansion — order store
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

-- ── Customer details ────────────────────────────────────────────────────────
-- Name and phone collected at checkout. Visible on the kitchen ticket so the
-- staff can call a customer by name or ring them if they step out.
alter table orders add column if not exists customer_name  text not null default '';
alter table orders add column if not exists customer_phone text not null default '';

-- ── Soft-delete for analytics ───────────────────────────────────────────────
-- When the admin clears completed orders from the pass, they are marked
-- archived rather than deleted. Analytics still counts them; the live pass
-- skips them.
alter table orders add column if not exists archived boolean not null default false;

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

-- ── Menu catalog (CMS) ─────────────────────────────────────────────────────
-- The menu moves from a static JS file to the database so prices and items
-- can be changed live from the admin dashboard without a redeploy.

create table if not exists menu_sections (
  id         text primary key,
  name       text    not null,
  kicker     text,
  note       text,
  sort_order integer not null default 0
);

create table if not exists menu_groups (
  id         text primary key,
  section_id text    not null references menu_sections(id) on delete cascade,
  name       text    not null,
  tiers      jsonb,
  add_on     jsonb,
  footnote   text,
  sort_order integer not null default 0
);

create table if not exists menu_items (
  id           text primary key,
  group_id     text    not null references menu_groups(id) on delete cascade,
  name         text    not null,
  price        integer,
  prices       jsonb,
  note         text,
  choices      jsonb,
  chef         boolean not null default false,
  is_available boolean not null default true,
  sort_order   integer not null default 0
);

-- Realtime for menu changes — a price edit propagates to every phone instantly.
do $$
begin
  alter publication supabase_realtime add table menu_sections;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table menu_groups;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table menu_items;
exception when duplicate_object then null;
end $$;

-- ── Waiter calls ────────────────────────────────────────────────────────────
-- A customer taps "Call a waiter" on their phone; the pass shows the table
-- number immediately with a distinct chime.

create table if not exists waiter_calls (
  id          serial primary key,
  table_label text not null,
  status      text not null default 'pending'
                check (status in ('pending', 'acknowledged', 'dismissed')),
  created_at  timestamptz not null default now()
);

do $$
begin
  alter publication supabase_realtime add table waiter_calls;
exception when duplicate_object then null;
end $$;

-- ── Order audit log ─────────────────────────────────────────────────────────
-- Every modification to an order after placement is recorded here so the
-- manager can see exactly what happened and when.

create table if not exists order_audit_log (
  id         serial primary key,
  order_id   text not null,
  action     text not null,
  detail     jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_order_idx on order_audit_log (order_id);

-- ── Access ──────────────────────────────────────────────────────────────────
--
-- PRODUCTION policies.
--
-- Guests (the anon role, which is what every customer phone uses) may place
-- an order and read orders. Only signed-in staff (the authenticated role)
-- may change or delete one, manage the menu, toggle sold-out items, or
-- dismiss waiter calls.
--
-- The anon key ships inside the JavaScript bundle and is public by design.
-- These policies ensure that even someone who extracts it can only do what a
-- customer should be able to do.
--
-- To create a staff account: Supabase dashboard → Authentication → Users →
-- "Add user". Use email + password. See DEPLOY.md section 10.
--

-- ── Orders ──────────────────────────────────────────────────────────────────
-- Guests can place and read orders. Only staff can update status or archive.

alter table orders enable row level security;

drop policy if exists "demo: anyone can place"  on orders;
drop policy if exists "demo: anyone can read"   on orders;
drop policy if exists "demo: anyone can update" on orders;
drop policy if exists "demo: anyone can delete" on orders;
drop policy if exists "guests can place"        on orders;
drop policy if exists "guests can read"         on orders;
drop policy if exists "staff can update"        on orders;
drop policy if exists "staff can delete"        on orders;

create policy "guests can place"  on orders for insert to anon, authenticated with check (true);
create policy "guests can read"   on orders for select to anon, authenticated using (true);
create policy "staff can update"  on orders for update to authenticated using (true);
create policy "staff can delete"  on orders for delete to authenticated using (true);

-- ── Sold-out list ───────────────────────────────────────────────────────────
-- Every phone reads it so the menu greys out sold-out items. Only staff may
-- mark something sold out or put it back.

alter table unavailable_items enable row level security;

drop policy if exists "sold out: anyone can read"  on unavailable_items;
drop policy if exists "sold out: anyone can write" on unavailable_items;
drop policy if exists "sold out: anyone can clear" on unavailable_items;
drop policy if exists "guests read sold out"       on unavailable_items;
drop policy if exists "staff mark sold out"        on unavailable_items;
drop policy if exists "staff restore"              on unavailable_items;

create policy "guests read sold out"  on unavailable_items for select to anon, authenticated using (true);
create policy "staff mark sold out"   on unavailable_items for insert to authenticated with check (true);
create policy "staff restore"         on unavailable_items for delete to authenticated using (true);

-- ── Menu catalog ────────────────────────────────────────────────────────────
-- Everyone reads the menu. Only staff can create, edit, or delete items,
-- groups, and sections.

alter table menu_sections enable row level security;
alter table menu_groups enable row level security;
alter table menu_items enable row level security;

drop policy if exists "menu: anyone can read sections"  on menu_sections;
drop policy if exists "menu: anyone can write sections" on menu_sections;
drop policy if exists "menu: guests read sections"      on menu_sections;
drop policy if exists "menu: staff write sections"      on menu_sections;

create policy "menu: guests read sections" on menu_sections for select to anon, authenticated using (true);
create policy "menu: staff write sections" on menu_sections for all to authenticated using (true) with check (true);

drop policy if exists "menu: anyone can read groups"  on menu_groups;
drop policy if exists "menu: anyone can write groups" on menu_groups;
drop policy if exists "menu: guests read groups"      on menu_groups;
drop policy if exists "menu: staff write groups"      on menu_groups;

create policy "menu: guests read groups" on menu_groups for select to anon, authenticated using (true);
create policy "menu: staff write groups" on menu_groups for all to authenticated using (true) with check (true);

drop policy if exists "menu: anyone can read items"  on menu_items;
drop policy if exists "menu: anyone can write items" on menu_items;
drop policy if exists "menu: guests read items"      on menu_items;
drop policy if exists "menu: staff write items"      on menu_items;

create policy "menu: guests read items" on menu_items for select to anon, authenticated using (true);
create policy "menu: staff write items" on menu_items for all to authenticated using (true) with check (true);

-- ── Waiter calls ────────────────────────────────────────────────────────────
-- Customers can place a call and see calls. Only staff can acknowledge,
-- dismiss, or delete calls.

alter table waiter_calls enable row level security;

drop policy if exists "calls: anyone can place"  on waiter_calls;
drop policy if exists "calls: anyone can read"   on waiter_calls;
drop policy if exists "calls: anyone can update" on waiter_calls;
drop policy if exists "calls: anyone can delete" on waiter_calls;
drop policy if exists "calls: guests can place"  on waiter_calls;
drop policy if exists "calls: guests can read"   on waiter_calls;
drop policy if exists "calls: staff can update"  on waiter_calls;
drop policy if exists "calls: staff can delete"  on waiter_calls;

create policy "calls: guests can place"  on waiter_calls for insert to anon, authenticated with check (true);
create policy "calls: guests can read"   on waiter_calls for select to anon, authenticated using (true);
create policy "calls: staff can update"  on waiter_calls for update to authenticated using (true);
create policy "calls: staff can delete"  on waiter_calls for delete to authenticated using (true);

-- ── Audit log ───────────────────────────────────────────────────────────────
-- Everyone can read and write audit entries. Writes happen alongside order
-- placement (which guests do), so the anon role needs INSERT.

alter table order_audit_log enable row level security;

drop policy if exists "audit: anyone can read"  on order_audit_log;
drop policy if exists "audit: anyone can write" on order_audit_log;
drop policy if exists "audit: guests can read"  on order_audit_log;
drop policy if exists "audit: guests can write" on order_audit_log;

create policy "audit: guests can read"  on order_audit_log for select to anon, authenticated using (true);
create policy "audit: guests can write" on order_audit_log for insert to anon, authenticated with check (true);
