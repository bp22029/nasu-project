-- マイグレーション 003: マイページ（/me）の投稿編集用 UPDATE ポリシー
-- （schema.sql 適用済みのプロジェクトに対して SQL Editor で実行する。
-- 　新規プロジェクトは schema.sql に同内容が含まれるため実行不要）
--
-- 編集できるのは本人のみ。編集対象は文章と掲載許可
-- （posts: caption / show_in_grid、trips: title / comment / show_in_grid）。

create policy "update own" on public.posts for update to authenticated
  using (auth.uid() = user_id);
create policy "update own" on public.trips for update to authenticated
  using (auth.uid() = user_id);
