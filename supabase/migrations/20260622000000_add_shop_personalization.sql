create table if not exists public.user_shop_bookmarks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

create table if not exists public.user_hidden_shops (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id)
);

create index if not exists user_shop_bookmarks_shop_id_idx
  on public.user_shop_bookmarks (shop_id);

create index if not exists user_hidden_shops_shop_id_idx
  on public.user_hidden_shops (shop_id);

alter table public.user_shop_bookmarks enable row level security;
alter table public.user_hidden_shops enable row level security;

grant select, insert, delete on public.user_shop_bookmarks to authenticated;
grant select, insert, delete on public.user_hidden_shops to authenticated;

create policy "Users can view their own shop bookmarks"
  on public.user_shop_bookmarks
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own shop bookmarks"
  on public.user_shop_bookmarks
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own shop bookmarks"
  on public.user_shop_bookmarks
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own hidden shops"
  on public.user_hidden_shops
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own hidden shops"
  on public.user_hidden_shops
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can remove their own hidden shops"
  on public.user_hidden_shops
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
