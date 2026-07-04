# 那須観光ルート提案アプリ — 設計・実装ドキュメント

> このファイルはプロジェクトの現状を説明する**設計ドキュメント**として維持する。
> 「次に何をすべきか」ではなく「今どう動いているか・なぜそうなっているか」を記録する。
> Claude Code は作業のたびにこのファイルを読み、コードを推測で変えないこと。

---

## 1. プロジェクト概要

- **目的**: 栃木県那須町の観光課題（デジタル観光体験の不足／若年層の取り込み不足）への提案アプリ。芝浦工業大学・システム工学特別演習 9班の成果物。
- **コンセプト**: 「Instagramで"見つける"」と「Google Mapsで"行く"」の間を埋める、那須町特化の観光ルート提案アプリ。
- **ターゲット**: 画像で情報収集する若年層。**車で那須を巡る観光客**を主対象（→ ルートは直線距離ではなく実際の道なり経路で提案）。
- **アプリ名**: **`#NASU`（読み: ハッシュナス）**。SNSのハッシュタグを連想させつつ「那須(NASU)」を内包する。ブランド署名は `src/components/BrandMark.tsx` に集約（ヘッダー右上・ホームのインデックスライン/フッターで共用。「#」は淡い緑のアクセント、字間は詰めめでハッシュタグらしく）。リポジトリ名は `nasu-tabi` のまま。

---

## 2. 実装状況

### ✅ 機能1（実装済み）— ルート設計支援

- 画像グリッドでスポットを選択 → 道なりルート提案
- **タグフィルター**: ジャンル（詳細ジャンルをまとめた11種）と同行者（6種）でグリッドを絞り込む。`tags` を実行時に2軸へ解釈（`src/lib/spotTags.ts`）。OR判定。debugモードは tags 空のため非表示（セクション6参照）
- **出発地の選択**: 那須塩原駅 / 道の駅 那須高原友愛の森 / 那須IC / GPS現在地 の4択
- **周遊 / 片道の切替**: 周遊は出発地へ戻る閉じた経路、片道は開いた経路
- **巡回順の一部固定**: /route のタイムラインで各スポットの訪問順を「自動 / N番目」から選ぶと、そのスポットを指定の順番に固定して残りを TSP で最短最適化する（例: ご飯屋を1番目に指定。表示位置に関わらず任意の番号を選べる。「自動」で解除）。固定は `spotId → 訪問順の位置(1始まり)` で表現し、URL の `lock=<spotId>:<pos>,...` に載る（共有・リロードで維持。`routeQuery.ts`）。UIは各行の `<select>`（`RouteTimeline.tsx`。固定中スポットは表示位置＝固定位置なので select 値は現在の番号）。状態の正本はURLで、選択→`router.push` → 既存の queryString 依存 useEffect が再計算を発火する（`src/app/route/page.tsx`）。矛盾する制約（同一位置に複数固定・範囲外・未選択spot）は安全に無視して通常最適化に倒す（`tsp.ts` / `calculateRoute.ts` / `decodeRouteQuery`）
- **有料道路の回避オプション**: トグルで切替。出発地がプリセットなら一般道デフォルト、GPS現在地なら有料道路OKデフォルト
- **写真**: Google Places API (New) で動的取得。グリッドに表示（地図には載せない）。**カードが画面に近づいてから取得する遅延読み込み**（約200スポットを一斉取得するとAPI消費が激しいため）
- **観光地データ**: 2モードを `NEXT_PUBLIC_SPOTS_MODE` で切替（`src/lib/spots.ts` が単一参照点）
  - **debug（既定）**: 13件（`data/spots.json`）— 開発中の写真API節約用
  - **full**: 約200件（`data/spots-full.json`、`data/nasu_spot_v1.csv` 由来）— 本番用。Vercel に `NEXT_PUBLIC_SPOTS_MODE=full` を設定する

### 🔶 機能2（一部実装済み）— 那須旅診断

- ✅ **診断フロント**（`/diagnosis`）: 16問の5件法（Likert）を4軸で採点し、旅タイプ（動物）を表示する。
  - **4軸**（各4問・★は逆転項目）: ① 計画↔即興 / ② 刺激↔癒し / ③ 内向↔外向 / ④ 体験↔形。各軸の合計スコア（±8）で2極に振り分け、**4文字コード（例 `phnx`）で 2^4=16 タイプに確定**する（同点は正極に倒す＝決定的）。
  - タイプは動物マスコット + 画像。画像は `public/diagnosis-types/*.png`（`data/image` 由来。**ファイル名がコードを表す**: 例 `05_phnx_sheep.png` = 計画×癒し×内向×体験）。
  - 診断の中身（軸・質問・タイプ・採点）は `src/lib/diagnosis.ts` に集約。**タイプの name/tagline/description は仮テキストなので差し替え可**。画面（`src/app/diagnosis/page.tsx`）はこの配列を読むだけ。
  - 結果画面は「タイプ表示まで」。ローカル state のみで完結し URL/sessionStorage は使わない。
- ❌ **ルート連携（未実装）**: 診断結果 → スポット配列 → `calculateRoute` の接続はまだ。差し込み口として各タイプに `genres`（`GENRE_LABELS` の部分集合）を用意済み。将来ここを `spotMatchesTags` に渡して `/select`（事前フィルター）or `/route` へ繋ぐ（セクション8参照）。

