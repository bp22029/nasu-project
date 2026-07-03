/**
 * 使用感アンケートのクライアント側定義（設問・定数）
 *
 * 保存先は Google スプレッドシート（Apps Script Web App）。ブラウザは同一オリジンの
 * `POST /api/survey` にだけ話し、サーバー側がシートへ行追記する（CORS回避・URL秘匿）。
 *
 * 設問文は仮テキスト。差し替えるときはここ（と Apps Script のヘッダー行）を編集する。
 */

/** 回答済みフラグ（localStorage）。立っていると全ページの導線CTAを隠す */
export const SURVEY_ANSWERED_KEY = "nasu-survey-answered";

/** 5段階の設問。選択肢は左（value 5）→右（value 1）の順。 */
export interface SurveyQuestion {
  /** サーバーに送るキー（Apps Script のヘッダー列と対応） */
  key: "satisfaction" | "ease_of_use" | "recommend";
  /** 見出し */
  label: string;
  /** 5択のラベル（index 0 = value 5 … index 4 = value 1） */
  options: [string, string, string, string, string];
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: "satisfaction",
    label: "全体的な満足度",
    options: ["とても満足", "満足", "ふつう", "やや不満", "不満"],
  },
  {
    key: "ease_of_use",
    label: "使いやすさ・分かりやすさ",
    options: ["とても使いやすい", "使いやすい", "ふつう", "使いにくい", "とても使いにくい"],
  },
  {
    key: "recommend",
    label: "友だちにすすめたいか",
    options: ["ぜひすすめたい", "すすめたい", "ふつう", "あまり", "すすめない"],
  },
];

/** 選択肢の index（0..4）→ 送信値（5..1） */
export function optionValue(index: number): number {
  return 5 - index;
}

/** サーバーへ送る回答ペイロード */
export interface SurveyPayload {
  source: string;
  satisfaction: number;
  ease_of_use: number;
  recommend: number;
  free_comment: string;
}
