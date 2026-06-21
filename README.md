# #NASU（ハッシュナス） — 那須観光ルート提案アプリ

栃木県那須町の観光地を画像で選んで、車での道なりルートを提案するWebアプリ。  
芝浦工業大学 システム工学特別演習 9班の成果物。

---

## 機能

- **スポット選択**: 写真グリッドから行きたい観光地を選択
- **施設名の表示切替**: デフォルトは非表示（写真だけで直感的に選ぶ）。施設名を見たい人はトグルで表示できる
- **シャッフル表示**: 写真の表示順はセッションごとにランダム。シャッフルボタンで並べ替えもできる（選択状態は維持）
- **タグフィルター**: ジャンル（カフェ / 食事処 / 温泉・サウナ / 自然・公園 / レジャー・体験 など11種）と「だれと」（1人旅 / カップル / ファミリー など）でスポットを絞り込める。選んだタグのどれかに一致するものを表示（OR）
- **ルート設計**: 選択したスポットをTSP最適化で並び替え、ORS（OpenRouteService）で道なり経路を計算
- **出発地の選択**: 那須塩原駅 / 道の駅 那須高原友愛の森 / 那須IC / GPS現在地
- **周遊 / 片道**: 出発地へ戻るルートと、開いたルートの切り替え
- **有料道路の回避**: トグルで一般道のみに限定可能
- **共有できるルートURL**: ルート結果は `/route?spots=..&dep=..&trip=..&tolls=..` のURLで表現され、リンク共有・リロード復元ができる
- **グローバルナビ**: どのページからも右上の「N A S U」で1タップでホームへ。MENU から全ページ（ルート設計・みんなの旅・写真投稿・旅の記録・マイページ）へ直接遷移できる
- **写真投稿（単体）**: 旅先の写真をスポットと一緒に投稿できる（`/post`）。スポットは部分一致検索で選択。投稿者はニックネームのみの匿名アカウント（メールアドレス等は不要）
- **写真の切り抜き調整**: 投稿する写真はドラッグ・ピンチ・スライダーで表示範囲を自由に調整してからアップロードできる
- **旅記録**: 訪れたスポットを順番に並べて、写真付きの旅としてまとめて投稿できる（`/trips/new`）。ルート設計の結果画面「この旅を記録する」から訪問順が入った状態でも始められる
- **投稿一覧**: みんなの旅記録を新着順で閲覧できる（`/trips`、ログイン不要）
- **投稿写真のグリッド反映**: 投稿者が許可した写真は、スポット選択画面のカードに Google 写真とあわせて表示される。表示される写真は訪れるたび・シャッフルのたびにランダムに替わり、カード内で手動で送ることもできる
- **マイページ**: 自分の投稿の確認・編集（文章と掲載許可）・削除、ニックネームの変更ができる（`/me`）。写真を削除するとスポット選択のグリッドからも消える

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
| `/me` | マイページ（機能3） |

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

`.env.example` をコピーして `.env.local` を作り、値を記入する。

```bash
cp .env.example .env.local
```

必要な変数:

```
GOOGLE_PLACES_API_KEY=...
ORS_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SPOTS_MODE=debug   # 開発は debug、本番(Vercel)は full
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

スポットデータは2モードあり、環境変数 `NEXT_PUBLIC_SPOTS_MODE` で切り替える。

| モード | データ | 用途 |
|---|---|---|
| `debug`（既定） | `data/spots.json`（13件） | 開発用。Google写真APIの消費を抑える |
| `full` | `data/spots-full.json`（約200件） | 本番用。Vercel に `NEXT_PUBLIC_SPOTS_MODE=full` を設定 |

本番データは調査CSV（`data/nasu_spot_v1.csv`）から生成する:

```bash
npx tsx scripts/build-spots-full.ts
```

スポット選択画面の写真は、カードが画面に近づいてから取得する（遅延読み込み）。

> **注意**: 座標はGoogle Places由来にせず、調査データ・国土地理院・OSMから取得すること。山頂など車道のない地点は最寄りの駐車場・ロープウェイ乗り場の座標を使うこと（ルート計算が失敗する）。

## デプロイ（Vercel）

GitHub リポジトリを Vercel に接続すると、**main への push で本番が自動更新**され、**機能ブランチ/PR ごとにプレビューURL**が自動で立つ。開発途中でもつないでよい（未完の機能は画面に出さなければ本番は安定したまま）。ローカルで `next build` ができない環境（WSL）でも、Vercel のクラウドビルドが実質の本番ビルド検証になる。

### 初回セットアップ

1. [vercel.com](https://vercel.com/) に GitHub アカウントでログイン → **Add New… → Project** → このリポジトリを Import。
2. Framework は **Next.js** が自動検出される（Build/Output 設定は変更不要）。
3. **Environment Variables** に以下を登録（`.env.example` と同じ。Production / Preview 両方に入れる）:

   | 変数 | 値 |
   |---|---|
   | `GOOGLE_PLACES_API_KEY` | Places API (New) のキー |
   | `ORS_API_KEY` | openrouteservice トークン |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase の Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon キー |
   | `NEXT_PUBLIC_SPOTS_MODE` | **`full`**（本番は約200件） |

4. **Deploy** を押す。完了すると `https://<project>.vercel.app` が発行される。

### デプロイ前のチェック

- **Google Places キーの制限**: Vercel のサーバー関数は IP が動的なので「IPアドレス制限」は効かない。→「アプリケーションの制限=**なし**」にしつつ「**APIの制限で Places API (New) のみ**」に絞り、Google Cloud で**予算アラート**を設定する（濫用・課金対策）。
- **Supabase**: 本番プロジェクトに `supabase/schema.sql` と各 migration を適用済みにする（手順は [supabase/SETUP.md](supabase/SETUP.md)）。`service_role` キーはどこにも置かない（公開の anon キー＋RLS で守る設計）。
- **CI**: GitHub Actions でテストが走る。Vercel ビルドと併せて、push 前に `npm test` が通ることを確認する。

### 運用フロー

- 機能ブランチ → PR を作ると Vercel が**プレビューURL**を出す → そこで動作確認 → main にマージで**本番へ自動反映**。今の Git 運用（機能ブランチ→main）にそのまま乗る。
- 公開URLは誰でも匿名投稿できる点に注意。限定公開したい場合は Vercel の Password Protection（Pro）等を検討する。

## ライセンス

本リポジトリは学習・研究目的のものです。
