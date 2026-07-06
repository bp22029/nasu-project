# Supabase セットアップ手順（機能3: 写真投稿）

機能3はDB/認証/ストレージに Supabase（無料枠）を使う。以下はプロジェクト作成時に**一度だけ**行う手順。

## 1. プロジェクト作成

1. https://supabase.com にサインアップ（GitHubアカウントでOK）
2. New Project → Region は **Northeast Asia (Tokyo)** を選択
3. Database Password は控えておく（普段は使わないが復旧時に必要）

## 2. 匿名認証を有効化

- ダッシュボード → **Authentication → Sign In / Up** → **Anonymous Sign-ins** を ON

## 3. Storage バケット作成

- ダッシュボード → **Storage → New bucket**
  - 名前: `photos`
  - **Public bucket: ON**
  - Restrict file upload size: **2MB**
  - Allowed MIME types: `image/jpeg, image/png, image/webp`

## 4. スキーマ適用

- ダッシュボード → **SQL Editor** → `supabase/schema.sql` の内容を貼り付けて Run
- Table Editor に profiles / posts / trips / trip_entries / saved_routes の5テーブルができていればOK
- **既に稼働中のプロジェクト**（schema.sql 適用済み）にあとから機能を足す場合は、差分の `migration-00X-*.sql` を SQL Editor で Run する（各ファイル冒頭のコメント参照）。例: `migration-004-saved-routes.sql` = 保存したルート（機能: ルート保存）のテーブル追加。

## 5. 環境変数

ダッシュボード → **Settings → API** から取得して `.env.local` に追記:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

- `NEXT_PUBLIC_` プレフィックス必須（ブラウザから直接アクセスするため）。anon key は公開前提のキーで、防壁は RLS。
- **service_role key は使わない・どこにも書かない。**
- `.env.local` 変更後は dev サーバーを再起動する（ホットリロードされない）。
- Vercel にデプロイする際は Vercel の Environment Variables にも同じ2つを設定する。

## 運用上の注意

- **無料プロジェクトは約1週間アクセスがないと一時停止される。** デモ・発表前にダッシュボードで稼働状態を確認すること（Paused なら Restore ボタンで復帰）。
- 無料枠: DB 500MB / Storage 1GB / 帯域 5GB/月。写真はアップロード前にクライアント側で長辺1600pxに縮小するので、1GB で約3,000枚相当。
