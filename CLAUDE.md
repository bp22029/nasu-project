# 那須観光ルート提案アプリ — 設計・実装ドキュメント

> このファイルはプロジェクトの現状を説明する**設計ドキュメント**として維持する。
> 「次に何をすべきか」ではなく「今どう動いているか・なぜそうなっているか」を記録する。
> Claude Code は作業のたびにこのファイルを読み、コードを推測で変えないこと。

---

## 1. プロジェクト概要

- **目的**: 栃木県那須町の観光課題（デジタル観光体験の不足／若年層の取り込み不足）への提案アプリ。芝浦工業大学・システム工学特別演習 9班の成果物。
- **コンセプト**: 「Instagramで"見つける"」と「Google Mapsで"行く"」の間を埋める、那須町特化の観光ルート提案アプリ。
- **ターゲット**: 画像で情報収集する若年層。**車で那須を巡る観光客**を主対象（→ ルートは直線距離ではなく実際の道なり経路で提案）。
- **アプリ名**: 未定（`NASU POT` は既存サービスと重複のため保留）。リポジトリ仮称 `nasu-tabi`。

---

## 2. 実装状況

### ✅ 機能1（実装済み）— ルート設計支援

- 画像グリッドでスポットを選択 → 道なりルート提案
- **出発地の選択**: 那須塩原駅 / 道の駅 那須高原友愛の森 / 那須IC / GPS現在地 の4択
- **周遊 / 片道の切替**: 周遊は出発地へ戻る閉じた経路、片道は開いた経路
- **有料道路の回避オプション**: トグルで切替。出発地がプリセットなら一般道デフォルト、GPS現在地なら有料道路OKデフォルト
- **写真**: Google Places API (New) で動的取得。グリッドに表示（地図には載せない）
- **観光地データ**: 13件（`data/spots.json`）

### ❌ 機能2（未着手）— 那須旅診断

診断結果からスポット配列を生成して `calculateRoute` に渡す設計。差し込み口は用意済み（セクション8参照）。

### ❌ 機能3（未着手）— 写真投稿

Supabase等のDBと投稿者管理が必要。写真取得関数を差し替えるだけで対応できる設計（セクション8参照）。

---

## 3. 技術スタック

| 区分 | 採用 | 備考 |
|---|---|---|
| フロント | Next.js 14 (App Router) + TypeScript | |
| スタイル | Tailwind CSS | |
| 地図 | **Leaflet + OpenStreetMap** | Google Maps は使わない（セクション5参照） |
| 経路探索 | **OpenRouteService (ORS)** `driving-car` | OSMベース。道なり経路・距離・時間・有料道路回避 |
| 巡回順最適化 | **自前TSP**（全探索/最近傍） | ORS の時間行列を入力に使う（`src/lib/tsp.ts`） |
| 写真 | **Google Places API (New)** | placeId で動的取得。グリッドに表示 |
| バージョン管理 | Git + GitHub | |
| デプロイ（任意） | Vercel | |

予算は月1万円程度まで利用可。ORS公開インスタンスとPlacesは当面無料枠で足りる。

---

## 4. 地図上のルート描画

- ORS Directions API（`driving-car`）で経路を取得。**geometry は GeoJSON 形式**（エンコード済みポリラインのデコード処理を避けるため）。
- 経路座標を Leaflet の `Polyline` に渡すことで道なりの曲線を描画する（直線にしない）。
- ルート線: `color: "#2563eb", weight: 5, opacity: 0.85`
- 出発地: 緑の丸マーカー（「出」）
- スポット: 青の番号付き丸マーカー（1, 2, 3 …）
- ルート表示時は `map.fitBounds` で全スポットが収まるよう自動ズームする。

---

## 5. 規約遵守ルール（重要・必ず守る）

**地図は Leaflet + OSM、経路は ORS、写真のみ Google。Google由来データを地図に載せない設計にする。**

理由: Google Maps Platform規約では「Places等のGoogleコンテンツを地図に表示する場合、その地図はGoogle Mapでなければならない」「競合地図サービスとの組み合わせ禁止」。よって地図側は完全にGoogle非依存（座標もOSM由来、経路もORS）に統一し、Googleは写真にのみ使い、写真は地図外のグリッドで表示する。

| データ | 出どころ | 保存可否 | 表示場所 |
|---|---|---|---|
| 緯度経度 | 国土地理院 or OSM(Nominatim) | 保存OK（Google由来でない） | 地図（Leaflet） |
| place_id | Google Places (Text Search) | **保存OK**（キャッシュ制限の例外） | 内部利用（写真取得キー） |
| 写真 | Google Places (New) | **保存禁止**。毎回動的取得 | 地図外グリッド |
| 経路形状 | ORS | 保存OK（Google由来でない） | 地図（Leaflet polyline） |

