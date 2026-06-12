/**
 * /select の選択状態（sessionStorage）のキー
 *
 * - /select が選択のたびに保存し、/route の「← 選び直す」で戻ったときに復元する
 * - ホームの「はじめる」は**常に新規スタート**としてこのキーを破棄する
 *   （前回の選択が残っていると違和感があるため。ユーザー要望、2026-06-12）
 */
export const SELECT_STATE_KEY = "nasu-select-state";
