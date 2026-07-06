-- マイグレーション 004: saved_routes（設計したルートの軽量ブックマーク）
-- （schema.sql 適用済みのプロジェクトに対して SQL Editor で実行する。
-- 　新規プロジェクトは schema.sql に同内容が含まれるため実行不要）
--
-- 写真なし・非公開・自分用のルート保存。ルートは route_query 一本で完全復元できる
-- （/route?{route_query}）。ニックネーム不要にするため FK は profiles ではなく
-- auth.users を直参照する。title は null 可（null のときはスポット名から自動生成）。

create table public.saved_routes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  route_query text not null,
  title       text check (char_length(title) between 1 and 60),
  created_at  timestamptz not null default now()
);
create index saved_routes_user_idx on public.saved_routes (user_id, created_at desc);

-- RLS: 非公開の自分用ブックマークなので、読み取りも本人のみ
alter table public.saved_routes enable row level security;
create policy "read own"   on public.saved_routes for select to authenticated using (auth.uid() = user_id);
create policy "insert own" on public.saved_routes for insert to authenticated with check (auth.uid() = user_id);
create policy "update own" on public.saved_routes for update to authenticated using (auth.uid() = user_id);
create policy "delete own" on public.saved_routes for delete to authenticated using (auth.uid() = user_id);
