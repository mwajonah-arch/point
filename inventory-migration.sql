-- Moves inventory out of the single kv_store JSON blob into real rows,
-- so stock changes can be updated atomically per-product instead of the
-- whole product list being overwritten on every save. This is what closes
-- the multi-till oversell/lost-update race: two cashiers decrementing two
-- different products at the same moment can no longer clobber each other,
-- and the database itself refuses to let stock go negative.
--
-- Run this once in Supabase -> SQL Editor. It's additive: kv_store and the
-- 'inventory' key inside it are left completely untouched, so nothing is
-- deleted or overwritten by running this.

create table if not exists public.inventory (
  id             text primary key,
  name           text not null,
  category       text not null default '',
  sku            text not null default '',
  price          numeric not null default 0,
  stock          integer not null default 0 check (stock >= 0),
  reorder_level  integer not null default 0,
  expiry         date,
  requires_rx    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.inventory enable row level security;

-- Same pattern as kv_store: anon (the browser) may only read. All writes —
-- both admin product edits and checkout stock decrements — go through
-- edge functions using the service-role key, which check a signed session
-- token (and admin role, for product edits) before touching anything.
create policy "Allow anon read" on public.inventory
  for select to anon using (true);

alter publication supabase_realtime add table public.inventory;

-- The atomic guard itself. UPDATE ... WHERE stock >= p_qty is a single
-- statement Postgres executes as one atomic operation — there's no
-- separate "read stock, check it client-side, write new value" gap for a
-- second concurrent sale to land in. If two sales for the last unit of the
-- same product arrive at nearly the same instant, the database processes
-- them one at a time; the first to run succeeds and the guard makes the
-- second simply not match any row, so it returns empty instead of driving
-- stock negative.
create or replace function public.decrement_stock(p_id text, p_qty integer)
returns table(id text, stock integer)
language sql
as $$
  update public.inventory
  set stock = inventory.stock - p_qty, updated_at = now()
  where inventory.id = p_id and inventory.stock >= p_qty
  returning inventory.id, inventory.stock;
$$;

-- Companion to decrement_stock, for restocks (voiding a sale, receiving
-- stock). No guard needed here — adding stock back can never make the
-- stock >= 0 check fail — so this is a plain atomic add.
create or replace function public.increment_stock(p_id text, p_qty integer)
returns table(id text, stock integer)
language sql
as $$
  update public.inventory
  set stock = inventory.stock + p_qty, updated_at = now()
  where inventory.id = p_id
  returning inventory.id, inventory.stock;
$$;

-- One-time copy of whatever is currently in the kv_store blob into the new
-- table, so you don't lose your existing product list and stock counts in
-- the switch. Safe to re-run: 'on conflict do nothing' means it will never
-- overwrite a row that's already been migrated or edited since.
insert into public.inventory (id, name, category, sku, price, stock, reorder_level, expiry, requires_rx)
select
  item->>'id',
  item->>'name',
  coalesce(item->>'category', ''),
  coalesce(item->>'sku', ''),
  coalesce((item->>'price')::numeric, 0),
  coalesce((item->>'stock')::integer, 0),
  coalesce((item->>'reorderLevel')::integer, 0),
  nullif(item->>'expiry', '')::date,
  coalesce((item->>'requiresRx')::boolean, false)
from public.kv_store, jsonb_array_elements(value) as item
where key = 'inventory'
on conflict (id) do nothing;

-- Done. Next: deploy the adjust-stock and manage-inventory edge functions,
-- then redeploy the frontend.