### 🔶 機能3（一部実装済み）— 写真投稿

Supabase（匿名認証 + Postgres + Storage）で実装中。設計の全体像はセクション14参照。

- ✅ **基盤**: 匿名認証＋ニックネーム（`src/lib/auth.ts`、遅延発火）、DBスキーマ（`supabase/schema.sql`）、Storageセットアップ手順（`supabase/SETUP.md`）
- ✅ **単体投稿**（`/post`）: 写真1枚 + スポット（部分一致検索で選択）+ 任意キャプション
- ✅ **旅記録投稿**（`/trips/new`）: 訪問順エントリ（写真任意）。/route の「この旅を記録する」から訪問順プレフィル、ホームから空で新規作成（画面共通）
- ✅ **投稿一覧/詳細**（`/trips`, `/trips/[id]`）: 旅記録のみ新着順で公開表示。詳細に route_query があれば「このルートを地図で見る」
- ✅ **グリッド連携**: 掲載許可された投稿写真を /select のカードに Google 写真とあわせて表示（初期表示ランダム + カルーセル。セクション14参照）
- ✅ **マイページ**（`/me`）: 自分の投稿の確認・編集（文章と掲載許可のみ）・削除、ニックネーム変更

### ✅ 機能4（実装済み）— 使用感アンケート

- アプリ内アンケート（`/survey`）。実証実験用に**必須7問（属性2・5段階評価4・単一選択1）+ 任意2問（自由記述）**を**完全匿名**で回答。回答は **Google スプレッドシート**へ保存（`POST /api/survey` → Apps Script Web App）。
- 各完了・閲覧地点（`/route`・`/diagnosis`・`/post`・`/trips`・`/trips/[id]`・NavMenu）に導線CTA `SurveyPrompt` を設置。回答済みは localStorage で全CTAを自動非表示。設計の全体像はセクション15参照。

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
| 投稿（機能3） | **Supabase**（無料枠） | 匿名認証 + Postgres + Storage。ブラウザから supabase-js 直アクセス（防壁はRLS） |
| バージョン管理 | Git + GitHub | |
| デプロイ（任意） | Vercel | |

予算は月1万円程度まで利用可。ORS公開インスタンスとPlacesは当面無料枠で足りる。

---

## 4. 地図上のルート描画

- ORS Directions API（`driving-car`）で経路を取得。**geometry は GeoJSON 形式**（エンコード済みポリラインのデコード処理を避けるため）。
- 経路座標を Leaflet の `Polyline` に渡すことで道なりの曲線を描画する（直線にしない）。
- ルート線: 白の縁取り（`#ffffff, weight: 9`）の上に深緑の本線（`#2c3e2d, weight: 5`）を重ねる2本構成。森の多い那須の地図でも線が埋もれない。
- 出発地: 若緑 `#5a7d5a` の丸マーカー（「出」。タイムラインのバッジと同色）
- スポット: 深緑 `#2c3e2d` の番号付き丸マーカー（1, 2, 3 …）
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
- Googleコンテンツを地図なしで表示するため、**帰属表示「Google Maps」を併記する**。ロゴ画像は不要で、テキスト表記でよい（Google Maps Platform ポリシー: スペースが限られる場合は「Google マップ」テキスト可。**新規実装は「Google」ではなく「Google Maps」**を使う＝旧「Google」は経過措置）。実装は SpotCard 下部クレジット行で、撮影者名があれば `{撮影者名} · Google Maps`、無くても `Google Maps` を必ず表示（`photoCredit`）。施設名OFF時も表示し続ける。
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

**debug の13件**: 茶臼岳 / 鹿の湯 / 殺生石 / 那須温泉神社 / 那須ロープウェイ / 那須どうぶつ王国 / 那須サファリパーク / 那須高原りんどう湖ファミリー牧場 / 南ヶ丘牧場 / チーズガーデン 那須本店 / GOOD NEWS NEIGHBORS / 那須ステンドグラス美術館 / 道の駅 那須高原友愛の森

### 本番データ（spots-full.json、約200件）

