-- 機能3（写真投稿）の DB スキーマ + RLS
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行する。
-- 前提: Authentication → Sign In / Up → Anonymous Sign-ins を ON にしておくこと。
-- 前提: Storage → `photos` バケット（Public）を作成しておくこと（手順は supabase/SETUP.md）。

-- ============================================================
-- 1) profiles: ニックネームのみ。個人情報は持たない
--    （匿名認証の auth.users と 1:1。後から Google ログインを
-- 　　 linkIdentity で紐付けても id は不変なのでスキーマ変更不要）
-- ============================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nickname   text not null check (char_length(nickname) between 1 and 20),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2) posts: 単体投稿（写真1枚 + スポット）
--    spot_id は data/spots.json の文字列 id（非正規化）。
--    spots.json の id は公開後に変更・削除しないこと。
-- ============================================================
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  spot_id      text not null,
  photo_path   text not null,            -- Storage 内パス（{user_id}/{uuid}.jpg）
  caption      text check (char_length(caption) <= 200),
  show_in_grid boolean not null default true, -- /select グリッドへの掲載許可（投稿者が選択）
  created_at   timestamptz not null default now()
);
create index posts_user_idx on public.posts (user_id, created_at desc);
create index posts_created_idx on public.posts (created_at desc);

-- ============================================================
-- 3) trips: 旅記録（タイトル + 任意コメント）
--    route_query には /route の encodeRouteQuery 文字列を保存
--    （ルート画面起点の投稿のみ。手動作成は null）
-- ============================================================
create table public.trips (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 60),
  comment      text check (char_length(comment) <= 500),
  route_query  text,
  show_in_grid boolean not null default true, -- 旅記録内の写真の /select グリッド掲載許可（投稿単位）
  created_at   timestamptz not null default now()
);
create index trips_created_idx on public.trips (created_at desc);
create index trips_user_idx on public.trips (user_id, created_at desc);

-- ============================================================
-- 4) trip_entries: 旅記録の訪問エントリ（順番付き）
--    photo_path は nullable（写真なしの訪問地も許す）
-- ============================================================
create table public.trip_entries (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  position   int  not null check (position >= 0),
  spot_id    text not null,
  photo_path text,
  unique (trip_id, position)
);
create index trip_entries_trip_idx on public.trip_entries (trip_id, position);

-- ============================================================
-- RLS: 読み取りは全公開（ログイン不要）、書き込みは本人のみ
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.posts        enable row level security;
alter table public.trips        enable row level security;
alter table public.trip_entries enable row level security;

create policy "public read" on public.profiles     for select using (true);
create policy "public read" on public.posts        for select using (true);
create policy "public read" on public.trips        for select using (true);
create policy "public read" on public.trip_entries for select using (true);

create policy "insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "update own" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "insert own" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "update own" on public.posts for update to authenticated using (auth.uid() = user_id);
create policy "delete own" on public.posts for delete to authenticated using (auth.uid() = user_id);

create policy "insert own" on public.trips for insert to authenticated with check (auth.uid() = user_id);
create policy "update own" on public.trips for update to authenticated using (auth.uid() = user_id);
create policy "delete own" on public.trips for delete to authenticated using (auth.uid() = user_id);

-- trip_entries は親 trip の所有者判定
create policy "insert own" on public.trip_entries for insert to authenticated
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));
create policy "delete own" on public.trip_entries for delete to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = auth.uid()));

-- ============================================================
-- 5) saved_routes: 設計したルートの軽量ブックマーク（機能: ルート保存）
--    写真なし・非公開・自分用。ルートは route_query 一本で完全復元できる
--    （/route?{route_query}）。ニックネーム不要にするため FK は profiles ではなく
--    auth.users を直参照する（保存に profiles 行＝ニックネームを要求しない）。
--    title は null 可（null のときはスポット名から自動生成 = deriveRouteTitle）。
-- ============================================================
create table public.saved_routes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  route_query text not null,
  title       text check (char_length(title) between 1 and 60),
  created_at  timestamptz not null default now()
);
create index saved_routes_user_idx on public.saved_routes (user_id, created_at desc);

-- RLS: 非公開の自分用ブックマークなので、読み取りも本人のみ（他テーブルの public read と異なる）
alter table public.saved_routes enable row level security;
create policy "read own"   on public.saved_routes for select to authenticated using (auth.uid() = user_id);
create policy "insert own" on public.saved_routes for insert to authenticated with check (auth.uid() = user_id);
create policy "update own" on public.saved_routes for update to authenticated using (auth.uid() = user_id);
create policy "delete own" on public.saved_routes for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- 6) diagnoses: 保存した旅タイプ診断の結果（機能2の保存・共有）
--    **1ユーザー1行**（user_id が主キー）＝ upsert で常に最新の1件だけを保持する。
--    result_query は /diagnosis の encodeDiagnosisQuery 文字列（type + 4軸スコア）で、
--    これ一本で結果カードを完全復元でき、共有URL（/diagnosis?{result_query}）にもなる。
--    saved_routes と同じく非公開・ニックネーム不要（FK は auth.users 直参照）。
-- ============================================================
create table public.diagnoses (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  result_query text not null,
  created_at   timestamptz not null default now()
);

-- RLS: 非公開（自分の最新診断のみ）。読み書きすべて本人のみ
alter table public.diagnoses enable row level security;
create policy "read own"   on public.diagnoses for select to authenticated using (auth.uid() = user_id);
create policy "insert own" on public.diagnoses for insert to authenticated with check (auth.uid() = user_id);
create policy "update own" on public.diagnoses for update to authenticated using (auth.uid() = user_id);
create policy "delete own" on public.diagnoses for delete to authenticated using (auth.uid() = user_id);

-- ============================================================
-- Storage RLS: 自分の user_id フォルダ配下にのみアップロード/削除可
-- （閲覧は Public バケットなのでポリシー不要）
-- ============================================================
create policy "upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
