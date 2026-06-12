# 那須旅 — 那須観光ルート提案アプリ

栃木県那須町の観光地を画像で選んで、車での道なりルートを提案するWebアプリ。  
芝浦工業大学 システム工学特別演習 9班の成果物。

---

## 機能

- **スポット選択**: 写真グリッドから行きたい観光地を選択
- **施設名の表示切替**: デフォルトは非表示（写真だけで直感的に選ぶ）。施設名を見たい人はトグルで表示できる
- **シャッフル表示**: 写真の表示順はセッションごとにランダム。シャッフルボタンで並べ替えもできる（選択状態は維持）
- **ルート設計**: 選択したスポットをTSP最適化で並び替え、ORS（OpenRouteService）で道なり経路を計算
- **出発地の選択**: 那須塩原駅 / 道の駅 那須高原友愛の森 / 那須IC / GPS現在地
- **周遊 / 片道**: 出発地へ戻るルートと、開いたルートの切り替え
- **有料道路の回避**: トグルで一般道のみに限定可能
- **共有できるルートURL**: ルート結果は `/route?spots=..&dep=..&trip=..&tolls=..` のURLで表現され、リンク共有・リロード復元ができる
- **写真投稿（単体）**: 旅先の写真をスポットと一緒に投稿できる（`/post`）。スポットは部分一致検索で選択。投稿者はニックネームのみの匿名アカウント（メールアドレス等は不要）
- **旅記録**: 訪れたスポットを順番に並べて、写真付きの旅としてまとめて投稿できる（`/trips/new`）。ルート設計の結果画面「この旅を記録する」から訪問順が入った状態でも始められる
- **投稿一覧**: みんなの旅記録を新着順で閲覧できる（`/trips`、ログイン不要）
- **投稿写真のグリッド反映**: 投稿者が許可した写真は、スポット選択画面のカードに Google 写真とあわせてカルーセル表示される

## ページ構成

| URL | 画面 |
|---|---|
| `/` | ホーム（スタート画面） |
| `/select` | 出発地・スポット選択 |
| `/route?spots=..&dep=..` | ルート結果（地図 + タイムライン） |
| `/post` | 写真の単体投稿（機能3） |
| `/trips` | 旅記録の一覧（機能3） |
| `/trips/[id]` | 旅記録の詳細（機能3） |
| `/trips/new` | 旅記録の作成（機能3） |

## 技術スタック

| 区分 | 採用 |
|---|---|
| フロント | Next.js 14 (App Router) + TypeScript |
| スタイル | Tailwind CSS |
| 地図 | Leaflet + OpenStreetMap |
| 経路探索 | OpenRouteService (ORS) `driving-car` |
| 写真 | Google Places API (New) |
| 投稿（DB/認証/ストレージ） | Supabase（匿名認証 + Postgres + Storage） |

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成し、以下を記入する。

```
GOOGLE_PLACES_API_KEY=...
ORS_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

- `GOOGLE_PLACES_API_KEY`: Google Cloud Console で **Places API (New)** を有効化したキー。APIキーの制限は「なし」または「IPアドレス」に設定すること（HTTPリファラー制限は不可）。
- `ORS_API_KEY`: [openrouteservice.org](https://openrouteservice.org/dev/#/) で発行した新形式トークン（長い16進数の文字列）。
- `NEXT_PUBLIC_SUPABASE_*`: 写真投稿機能用。Supabase プロジェクトの作成手順は [supabase/SETUP.md](supabase/SETUP.md) を参照。

### 3. 開発サーバーの起動

```bash
npm run dev
```

`http://localhost:3000` でアクセスできる。

## 観光地データ

`data/spots.json` に13件のスポットが登録されている。  
スポットを追加する場合は `scripts/fetch-spots.ts` を参考に座標と `placeId` を取得する。

```bash
npx tsx scripts/fetch-spots.ts
```

> **注意**: 座標はGoogle Places由来にせず、国土地理院またはOSMから取得すること。山頂など車道のない地点は最寄りの駐車場・ロープウェイ乗り場の座標を使うこと。

## ライセンス

本リポジトリは学習・研究目的のものです。