- `data/nasu_spot_v1.csv`（調査データ: 場所/カテゴリー/ジャンル/座標）から `scripts/build-spots-full.ts` で生成する（実行: `npx tsx scripts/build-spots-full.ts`）。
- **既存13件は同じ id のまま含まれる**（CSVの重複行は既存に統合し、ジャンルを tags に取り込む。表記ゆれは スクリプト内 `MANUAL_ALIAS` で対応）→ モードを切り替えても DB の spot_id 参照は壊れない。
- 新規スポットの id は名前の md5 先頭8桁（`s-xxxxxxxx`）。名前から決まるのでCSVの並び替えに影響されない。**公開後の id は変更・削除しない**ルールはそのまま。
- placeId は Places Text Search の **IDs Only SKU（FieldMask=places.id）= 無料**で取得。CSV座標を locationBias にして誤マッチを防ぐ。
- `tags` には CSV のカテゴリー・ジャンルが入っている（機能2の診断マッチングにそのまま使える）。
- **`tags` は CSV「カテゴリー」列が4軸（季節 / ジャンル大分類 / 内外 / 同行者）を連結したもの + ジャンル1/2（詳細ジャンル）をフラットに1配列へ詰めた形**（位置情報は無く、複合値は「・」連結のまま）。/select のタグフィルターはこれを実行時に「ジャンル」「同行者」の2軸へ解釈する（`src/lib/spotTags.ts`）。
  - **ジャンル**: 大分類「カフェ・レストラン」ではカフェか食事処か判別できないため、**詳細ジャンル（ジャンル1/2 由来の単独トークン: カフェ/飲食店/美術館…）を使う**。単発が多いので近いものをまとめた**キュレーション11分類**（`GENRE_GROUPS`: カフェ/食事処/ベーカリー・スイーツ/温泉・サウナ/宿泊・キャンプ/自然・公園/レジャー・体験/美術館・博物館/ショップ・雑貨/道の駅・スーパー/名所・史跡）にマップする。大分類の複合文字列（"カフェ・レストラン" 等）はマップのキーに無く無視される。`自然`/`レジャー`/`体験` は大分類にも詳細にも同じ文字列で出るが同義なのでそのままマップ。
  - **同行者**: 「・」で分解（`全構成`→全トークン展開）。
  - **`tags` が空のスポットはフィルター有効時に隠れる**ので、全スポットに最低1つのジャンルが付くようにする（現状198件すべて詳細ジャンルを持つ）。CSVにカテゴリ行が無い既存スポットはCSVに行を足して対応する（例: 那須温泉神社）。
- 注意: CSV の座標は現地調査ベースのため、**車道に吸着できない地点があるとルート計算が失敗する**（セクション11）。ORSエラーが出たスポットは座標を駐車場等に補正して再生成する。

---

## 7. ルート設計の仕組み（実装済み）

### フロー

1. ユーザーが `/select` で出発地を選択（3プリセット または GPS現在地）
2. 画像グリッドでスポットを1件以上選択
3. 片道/周遊・有料道路オプションを設定
4. 「設計する」ボタン → `/route?spots=..&dep=..&trip=..&tolls=..` へ遷移し、ルート画面がクライアントから `POST /api/route` を呼ぶ
5. サーバーサイドで `calculateRoute()` を実行:
   - **ORS Matrix API**: 出発地 + 全選択スポットの道なり所要時間行列を取得
   - **TSP最適化**: `solveTSP(matrix, roundTrip, locks?)` で訪問順を決定（出発地はindex 0に固定）。`locks` があれば固定スポットを指定位置に置く（全探索は制約を満たす順列だけ評価、最近傍法は固定位置を先に埋めてから貪欲に充填）。矛盾・範囲外の制約は無視
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
- **ルート条件はURLで表現**: `/route?spots=..&dep=..&trip=..&tolls=..`（エンコード/デコードは `src/lib/routeQuery.ts`）。機能2（診断）は診断結果からこのURLを組み立てて遷移するだけでルート画面を丸ごと再利用できる。URLなのでアンケートでのルート共有・リロード復元もできる。
- **写真取得は独立APIルート**: `GET /api/photos/[spotId]`（`src/app/api/photos/[spotId]/route.ts`）。キーは spots.json の id で、サーバー側で placeId を引いて Google 写真を取得し、機能3の許可済み投稿写真をマージして返す（対応済み）。
- **`tags` フィールドが空配列で確保済み**: `data/spots.json` の全スポットに `"tags": []` がある。機能2のマッチングロジックをここに追記する。

機能3は Supabase 等のDBと最低限の投稿者管理が必要。今回は触らない。

---

## 9. 実装済み機能の概要

### ページ構成（App Router で分割済み）

| URL | 役割 |
|---|---|
| `/` | ホーム（スタート画面）。「はじめる」で `/select` へ。副CTAから `/diagnosis` へ |
| `/select` | 出発地 + 写真グリッドでスポット選択。「設計する」で `/route?...` へ |
| `/diagnosis` | 旅タイプ診断（機能2）。16問5件法 → 4軸で16タイプ（動物）を表示。ルート連携は未実装 |
| `/route?spots=..&dep=..&trip=..&tolls=..` | ルート結果（地図 + タイムライン）。URL単体で共有・リロード可能 |
| `/post` | 単体投稿（機能3）。写真 + スポット検索選択 + 任意キャプション + グリッド掲載許可 |
| `/trips` | 旅記録一覧（機能3）。旅記録のみ新着順・公開（ログイン不要） |
| `/trips/[id]` | 旅記録詳細（機能3）。訪問順エントリ + route_query があればルート画面へのリンク |
| `/trips/new` | 旅記録作成（機能3）。/route からのプレフィル有/無で画面共通 |
| `/me` | マイページ（機能3）。自分の投稿の確認・編集・削除、ニックネーム変更 |
| `/survey` | 使用感アンケート（機能4）。5段階3問 + 自由記述。回答は Google スプレッドシートへ保存（セクション15） |

