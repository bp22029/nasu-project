-- マイグレーション 002: 投稿写真の /select グリッド掲載許可フラグ
-- （schema.sql 適用済みのプロジェクトに対して SQL Editor で実行する。
-- 　新規プロジェクトは schema.sql に同内容が含まれるため実行不要）
--
-- 投稿者がアップロード時に「スポット選択の画像に使ってよいか」を選べる。
-- 初期値は true（許可）。旅記録はエントリごとではなく投稿単位で1つのフラグ。

alter table public.posts add column show_in_grid boolean not null default true;
alter table public.trips add column show_in_grid boolean not null default true;
