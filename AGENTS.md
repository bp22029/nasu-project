# AGENTS.md — 単体テスト実装ガイド（codex 用）

> このファイルは **テスト担当エンジニア（codex）** への作業指示書である。
> 設計担当が `CLAUDE.md`（プロジェクトの設計ドキュメント）を維持し、
> codex はこのファイルに従って **`src/` のロジックを変えずに単体テストだけを書く**。
> 設計とテストの担当を分けることで、テストが実装の追認になるのを防ぎ、開発の信頼性を担保する。

---

## 0. 最初に読むもの

1. **このファイル（AGENTS.md）** — テストの方針・規約・モック戦略
2. **`CLAUDE.md`** — 各モジュールが「何をするのが正しいか」の仕様。テストの期待値はコードの挙動ではなく**この仕様**から導く。
3. 対象ソース（`src/lib/`, `src/app/api/`, `src/types/`）

---

## 1. 役割と鉄則（必ず守る）

- ✅ **やること**: `src/` の関数・API ルートに対する単体テストを `*.test.ts` として追加する。テスト用の設定ファイル・モックユーティリティの追加も可。
- ❌ **やらないこと**:
  - `src/` 以下の **プロダクションコードの変更**（リファクタ・バグ修正・シグネチャ変更を含む）。
  - `data/*.json`, `CLAUDE.md`, `supabase/`, `next.config.mjs` の変更。
- 🐛 **テストでバグを見つけたら**: 直さない。テストを「現状の誤った挙動に合わせて緑にする」のも禁止。**`CLAUDE.md` の仕様どおりに期待値を書いて失敗させたまま**にし、`TEST_FINDINGS.md`（リポジトリ直下に新規作成）へ「どのテストが・なぜ・どの仕様に反して落ちるか」を箇条書きで報告する。修正は設計担当が行う。
- 🔒 **テストは決定的に**。乱数・現在時刻・ネットワーク・実ファイルI/O・実DBに依存させない（すべてモックする。セクション5）。
- 📦 **外部APIは必ずモック**。実際の ORS / Google Places / Supabase へは1回もアクセスしないこと（APIキー不要でテストが通る状態にする）。

---

## 2. テストフレームワーク（Vitest）

フレームワークは **Vitest** に確定（設計担当の決定。Jest へ変更しないこと）。理由: 本プロジェクトは ESM・`tsconfig` の `paths` エイリアス・`resolveJsonModule` を使っており、Vitest は追加設定なしでこれらを扱え、jsdom 環境を内蔵するため DOM 依存テストも同居できる。

### 2-1. 導入手順

```bash
npm install -D vitest @vitest/coverage-v8 jsdom
```

`package.json` の `"scripts"` に以下を追加する（既存スクリプトは消さない）:

```jsonc
"test": "vitest run",
"test:watch": "vitest",
"test:cov": "vitest run --coverage"
```

### 2-2. `vitest.config.ts`（リポジトリ直下に新規作成）