- `/select` の選択状態は sessionStorage（キー `nasu-select-state`、`src/lib/selectState.ts`）に保存され、「← 選び直す」で戻る・リロードでは維持される。**ホームの「はじめる」はこのキーを破棄して常に新規スタート**（前回の選択が残ると違和感があるため。ユーザー要望、2026-06-12）。
- `dep` はプリセットID（`nasushiobara-station` 等）。GPS現在地は `dep=gps&lat=..&lng=..`。
- 機能2（診断）は診断結果から `/route?...` のURLを組み立てて遷移するだけで追加できる。
- **共通ヘッダー（`SiteHeader` + `NavMenu`）**: 全ページの右上に「N A S U（→ホーム、1タップ）」とグローバルメニュー（全ページへ）。左の文脈的な戻る（/route の「選び直す」等）は状態復元の意味があるため残す。メニューの「ルート設計」はホームCTAと同じく `SELECT_STATE_KEY` を破棄して白紙スタート（/route→/select の「選び直す」は復元、で挙動が分かれる）。`/select`・RouteShell・PageShell の重複ヘッダーは `SiteHeader` に集約済み。

### 選択画面（/select）

- `DepartureSelector`: 出発地を横スクロールのチップで選択。GPSボタン押下で `navigator.geolocation.getCurrentPosition()` を呼ぶ。
- `SpotGrid` + `SpotCard`: カードグリッド。各カードは Google Places 写真を非同期取得し、取得中はグラデーションプレースホルダーを表示。
- **シャッフル表示**: 表示順はセッションごとにランダム（全員が同じ順だと下方のスポットの訪問に偏りが出るため）。見出し右端の「シャッフル」ボタンで再シャッフルできる。順序は sessionStorage に保存され「選び直す」で戻っても維持。**key=spot.id のためシャッフルでカードは再マウントされず、選択状態・取得済み写真はそのまま**（写真APIの再取得なし）。プレースホルダー色とアニメ遅延は位置でなく spot.id / 初回マウント値から決めている（SpotCard）。
- 施設名のON/OFFスイッチ（スポットセクション見出しの右端、ラベル「施設名」+ スイッチ型UI）: **デフォルトOFF（非表示）**（「直感で選ぶ」コンセプト）。文言ではなくスイッチの位置と色で状態を示す（`role="switch"` + `aria-checked`）。**撮影者クレジット（authorAttributions）は規約上、OFF時も表示し続ける**。設定は sessionStorage に保存。
- 下部アクションバー: 片道/周遊トグル・有料道路トグル・選択件数・「設計する」ボタン。出発地未選択のまま押すと、出発地セクションへスクロール + 点滅ハイライトで誘導する（disabled で殺さない）。

### ルート画面（/route）

- ホーム・選択画面と同じデザイン言語（生成り背景 + 有機ブロブ + グレイン、インデックスライン「03 — ROUTE」、明朝の見出し）。計算中・エラー画面も同じ世界観で表示する。
- クエリパラメータを `decodeRouteQuery` で検証し、不正なら エラー文言 + 「選び直す」ボタンを表示。
- 計算中はスピナーを表示。`AbortController` で二重リクエスト（Strict Mode / 再遷移）を中断する。
- 地図（角丸カード）: Leaflet + OSM。出発地=若緑マーカー、スポット=深緑の番号付きマーカー、経路=白縁取り+深緑ポリライン（セクション4参照）。
- タイムライン（角丸カード）: 旅程ヘッダー + 合計時間/距離、出発地→スポット1→…（→出発地 if 周遊）の区間ごとに所要時間・距離を表示。
- ヘッダーの「← 選び直す」で `/select` に戻る。選択状態は維持される。

### API ルート

| エンドポイント | 役割 |
|---|---|
| `POST /api/route` | ORS Matrix → TSP → ORS Directions を実行して RouteResult を返す |
| `GET /api/photos/[placeId]` | Places API (New) からスポット写真を動的取得して返す |
| `POST /api/survey` | アンケート回答を検証して Google スプレッドシート（Apps Script Web App）へ転送（セクション15） |

---

## 10. ファイル構成