写真表示時の義務:
- `authorAttributions`（撮影者クレジット）が返ればそれを必ず表示する。
- Googleコンテンツを地図なしで表示するため、**Googleロゴ**を併記する（SpotCard 右上の `Google` バッジ）。
- 写真本体・写真URLはキャッシュ／DB保存しない（place_idだけ保存）。

---

## 6. データ設計（spots.json）

```jsonc
{
  "id": "chausu",
  "name": "茶臼岳",
  "lat": 37.126,    // 国土地理院 or OSM 由来（車でアクセスできる地点）
  "lng": 139.965,
  "placeId": "ChIJ...",  // Google Places Text Search から place_id のみ保存
  "tags": [],            // 機能2（診断）用に欄だけ確保。今は空配列
  "description": "那須連山の主峰。ロープウェイで高山の眺望。"
}
```

- 座標は **Google Places由来にしない**。地理院地図/OSMから取るか、現地確認で補正する。
- **山頂など車道のない地点は、最寄りの駐車場・ロープウェイ乗り場の座標を使う**（セクション11-開発メモ参照）。
- `tags` は機能2（診断）用に空配列で確保。現在は使わない。

**現在の13件**: 茶臼岳 / 鹿の湯 / 殺生石 / 那須温泉神社 / 那須ロープウェイ / 那須どうぶつ王国 / 那須サファリパーク / 那須高原りんどう湖ファミリー牧場 / 南ヶ丘牧場 / チーズガーデン 那須本店 / GOOD NEWS NEIGHBORS / 那須ステンドグラス美術館 / 道の駅 那須高原友愛の森

スポット追加時は `scripts/fetch-spots.ts` を参考に座標とplaceIdを取得する（実行: `npx tsx scripts/fetch-spots.ts`）。

---

## 7. ルート設計の仕組み（実装済み）

### フロー

1. ユーザーが出発地を選択（3プリセット または GPS現在地）
2. 画像グリッドでスポットを1件以上選択
3. 片道/周遊・有料道路オプションを設定
4. 「設計する」ボタン → クライアントが `POST /api/route` を呼ぶ
5. サーバーサイドで `calculateRoute()` を実行:
   - **ORS Matrix API**: 出発地 + 全選択スポットの道なり所要時間行列を取得
   - **TSP最適化**: `solveTSP(matrix, roundTrip)` で訪問順を決定（出発地はindex 0に固定）
   - **ORS Directions API (GeoJSON)**: 確定順のウェイポイントで道なり経路形状を取得。周遊時は末尾に出発地を追加。
6. クライアントが地図にポリラインとマーカーを描画し、タイムラインを表示

### TSPのしきい値

- **スポット数 ≤ 7**（出発地含む総数 ≤ 8）: 全探索（7! = 5040通り）
- **スポット数 ≥ 8**: 最近傍法にフォールバック

### 有料道路の扱い

- ORS に `options: { avoid_features: ["tollways"] }` を付加することで有料道路を回避。
- 有料道路を使う場合（`avoidTolls: false`）、タイムラインにドラぷらへのリンクを表示（ORS は日本の料金データを持たないため、金額の算出は外部サービスに委ねる）。

---

## 8. 将来の拡張の差し込み口（実装済みの構造）

- **ルート計算は独立関数**: `calculateRoute(selectedSpots, departure, tripType, avoidTolls) → RouteResult`（`src/lib/calculateRoute.ts`）。機能2は「診断結果からスポット配列を生成してこの関数に渡す」だけで追加できる。
- **写真取得は独立APIルート**: `GET /api/photos/[placeId]`（`src/app/api/photos/[placeId]/route.ts`）。機能3は投稿DBからの写真をこのエンドポイントに追加するだけで対応できる。
- **`tags` フィールドが空配列で確保済み**: `data/spots.json` の全スポットに `"tags": []` がある。機能2のマッチングロジックをここに追記する。

機能3は Supabase 等のDBと最低限の投稿者管理が必要。今回は触らない。

---

## 9. 実装済み機能の概要

### グリッド画面（初期表示）

- `DepartureSelector`: 出発地を横スクロールのチップで選択。GPSボタン押下で `navigator.geolocation.getCurrentPosition()` を呼ぶ。
- `SpotGrid` + `SpotCard`: 2列カードグリッド。各カードは Google Places 写真（16:9）を非同期取得し、取得中はグラデーションプレースホルダーを表示。
- 下部アクションバー: 片道/周遊トグル・有料道路トグル・選択件数・「設計する」ボタン。出発地未選択または0件選択でボタンを無効化。

### ルート画面（設計後）

- 地図（上部）: Leaflet + OSM。出発地=緑マーカー、スポット=番号付き青マーカー、経路=青ポリライン。
- タイムライン（下部）: 出発地→スポット1→スポット2…（→出発地 if 周遊）の区間ごとに所要時間・距離を表示。
- ヘッダーの「← 戻る」でグリッド画面に戻り、選択状態はリセットされる。

### API ルート

