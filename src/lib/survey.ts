/**
 * 使用感アンケートの設問定義（機能4）— クライアント／サーバー共有
 *
 * このファイルは "use client" を持たない純データなので、フォーム（src/app/survey/page.tsx）と
 * 検証を行う API ルート（src/app/api/survey/route.ts）の両方から import する
 *（サーバーでも同じ設問で検証できる = 単一の正本）。
 *
 * 保存先は Google スプレッドシート（Apps Script Web App）。回答は選択肢のラベル文字列
 * （5段階は共通ラベルで統一 → シートで4問を横並び比較しやすい）と自由記述テキストを
 * そのまま列に入れる。設問を増減したら **Apps Script（scripts/survey-apps-script.gs）の
 * HEADER と appendRow も key の順に合わせて更新する**こと。
 */

/** 回答済みフラグ（localStorage）。立っていると全ページの導線CTAを隠す */
export const SURVEY_ANSWERED_KEY = "nasu-survey-answered";

/** フォーム冒頭の説明文 */
export const SURVEY_INTRO =
  "このアンケートは、芝浦工業大学大学院の授業の一環として作成した那須町観光アプリ #NASU の実証実験へのご協力のお願いです。回答は1分程度で終わります。個人を特定する情報はお伺いしません。";

/** 5段階評価の共通ラベル（設問3〜6 で統一。左＝肯定 → 右＝否定） */
export const SCALE_OPTIONS = [
  "とてもそう思う",
  "そう思う",
  "どちらともいえない",
  "あまりそう思わない",
  "まったくそう思わない",
] as const;

export type SurveyQuestionType = "single" | "scale" | "text";

export interface SurveyQuestion {
  /** サーバー送信 & シート列のキー */
  key: string;
  /** 設問文 */
  label: string;
  type: SurveyQuestionType;
  /** 必須か（text は任意にできる。single/scale は基本必須） */
  required: boolean;
  /** single / scale の選択肢（ラベルをそのまま保存） */
  options?: readonly string[];
  /** text の最大文字数 */
  maxLength?: number;
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: "age",
    label: "あなたの年代を教えてください。",
    type: "single",
    required: true,
    options: ["10代", "20代", "30代", "40代", "50代", "60代以上"],
  },
  {
    key: "visits",
    label: "那須町に何回訪れたことがありますか。",
    type: "single",
    required: true,
    options: ["0回", "1回", "2回", "3回", "4回以上"],
  },
  {
    key: "want_use",
    label: "今後、那須町を訪れる際にこのアプリを使いたいと思いましたか。",
    type: "scale",
    required: true,
    options: SCALE_OPTIONS,
  },
  {
    key: "design",
    label: "アプリのデザイン（見た目の印象）は魅力的だと感じましたか。",
    type: "scale",
    required: true,
    options: SCALE_OPTIONS,
  },
  {
    key: "route",
    label: "提案されたルート（行き先と回る順番）は適切だと思いましたか。",
    type: "scale",
    required: true,
    options: SCALE_OPTIONS,
  },
  {
    key: "revisit",
    label: "このアプリを使って、那須町を訪れてみたい（また訪れたい）と思いましたか。",
    type: "scale",
    required: true,
    options: SCALE_OPTIONS,
  },
  {
    key: "channel",
    label: "このアプリをどのようにして知りましたか。",
    type: "single",
    required: true,
    options: ["学内アンケート", "現地での呼びかけ", "那須町の観光ページ", "SNS", "その他"],
  },
  {
    key: "good",
    label: "アプリを使ってみて、良かった点や気になった点があれば教えてください。",
    type: "text",
    required: false,
    maxLength: 1000,
  },
  {
    key: "improve",
    label: "今後あったらいいと思う機能や、改善してほしい点があれば教えてください。",
    type: "text",
    required: false,
    maxLength: 1000,
  },
];
