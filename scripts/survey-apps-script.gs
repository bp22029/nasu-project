/**
 * 使用感アンケートの回答を Google スプレッドシートに1行追記する Apps Script Web App。
 *
 * ── セットアップ手順 ─────────────────────────────────────────
 * 1. 回答をためたい Google スプレッドシートを開く。
 * 2. 拡張機能 → Apps Script を開き、このファイルの中身を丸ごと貼り付ける
 *    （スプレッドシートに紐づく「コンテナバインド」スクリプトにすること。
 *      これで SpreadsheetApp.getActiveSpreadsheet() が対象シートを指す）。
 * 3. 「デプロイ」→「新しいデプロイ」→ 種類=ウェブアプリ。
 *      - 次のユーザーとして実行: 自分
 *      - アクセスできるユーザー: 全員
 *    → 発行された「ウェブアプリの URL」を控える。
 * 4. その URL を Next.js の環境変数 SURVEY_WEBHOOK_URL に設定する
 *    （.env.local と Vercel の Environment Variables の両方。NEXT_PUBLIC は付けない＝サーバー専用）。
 * 5. 設問を増減したら、下の HEADER と doPost の appendRow を合わせて更新する。
 *
 * ※ アプリのブラウザからは直接叩かない。Next.js の /api/survey がサーバー側から
 *   POST する（CORS 回避 + URL 秘匿）。送信本文は JSON。
 * ──────────────────────────────────────────────────────────
 */

var SHEET_NAME = "responses";
// 列の並び。src/lib/survey.ts の設問キーと順序を合わせること（設問を増減したら両方直す）。
var HEADER = [
  "timestamp",
  "source",
  "age",       // Q1 年代
  "visits",    // Q2 那須訪問回数
  "want_use",  // Q3 今後使いたいか（5段階）
  "design",    // Q4 デザインの魅力（5段階）
  "route",     // Q5 ルートの適切さ（5段階）
  "revisit",   // Q6 また訪れたいか（5段階）
  "channel",   // Q7 どこで知ったか
  "good",      // Q8 良かった点・気になった点（自由記述）
  "improve",   // Q9 ほしい機能・改善点（自由記述）
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getSheet_();
    var row = HEADER.map(function (key) {
      if (key === "timestamp") return new Date();
      return data[key] || "";
    });
    sheet.appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** ヘッダー行付きの対象シートを取得（なければ作成） */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADER);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