| エンドポイント | 役割 |
|---|---|
| `POST /api/route` | ORS Matrix → TSP → ORS Directions を実行して RouteResult を返す |
| `GET /api/photos/[placeId]` | Places API (New) からスポット写真を動的取得して返す |

---

## 10. ファイル構成

```
nasu-tabi/
├── data/
│   └── spots.json               # 観光地マスタ（13件）
├── scripts/
│   └── fetch-spots.ts           # spots.json 生成スクリプト（使い捨て）
├── src/
│   ├── app/
│   │   ├── page.tsx             # メインページ（クライアントコンポーネント、状態管理）
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── route/route.ts           # POST /api/route
│   │       └── photos/[placeId]/route.ts # GET /api/photos/[placeId]
│   ├── components/
│   │   ├── Map.tsx              # Leaflet地図（SSR無効、polyline・マーカー）
│   │   ├── SpotCard.tsx         # スポットカード（写真取得・選択状態）
│   │   ├── SpotGrid.tsx         # 2列グリッド
│   │   ├── DepartureSelector.tsx # 出発地選択UI（プリセット + GPS）
│   │   └── RouteTimeline.tsx    # ルートのタイムライン表示
│   ├── lib/
│   │   ├── calculateRoute.ts    # ルート計算の独立関数（拡張の差し込み口）
│   │   ├── ors.ts               # ORS API クライアント（Matrix / Directions）
│   │   └── tsp.ts               # 自前TSP（全探索 / 最近傍法）
│   └── types/
│       ├── spot.ts              # Spot 型
│       ├── route.ts             # RouteResult / RouteSegment 型
│       └── departure.ts         # DeparturePoint 型 + PRESET_DEPARTURES
├── .env.local                   # APIキー（Git管理外）
├── next.config.mjs              # Google画像ドメインの remotePatterns 設定
└── CLAUDE.md                    # このファイル
```

---

## 11. 開発メモ（ハマって解決した知見）

### ORS の座標順は [経度, 緯度]（Leaflet と逆）

ORS API（Matrix・Directions ともに）は座標を `[lng, lat]` の順で受け取る。Leaflet は `[lat, lng]` の順。混同するとルートが出ないかエラーになる。`ors.ts` では型エイリアス `type LngLat = [number, number]` を使い、渡す直前に `[s.lng, s.lat]` と明示している。

ORS の GeoJSON レスポンスの座標も `[lng, lat]` で返ってくる。`Map.tsx` では `coord => [coord[1], coord[0]]` で Leaflet 用に変換している。

### 山頂・施設入口など車道のない地点は座標を補正する

ORS は車道に吸着できない座標を受け取るとルート計算に失敗する（または極端に遠回りになる）。茶臼岳（山頂）・那須ロープウェイ（山中）などは、**最寄りの駐車場やロープウェイ乗り場の座標**に手動で補正する必要があった。補正済み座標は `data/spots.json` に反映されている。

スポットを追加するときは、Nominatim や地理院地図で取った座標が「車でたどり着ける場所」かを確認すること。

### Google Places API キーの制限設定

Places API は Next.js の API Route（サーバーサイド）から呼ぶため、キーの「アプリケーションの制限」を **「なし」または「IPアドレス」** にする。「HTTPリファラー」制限はブラウザからの呼び出し専用で、サーバーサイドからの呼び出しはリファラーが空になるため 403 で弾かれる。

### ORS API キーの世代に注意

openrouteservice.org は 2023 年以降にトークン体系を刷新した。旧フォーマット（`eyJ...` で始まる base64 エンコードされた JSON）は現在使えない。openrouteservice.org/dev/#/ から新規トークン（長い 16 進数の文字列）を発行して `.env.local` に設定すること。

### .env.local を変更したら dev サーバーを再起動する

`npm run dev` 実行中に `.env.local` を書き換えても、Next.js の dev サーバーは環境変数をホットリロードしない。変更後は一度サーバーを止めて `npm run dev` し直す。

---

## 12. 進め方の鉄則

1. 各作業は `npm run dev` で動作確認してから commit する。
2. AI が書いたコードの全体構造は人間が把握する。バグ修正の丸投げで無限ループにしない。
3. 機能2・3の中身は作り込まない（差し込み口だけ用意済み）。
4. API キーは `.env.local` で管理。`.gitignore` に `.env*` が入っていることを確認する。

### Git / GitHub 運用

- `main` は常に「動く状態」を保つ幹とする。
- 機能単位でブランチを切る（例: `feature/departure`, `feature/toll-ui`）。
- `npm run dev` で動作確認できたら commit して `main` にマージし、push する。
- ビルドが通らない状態・動作未確認のコードは push しない。

---

## 13. 環境変数（.env.local）

```
GOOGLE_PLACES_API_KEY=（Places API (New) 有効化済み。APIキーの制限は「なし」か「IPアドレス」に設定）
ORS_API_KEY=（openrouteservice.org で発行した新形式トークン。旧 eyJ... 形式は不可）
```

`.gitignore` に `.env*` が含まれていることを必ず確認する。