`@` エイリアスと JSON import（`@/../data/*.json`）を解決させる。テスト環境はデフォルト `node`、DOM が必要なファイルだけ各テスト先頭の `// @vitest-environment jsdom` で個別指定する。

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
```

> `@/../data/spots.json` は alias 置換で `./src/../data/spots.json` = `./data/spots.json` に解決される。Vitest は JSON import を素で扱える。

---

## 3. ファイル配置と命名

- テストは **対象ファイルと同じ階層に併置**する: `src/lib/tsp.ts` → `src/lib/tsp.test.ts`。
- API ルートなど併置しにくいものは `tests/` 配下に置いてよい（`include` で両対応済み）。
- 共有のモック・フィクスチャは `tests/helpers/` に置く（例: `tests/helpers/spotFixtures.ts`、`tests/helpers/fetchMock.ts`）。
- 1テストファイル = 1対象モジュール。`describe` で対象名、`it`/`test` は日本語可で「〜のとき〜になる」と書く。

---

## 4. テスト対象と優先順位

優先度 P1（純粋ロジック・最重要）から着手し、P3 は時間が許せば。

| 優先 | 対象 | 種別 | モック | 主な観点 |
|---|---|---|---|---|
| **P1** | `src/lib/tsp.ts` | 純粋 | 不要 | 出発地(index0)固定・最適順・しきい値分岐・端ケース |
| **P1** | `src/lib/routeQuery.ts` | 純粋 | 不要 | encode/decode 往復・GPS・不正入力 |
| **P1** | `src/lib/spotSearch.ts` | 純粋 | 不要 | 正規化（NFKC/小文字/カナ→かな/空白）・空クエリ |
| **P2** | `src/lib/calculateRoute.ts` | 要モック | `@/lib/ors` | 訪問順の組立・周遊/片道のwaypoints・segments生成・例外 |
| **P2** | `src/lib/ors.ts` | 要モック | `global.fetch`, env | 正常・APIエラー・キー未設定・avoid_tolls 付与 |
| **P2** | `src/lib/spots.ts` | 要モック | env, JSON | モード切替・`spotNameOf` のフォールバック |
| **P2** | `src/app/api/route/route.ts` | 要モック | `@/lib/calculateRoute`, `@/lib/spots` | バリデーション分岐(400)・正常(200)・例外(500) |
| **P3** | `src/app/api/photos/[spotId]/route.ts` | 要モック | `@/lib/spots`, `@/lib/supabase/server`, `fetch` | 400/404・Google+投稿写真マージ・片方失敗時のフォールバック |
| **P3** | `src/lib/photoUrl.ts` | 要モック | `@/lib/supabase/client` | パス→公開URL変換の委譲 |
| **P3** | `src/lib/imageResize.ts` | jsdom+モック | canvas/createImageBitmap | 長辺1600px縮小・JPEG化・デコード不可で例外 |

`src/lib/auth.ts`・`selectState.ts`・React コンポーネント（`*.tsx`）・`Map.tsx` 等は今回の単体テスト対象外（ブラウザ/Leaflet 依存が重く、結合テストの領域）。

---

## 5. モック戦略（API はすべてここで遮断）

### 5-1. ORS（`src/lib/ors.ts`）— `global.fetch` を差し替え

`ors.ts` は素の `fetch` と `process.env.ORS_API_KEY` を使う。

```ts
import { vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.stubEnv("ORS_API_KEY", "test-key");
  global.fetch = vi.fn();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

// 正常系の例
(global.fetch as any).mockResolvedValue({
  ok: true,
  json: async () => ({ durations: [[0, 10], [10, 0]] }),
});
```

検証する観点:
- `getDurationMatrix` が `durations` をそのまま返す。
- `avoidTolls=true` のとき送信 body に `options.avoid_features = ["tollways"]` が入る／`false` のとき入らない（`fetch.mock.calls[0][1].body` を `JSON.parse` して確認）。
- `res.ok=false` のとき `ORS ... エラー <status>` を含むメッセージで throw する。
- `ORS_API_KEY` 未設定（`vi.stubEnv("ORS_API_KEY", "")`）で `getDurationMatrix`/`getDirectionsGeoJSON` 呼び出しが throw する。
- 送る座標が `[lng, lat]` 順であること（`calculateRoute` 側ではなく、ここは locations をそのまま渡すだけなので body 透過を確認）。

### 5-2. `calculateRoute`（`src/lib/calculateRoute.ts`）— `ors` モジュールをモック

ネットワークではなく **モジュール境界**をモックする。

```ts
vi.mock("@/lib/ors", () => ({
  getDurationMatrix: vi.fn(),
  getDirectionsGeoJSON: vi.fn(),
}));
import { getDurationMatrix, getDirectionsGeoJSON } from "@/lib/ors";
```

- `getDurationMatrix` には**決定的な行列**を返させ、TSP が一意な最適順を出すよう、最小コストが同点にならない値にする（同点だと順序が実装依存で脆くなる）。
- `getDirectionsGeoJSON` には `features[0].properties.segments`（区間ごとの `{duration, distance}`）と `properties.summary.{duration, distance}` を持つ最小の GeoJSON 風オブジェクトを返させる。
- 検証: `orderedSpots` が TSP 順に並ぶ／`segments` の `from`/`to` ラベルが出発地→各スポット（→周遊なら出発地）で連結される／周遊時のみ waypoints 末尾に出発地が追加され `getDirectionsGeoJSON` の引数末尾が出発地座標になる／`selectedSpots` が空なら throw する。
- segments の本数は GeoJSON のモック側で決まる。ラベル配列とインデックスがずれないこと（片道 vs 周遊で labels 長が変わる点）を確認する。

### 5-3. `spots.ts` / 環境変数 — **トップレベルで env を読む点に注意**

`spots.ts` は `process.env.NEXT_PUBLIC_SPOTS_MODE` を**モジュール読込時の const 初期化**で評価する。よって env を変えてから**動的 import** し、`vi.resetModules()` で再評価させる。

```ts
import { vi, it, expect } from "vitest";

it("full モードで spots-full.json を使う", async () => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SPOTS_MODE", "full");
  const { SPOTS } = await import("@/lib/spots");
  expect(SPOTS.length).toBeGreaterThan(13);
});
```

- `spotNameOf`: 既知 id で名前を返す／未知 id で `（削除されたスポット）`／debug モードでも full 側にしかない id を正しい名前で返す（フォールバック分岐）。

### 5-4. API ルート — `next/server` はそのまま、依存はモック

`POST /api/route`:
```ts
vi.mock("@/lib/calculateRoute", () => ({ calculateRoute: vi.fn() }));
vi.mock("@/lib/spots", () => ({ SPOTS: [/* 最小のSpot配列 */] }));
```
- `Request` は標準の `new Request("http://t/api/route", { method:"POST", body: JSON.stringify(...) })` で生成。レスポンスは `await res.json()` と `res.status` を検証。
- 観点: `spotIds` 非配列/空 →400／`departure` 欠落 →400／不正 `tripType` →400／有効スポット0件 →400／正常 →200 で `calculateRoute` の戻りが返る／`calculateRoute` が throw →500。

`GET /api/photos/[spotId]`:
```ts
vi.mock("@/lib/spots", () => ({ SPOTS: [{ id:"chausu", placeId:"PID", /* ... */ }] }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServer: vi.fn() }));
global.fetch = vi.fn(); // Google Places 用
```
- 第2引数は `{ params: { spotId: "chausu" } }` を手で渡す。
- 観点: 空 spotId →400／未知 spotId →404／Google写真と投稿写真が**両方** `photos` にマージされる／`getSupabaseServer()` が `null`（env 未設定相当）でも Google 写真だけで 200 が返る／Google fetch が落ちても投稿写真は返る（`Promise.all` + `catch` のフォールバック）。Supabase クライアントは `.from().select().eq()...` のチェーンを返すスタブを作る。

### 5-5. `photoUrl.ts` — supabase クライアントをモック
```ts
vi.mock("@/lib/supabase/client", () => ({
  getSupabase: () => ({ storage: { from: () => ({ getPublicUrl: (p:string) => ({ data:{ publicUrl:`https://x/${p}` }}) }) } }),
}));
```

### 5-6. `imageResize.ts` — jsdom + canvas/Image のモック（P3、難所）

ファイル先頭に `// @vitest-environment jsdom` を置く。jsdom は canvas 描画を持たないため、`HTMLCanvasElement.prototype.getContext`・`toBlob`・`createImageBitmap`・`URL.createObjectURL` を `vi.fn`/`vi.stubGlobal` でスタブする。
- 観点: 長辺が 1600px を超える入力で出力寸法が 1600 に収まる（`canvas.width/height` を検証）／`toBlob` が `null` を返すと「変換に失敗」で reject／`createImageBitmap` も `<img>` もデコード失敗すると「この画像形式は使えません」で reject。
- ここはモックが重いので、**P1/P2 を先に完成させてから**着手する。困難なら `TEST_FINDINGS.md` に「環境制約でスキップ」と理由を残してよい。