```
nasu-tabi/
├── data/
│   ├── spots.json               # 観光地マスタ debug用（13件）
│   ├── spots-full.json          # 観光地マスタ 本番用（約200件、build-spots-full.ts で生成）
│   ├── nasu_spot_v1.csv         # 本番スポットの調査データ（spots-full.json の元）
│   └── image/                   # 診断タイプの動物画像 元データ（public/diagnosis-types へコピーして使用）
├── public/
│   └── diagnosis-types/         # 診断16タイプの画像（ファイル名がタイプコード。例 05_phnx_sheep.png）
├── scripts/
│   ├── fetch-spots.ts           # spots.json 生成スクリプト（使い捨て）
│   ├── build-spots-full.ts      # spots-full.json 生成（CSV + 既存13件をマージ、placeId取得）
│   └── survey-apps-script.gs    # 機能4: アンケート回答をGoogleスプレッドシートに追記するApps Script（貼付用+手順）
├── supabase/
│   ├── schema.sql               # 機能3のDBスキーマ + RLS（SQL Editorで実行）
│   └── SETUP.md                 # Supabaseプロジェクトのセットアップ手順
├── src/
│   ├── app/
│   │   ├── page.tsx             # ホーム（/ スタート画面）
│   │   ├── select/page.tsx      # スポット選択（/select、選択状態は sessionStorage に保存）
│   │   ├── diagnosis/page.tsx   # 旅タイプ診断（/diagnosis、機能2。16問5件法 → 16タイプ表示）
│   │   ├── admin/diagnosis-types/page.tsx # 【管理者用】診断16タイプのプレビュー（Basic認証。ナビ非掲載）
│   │   ├── route/page.tsx       # ルート結果（/route?spots=..&dep=..、計算 + 地図 + タイムライン）
│   │   ├── post/page.tsx        # 単体投稿（/post、機能3）
│   │   ├── trips/page.tsx       # 旅記録一覧（/trips、機能3）
│   │   ├── trips/[id]/page.tsx  # 旅記録詳細（機能3）
│   │   ├── trips/new/page.tsx   # 旅記録作成（機能3、プレフィル対応）
│   │   ├── me/page.tsx          # マイページ（機能3、編集・削除・ニックネーム変更）
│   │   ├── survey/page.tsx      # 使用感アンケート（機能4、/survey?from=..。5段階3問+自由記述）
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── route/route.ts           # POST /api/route
│   │       ├── photos/[spotId]/route.ts # GET /api/photos/[spotId]（Google + 投稿写真をマージ）
│   │       └── survey/route.ts          # POST /api/survey（回答を検証しApps Script Web Appへ転送）
│   ├── components/
│   │   ├── Map.tsx              # Leaflet地図（SSR無効、polyline・マーカー）
│   │   ├── SpotCard.tsx         # スポットカード（写真取得・選択状態）
│   │   ├── SpotGrid.tsx         # 2列グリッド
│   │   ├── DepartureSelector.tsx # 出発地選択UI（プリセット + GPS）
│   │   ├── SpotFilter.tsx      # タグフィルターのチップUI（ジャンル / 同行者）
│   │   ├── SurveyPrompt.tsx    # 機能4: アンケートへの導線CTA（回答済みなら自動非表示。全完了地点で共用）
│   │   ├── RouteTimeline.tsx    # ルートのタイムライン表示
│   │   ├── GrainOverlay.tsx     # 紙風グレインテクスチャ（/ と /select で共用）
│   │   ├── SiteHeader.tsx       # 共通sticky ヘッダー（左=文脈的な戻る / 右=NASU→ホーム + NavMenu）
│   │   ├── NavMenu.tsx          # グローバルナビ（全ページへ飛べるメニュー。最長一致で現在ページを点灯）
│   │   ├── PageShell.tsx        # 共通ページシェル（機能3の新ページ用。RouteShellの一般化。ヘッダーは SiteHeader）
│   │   ├── NicknameModal.tsx    # ニックネーム入力モーダル（匿名サインイン + profiles upsert）
│   │   ├── SpotSearchPicker.tsx # スポット部分一致検索ピッカー
│   │   ├── PhotoUploadField.tsx # 写真選択 → 切り抜き調整 → プレビュー
│   │   ├── CropModal.tsx        # 切り抜き調整モーダル（react-easy-crop、4:3固定）
│   │   ├── TripEntryEditor.tsx  # 旅記録エントリの編集（追加・並べ替え・削除）
│   │   ├── TripCard.tsx         # 旅記録一覧カード
│   │   ├── UserPhoto.tsx        # 投稿写真の表示（Storage パス → 公開URL）
│   │   └── GridConsentCheckbox.tsx # グリッド掲載許可チェック（/post と /trips/new で共用）
│   ├── lib/
│   │   ├── calculateRoute.ts    # ルート計算の独立関数（拡張の差し込み口）
│   │   ├── diagnosis.ts         # 機能2診断の軸・質問・16タイプ・採点ロジック（中身はここを編集）
│   │   ├── routeQuery.ts        # /route クエリのエンコード/デコード（機能2の差し込み口）
│   │   ├── ors.ts               # ORS API クライアント（Matrix / Directions）
│   │   ├── tsp.ts               # 自前TSP（全探索 / 最近傍法）
│   │   ├── supabase/client.ts   # Supabase ブラウザクライアント（lazy singleton）
│   │   ├── supabase/server.ts   # Supabase サーバークライアント（/api/photos 用、anonキー）
│   │   ├── auth.ts              # 匿名認証 + プロフィールのヘルパー
│   │   ├── imageResize.ts       # 投稿写真のクライアント側縮小（長辺1600px JPEG）
│   │   ├── spotSearch.ts        # スポット部分一致検索（正規化付き）
│   │   ├── spots.ts             # スポットマスタの単一参照点（debug/fullモード切替 + spotNameOf）
│   │   ├── spotTags.ts          # tags をジャンル大分類・同行者の2軸へ実行時解釈（/select フィルター）
│   │   ├── survey.ts            # 機能4: アンケート設問の正本（クライアント/サーバー共有。9問+説明文+回答済みキー）
│   │   ├── selectState.ts       # /select 選択状態の sessionStorage キー
│   │   └── photoUrl.ts          # Storage 公開URLヘルパー
│   └── types/
│       ├── spot.ts              # Spot 型
│       ├── route.ts             # RouteResult / RouteSegment 型
│       ├── departure.ts         # DeparturePoint 型 + PRESET_DEPARTURES
│       └── post.ts              # Profile / Post / Trip / TripEntry / TripDraft 型
├── .env.local                   # APIキー（Git管理外）
├── src/middleware.ts            # /admin/* を Basic 認証でガード（ADMIN_USER / ADMIN_PASSWORD）
├── next.config.mjs              # Google画像・Supabase Storage の remotePatterns 設定
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

### 背景演出のパフォーマンス方針（重い手法を再導入しない）

v2-souデザインの初期実装は動作が重く、以下を禁止手法として軽量化した経緯がある:

- **大きな要素への `filter: blur()`**: ブロブの柔らかさは「端が透明にフェードする radial-gradient」で表現する（`globals.css` 冒頭のコメント参照）
- **`backdrop-filter`（すりガラス）**: スクロールごとに背後の再ぼかしが走る。不透明度高め（.92〜.95）の単色背景で代替する
- **`mix-blend-mode`**: 全画面の再合成を強いる。グレインは通常合成 + 低opacityで十分
- **カーソル追従パララックス（rAFループ）**: 毎フレームJSが走る。背景の動きはCSSアニメーション（transform のみの drift と小さなリングの morph）に限定する

### Next.js は Route Handler 内の fetch をキャッシュする（写真APIで実害が出た）

Next.js 14 は GET Route Handler と、その中で実行される `fetch`（**supabase-js が内部で使う fetch も含む**）をデフォルトで Data Cache に載せる。このため `/api/photos` で「投稿を削除したのに /select に写真が残り続ける」「Google 写真URLがキャッシュされ規約違反になる」事故が起きた（2026-06-12）。

対策（両方必要）:
- Route Handler に `export const dynamic = "force-dynamic"` を宣言する
- 外部 fetch に `cache: "no-store"` を付ける。supabase-js は `createClient(..., { global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) } })` で素通しにする（`src/lib/supabase/server.ts`）

サーバー側で新しい外部APIや supabase クエリを追加するときは、毎回この点を確認すること。

### .env.local を変更したら dev サーバーを再起動する

`npm run dev` 実行中に `.env.local` を書き換えても、Next.js の dev サーバーは環境変数をホットリロードしない。変更後は一度サーバーを止めて `npm run dev` し直す。

---

## 12. 進め方の鉄則

1. 各作業は `npm run dev` で動作確認してから commit する。
2. AI が書いたコードの全体構造は人間が把握する。バグ修正の丸投げで無限ループにしない。
3. 機能2・3の中身は作り込まない（差し込み口だけ用意済み）。
4. API キーは `.env.local` で管理。`.gitignore` に `.env*` が入っていることを確認する。
5. 機能を追加して、その内容がREADME.mdに記載されていなかったら追記する。
6. 細かい修正であってもブランチを切ってから、修正をする。mainは常に安定版を置くようにする。

### Git / GitHub 運用

- `main` は常に「動く状態」を保つ幹とする。
- 機能単位でブランチを切る（例: `feature/departure`, `feature/toll-ui`）。
- `npm run dev` で動作確認できたら commit して `main` にマージし、push する。
- ビルドが通らない状態・動作未確認のコードは push しない。
- 細かい修正であってもブランチを切ってから、修正をする。mainは常に安定版を置くようにする。

---

## 13. 環境変数（.env.local）

```
GOOGLE_PLACES_API_KEY=（Places API (New) 有効化済み。APIキーの制限は「なし」か「IPアドレス」に設定）
ORS_API_KEY=（openrouteservice.org で発行した新形式トークン。旧 eyJ... 形式は不可）
NEXT_PUBLIC_SUPABASE_URL=（Supabase の Project URL。機能3用）
NEXT_PUBLIC_SUPABASE_ANON_KEY=（Supabase の anon / publishable key。公開前提のキーで防壁はRLS）
NEXT_PUBLIC_SPOTS_MODE=（debug=13件（開発用・既定） / full=約200件。Vercel は full を設定）
ADMIN_USER=（管理者ページ /admin/* の Basic 認証ユーザー。省略時 "admin"）
ADMIN_PASSWORD=（同パスワード。未設定だと開発は素通し・本番は 503。本番は必ず設定）
SURVEY_WEBHOOK_URL=（機能4アンケートの Apps Script Web App の URL。NEXT_PUBLIC は付けない＝サーバー専用。未設定だと /api/survey は 500）
```

- `NEXT_PUBLIC_` の2つはブラウザから supabase-js で直アクセスするため必須。**service_role key は使わない・どこにも置かない**。
- `ADMIN_*` は `src/middleware.ts` が `/admin/*` の Basic 認証に使う（サーバー側ガード）。管理者ページはナビに載せない。
- `SURVEY_WEBHOOK_URL` は Apps Script Web App の URL。**NEXT_PUBLIC を付けない**（サーバー専用で秘匿）。設定手順は `scripts/survey-apps-script.gs` 冒頭のコメント参照。
- Vercel デプロイ時は同じ変数を Vercel の Environment Variables にも設定する。
- `.gitignore` に `.env*` が含まれていることを必ず確認する。

---

## 14. 機能3（写真投稿）の設計

詳細な手順・SQLは `supabase/SETUP.md` / `supabase/schema.sql` が正本。ここでは設計判断だけ記録する。

### 認証 — 匿名認証＋ニックネーム（遅延発火）

- メール等の個人情報は集めない（演習アプリの倫理面配慮）。閲覧はログイン不要。
- **投稿ボタンを押した瞬間**に `signInAnonymously()` → profiles 未作成なら `NicknameModal` を挟む（`ensureSignedInWithProfile()`、`src/lib/auth.ts`）。無駄な匿名MAUを増やさないため `/me` 直アクセス等では発火しない。
- セッションは localStorage 永続化（同一ブラウザ = 同一ユーザー。ブラウザデータ削除で別ユーザーになる点は演習として許容）。
- 将来 Google ログインを足す場合は `linkIdentity()` で user_id 不変のまま紐付け可能（スキーマ変更不要）。

### DB（4テーブル + RLS）

- `profiles`（ニックネーム）/ `posts`（単体投稿）/ `trips`（旅記録）/ `trip_entries`（順番付き訪問エントリ）。
- RLS: 読み取りは全公開、書き込みは本人のみ。FK は `profiles(id)` に張り `select('*, profiles(nickname)')` で投稿者名を1クエリ展開。
- **spot_id は spots.json の文字列IDを text 保存（正規化しない）**。マスタはGit管理のJSONが正本。**公開後の spots.json の id は変更・削除しない**こと（リネームは name のみ）。
- `trips.route_query` に `encodeRouteQuery` 文字列を保存（ルート画面起点のみ）→ 詳細ページから `/route?{route_query}` でルート画面を丸ごと再利用できる。

### Storage

- Public バケット `photos`、パスは `{user_id}/{uuid}.jpg`。DBにはパスのみ保存し、URL化は `publicPhotoUrl()`（`src/lib/photoUrl.ts`）に集約。
- **アップロード前に切り抜き調整 → 長辺1600px・JPEG(0.82)化**（`CropModal` + `src/lib/imageResize.ts`）。ファイル選択後に react-easy-crop のモーダルでドラッグ/ピンチ/スライダーで表示範囲を調整できる（自動の中央切り抜きへの違和感からのユーザー要望、2026-06-12）。元ファイルは PhotoUploadField が保持し「範囲を調整」で何度でも切り抜き直せる。縮小は無料枠1GB保護のため省略不可。
- **切り抜き枠は「縦 4:5」「横 4:3」の切替式で、写真の向きから自動初期選択**する。縦4:5は /select グリッドのカードと同じ比率（縦長写真を横枠に強制すると、グリッド表示時に二重切り抜きになって画質と構図が損なわれるため。ユーザー指摘、2026-06-12）。「切り抜かずに元の比率のまま使う」も選べる（`resizeImageToJpeg`）。
- **固定枠で再度切るのはグリッドのカード（4:5 object-cover）だけ**。投稿プレビュー・旅記録詳細は投稿された縦横比のまま表示する（`UserPhoto` の `natural` モード）。サムネ（一覧・マイページの正方形）は fill のまま。
- 投稿写真は自前ストレージなので Google 規約の制約外（保存・地図表示も可）。セクション5のGoogle写真ルールはそのまま。

### データアクセス

- Next.js API Route を介さず**ブラウザから supabase-js 直接**（`src/lib/supabase/client.ts` の `getSupabase()`）。書き込み保護はRLSで完結し、API Routeを挟んでも防御は増えないため。
- 複数テーブル書き込み（旅記録）は「①写真全アップロード → ②trips insert → ③trip_entries insert、③失敗時は trips を delete」の順序で原子性を代替する。

### スポット検索

- `src/lib/spotSearch.ts`: NFKC正規化 + 小文字化 + カタカナ→ひらがな + 空白除去 してから name/description を部分一致。「ちーず」→チーズガーデン、文中の語でもヒット。200件規模でもクライアント filter で十分（1ms未満）。

### /route → 旅記録のプレフィル受け渡し

- URL の `spots=` は**選択順であって TSP 後の訪問順ではない**ため、`/route` の「この旅を記録する」押下時に sessionStorage キー `nasu-trip-draft`（`TripDraft` 型、`src/types/post.ts`）へ訪問順 spotIds + routeQuery を保存し、**`/trips/new?from=route` へ遷移**する。
- `/trips/new` は **`?from=route` があるときだけ**下書きを読んでプレフィルする（URLにフラグがあるためリロードしても維持される）。**クエリなし（ホーム経由）では常に白紙**で、残っている下書きも破棄する — 前に設計したルートが意図せず復活しないため（ユーザー要望、2026-06-12）。投稿完了時にも削除、24時間で失効。

### 投稿写真の /select グリッド掲載（許可制）

- 投稿者がアップロード時に「スポット選択の画像に使ってもOK」を選べる（`GridConsentCheckbox`、**初期値ON**）。単体投稿は `posts.show_in_grid`、旅記録は**投稿単位で1つ** `trips.show_in_grid`（エントリごとではない）。
- `GET /api/photos/[spotId]` が Google 写真（最大1枚）と許可済み投稿写真（最大4枚、posts と trip_entries の両方から）をマージして返す。APIのキーは placeId から **spots.json の id に変更済み**（投稿写真は placeId と無関係のため）。
- SpotCard は複数枚をカルーセル表示（右端の上下ボタン + n/m カウンタ）。クレジットは写真ごとに切替: Google写真=撮影者名 + Google（規約上必須）、投稿写真=ニックネーム。
- **最初に表示する写真はランダム選出**（Google+投稿写真から。ユーザー確認済みの方針: 写真ごとにカードを増やすのではなく1スポット=1カードを維持し、訪れるたびに違う一枚が出ることで「写真が増えて画面が変わる」体験を作る）。**シャッフルボタンで表示写真も選び直す**（select ページ→SpotGrid→SpotCard へ `shuffleNonce` を渡す。カードは key=spot.id で再マウントされないため nonce 変化をトリガーにし、写真の再取得はしない）。
- カード全体は `<div role="button">`（内側に写真送りの `<button>` を置くため。`<button>` のネストはHTML不正）。
- 既存DBへの適用は `supabase/migration-002-grid-photos.sql`（新規プロジェクトは schema.sql に含まれる）。

### マイページ（/me）

- 自分の投稿の確認・**編集は文章と掲載許可のみ**（posts: caption/show_in_grid、trips: title/comment/show_in_grid。ユーザー確認済みの方針）。写真の差し替え・エントリ並べ替えは「削除して再投稿」で代替（`unique(trip_id, position)` の並べ替え衝突を避ける設計判断のまま）。
- 削除は DB 行 + Storage の写真を両方消す（旅記録は entries が cascade、写真はまとめて remove）→ 写真APIは毎回DBを引くため /select グリッドからも自動で消える。
- UPDATE の RLS は `supabase/migration-003-mypage-edit.sql`（新規プロジェクトは schema.sql に含まれる）。
- このページでは匿名サインインを発火しない（セッションがなければ空状態表示。ニックネーム変更モーダルの保存時のみ発火）。

---

## 15. 機能4（使用感アンケート）の設計

利用者アンケートを**アプリ内**で取る。Googleフォームへのリンクではなくアプリ内実装を選んだ理由: 別タブ/アプリ起動という画面遷移が最大の離脱要因（特にスマホ）で、「工程を増やさない・回答率を上げる」に反するため。フォーム体験は保存先に依存しないので、**保存先だけ Google スプレッドシート**にしている（集計・班での共有が楽・Supabase無料枠を消費しない、というユーザー判断）。

### 保存フロー（ブラウザ → 自前API → Apps Script → シート）

- `/survey` のフォーム送信 → 同一オリジンの `POST /api/survey`（`src/app/api/survey/route.ts`）→ サーバーが `SURVEY_WEBHOOK_URL`（Apps Script Web App）へサーバー間 POST → シートに1行追記。
- **サーバー経由なので CORS 不要**で、Web App URL も環境変数で秘匿できる（ブラウザから直接 Apps Script は叩かない）。
- **認証なし・完全匿名**（Supabase を一切使わない）。ニックネームも要らないので、答える以外の工程はゼロ。
- Route Handler の fetch キャッシュ対策（セクション11）を踏襲: `dynamic = "force-dynamic"` + 外部 fetch に `cache: "no-store"`。
- APIルートで 3問（satisfaction/ease_of_use/recommend）を 1–5 の整数として検証し、自由記述は1000字に切り詰めてから転送する。

### 設問・UI

- 実証実験用の**9問**: Q1 年代 / Q2 那須訪問回数（単一選択）、Q3 使いたいか / Q4 デザイン魅力 / Q5 ルート適切 / Q6 また訪れたいか（**5段階・共通ラベルで統一**＝シートで横並び比較しやすい）、Q7 認知経路（単一選択）＝ここまで必須7問。Q8 良かった/気になった点 / Q9 ほしい機能・改善点（自由記述・任意）。
- 設問の正本は `src/lib/survey.ts`（**クライアントとAPIルートで共有**＝サーバーでも同じ定義で検証）。設問タイプは `single`（単一選択）/ `scale`（5段階）/ `text`（自由記述）。**差し替え時は `scripts/survey-apps-script.gs` の HEADER と順序も合わせる**。
- 保存値は**選択肢のラベル文字列**（5段階も共通ラベル）と自由記述テキストをそのまま列に入れる。冒頭に説明文（`SURVEY_INTRO`）を表示。
- 選択肢UIは `/diagnosis` の5件法、フォームの器は `/post` のスタイルを流用。世界観は PageShell 共通（06 — SURVEY）。
- 必須は7問（★表示）。すべて回答すると送信可。工程を軽くするため送信は1発（編集・削除UIは持たない）。

### 導線（回答率の要）

- 再利用CTA `SurveyPrompt`（`src/components/SurveyPrompt.tsx`）を**完了・閲覧地点**に置く: `/route`（タイムライン下）・`/diagnosis`（結果下）・`/post`（完了画面）・`/trips`・`/trips/[id]`。NavMenu にも常設。
- CTA から `/survey?from=<route|diagnosis|post|trips>` へ遷移し、`from` を回答に添付（ユーザーに追加質問せず「どこから来たか」を取得）。NavMenu からは `from` 空。
- 一度送信すると localStorage `nasu-survey-answered` が立ち、**全ページの CTA を自動で隠す**（しつこく出さない）。再回答は `/survey` 直アクセスで可能。

### 集計・セットアップ

- 回答は Google スプレッドシート（`responses` シート）に溜まる。閲覧・グラフ・共有はスプレッドシート上で行う（アプリ内の集計画面は作らない）。
- Apps Script のコードと**デプロイ手順は `scripts/survey-apps-script.gs` 冒頭のコメント**が正本。発行された Web App URL を `.env.local` と Vercel の `SURVEY_WEBHOOK_URL` に設定する（`.env.local` 変更後は dev サーバー再起動）。
