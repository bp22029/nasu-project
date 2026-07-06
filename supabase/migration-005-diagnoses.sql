-- マイグレーション 005: diagnoses（保存した旅タイプ診断の結果）
-- （schema.sql 適用済みのプロジェクトに対して SQL Editor で実行する。
-- 　新規プロジェクトは schema.sql に同内容が含まれるため実行不要）
--
-- 1ユーザー1行（user_id が主キー）＝ upsert で常に最新の診断結果1件だけを保持する。
-- result_query は /diagnosis の encodeDiagnosisQuery 文字列（type + 4軸スコア）。
-- 非公開・ニックネーム不要（FK は auth.users 直参照）。

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