---

## 6. テスト設計の指針（観点の出し方）

- **正常系・境界・異常系**を各関数で揃える。特に分岐（`if`/三項/早期 return）は最低1ケースずつ通す。
- `tsp.ts` のしきい値: スポット数（出発地除く）**7件 → 全探索**、**8件 → 最近傍法**の境界をテストする。少数(2〜3件)で手計算した最適順と一致することを確認。出発地が常に order[0] であること。
- `routeQuery.ts`: `encode → decode` の往復で元の入力に戻ること（GPS は `toFixed(6)` で丸まる点を許容）。`spots` 空・`dep` 不正・GPS座標が NaN のとき `{ok:false}` になること。`tolls` は `"0"` 以外すべて回避(true) になる仕様を確認。
- `spotSearch.ts`: 「ちーず」→ チーズガーデン がヒット、空クエリは全件返す、全角/半角・大文字小文字・カタカナ/ひらがなが同一視される。フィクスチャは実 `data` に依存せず**テスト内で組んだ `Spot[]`** を渡す（マスタ変更でテストが壊れないように）。
- 期待値はコードを写経せず、**CLAUDE.md の仕様文**を根拠にコメントで `// 仕様: セクションX` のように紐づける。

---

## 7. 実行と完了条件

```bash
npm test          # 全テスト（CI 相当）
npm run test:cov  # カバレッジ確認
```

完了の基準:
1. `npm test` が**ネットワーク・実APIキーなし**で走る（外部アクセス0）。
2. P1・P2 の対象すべてにテストがある。
3. 落ちるテストが残る場合、それは「実装のバグを示す失敗」だけであり、`TEST_FINDINGS.md` に記録済みであること（テストを通すためにプロダクションコードを書き換えていないこと）。
4. `git diff --stat` で **`src/` ロジックの変更が無い**こと（変更は `*.test.ts`・`vitest.config.ts`・`package.json`・`tests/`・`TEST_FINDINGS.md` に限る）。

---

## 8. やってはいけないこと（再掲・チェックリスト）

- [ ] 実際の ORS / Google / Supabase へアクセスしていないか（全部モックか）。
- [ ] `src/` のロジックを「テストを通すため」に変えていないか。
- [ ] 乱数・時刻・実時間 sleep・実ファイル/DB に依存していないか。
- [ ] フィクスチャを実 `data/*.json` に依存させて、マスタ更新で壊れる作りにしていないか。
- [ ] 落ちるテストを安易に `skip`/期待値改変で緑にしていないか（バグは `TEST_FINDINGS.md` へ）。
