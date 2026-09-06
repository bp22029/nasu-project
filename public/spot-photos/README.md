# 自前スポット写真（Google Places API に依存しない写真ソース）

Google Places API の写真は「保存禁止・毎回動的取得」（CLAUDE.md セクション5）で、
授業用クレジットの終了後は取得できない。ポートフォリオとして公開し続けるため、
**権利がクリアな自前写真をリポジトリに同梱して表示する**ソースを用意している。

## 追加のしかた

1. 画像をこのディレクトリに置く（推奨: 横 1200px 程度・JPEG・4:3 か 4:5）。
   ファイル名は自由だが `{spotId}.jpg` にしておくと対応が分かりやすい。
2. `data/spot-photos.json` にスポットIDをキーとして登録する。

```jsonc
{
  "chausu": [
    { "file": "chausu.jpg", "credit": "9班 現地調査" }
  ],
  "shikanoyu": [
    { "file": "shikanoyu.jpg", "credit": "撮影者名 / CC BY-SA 4.0" }
  ]
}
```

- キーは `data/spots.json` / `data/spots-full.json` の `id`。
- `credit` はカード下部にそのまま表示される。**ライセンス上クレジットが必要な素材
  （Wikimedia Commons の CC BY-SA、Unsplash など）は必ず記入する。**
- 1スポットに複数枚登録すると、カードのカルーセルで送れる。

## 使ってよい素材

- 班の現地調査で撮影した写真（権利が自分たちにある = 最も安全）
- ライセンスが明示されたフリー素材（Wikimedia Commons / Unsplash / 写真AC など）

## 使ってはいけない素材

- **Google Places API から取得した写真のダウンロード・再ホスト**（規約違反）。
  Google 由来の写真は API から動的に取得する経路（`fetchGooglePhotos`）でのみ表示する。
