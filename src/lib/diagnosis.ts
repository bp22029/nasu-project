/**
 * 機能2「那須旅診断」— 診断のデータと採点ロジック
 *
 * 4軸 × 各4問（計16問）の5件法（Likert）診断。各軸の合計スコアで2極のどちらかに振り分け、
 * 4軸の組み合わせ（2^4 = 16通り）で1つの「旅タイプ（動物）」に確定する。
 *
 * ■ 4つの軸（★は逆転項目 = スコア反転）
 *   ① 計画(plan) ↔ 即興(improv)      … 行動スタイル
 *   ② 刺激(stim) ↔ 癒し(heal)         … 求める体験
 *   ③ 内向(intro) ↔ 外向(extro)       … 人との関わり
 *   ④ 体験(exp)  ↔ 形(form)           … 思い出の残し方
 *
 * ■ タイプコードの作り方
 *   各軸のスコア(最大±8)が「正の極」なら正極の文字、負なら負極の文字を採る。
 *   正極: ① plan='p' / ② heal='h' / ③ intro='n' / ④ form='f'
 *   負極: ① improv='i' / ② stim='s' / ③ extro='e' / ④ exp='x'
 *   4文字を [①②③④] の順に連結 → 例 "phnx" = 計画×癒し×内向×体験（＝ひつじ）。
 *   ※ スコア 0（同点）は正極に倒す（決定的。Math.random は使わない）。
 *
 * ■ 編集のしかた（中身はここを書き換える）
 *   - タイプの name / tagline / description は仮テキスト。DIAGNOSIS_TYPES を編集して差し替える。
 *   - 画像は public/diagnosis-types/*.png（data/image からコピー。ファイル名がコードを表す）。
 *   - 質問文を変えるときは QUESTIONS を編集（axisId と reverse は軸の割り当てなので原則触らない）。
 *
 * ■ genres について（今は未使用・将来の差し込み口）
 *   各タイプの genres は spotTags.ts の GENRE_LABELS の部分集合（各極から機械的に導出した暫定値）。
 *   今回の画面では使わないが、将来「診断結果でルートをつくる」で spotMatchesTags(spot, genres) に渡す想定。
 */
import { GENRE_LABELS } from "@/lib/spotTags";

/** 軸の極（片側） */
export interface Pole {
  /** タイプコードの1文字（p/i, h/s, n/e, f/x） */
  key: string;
  /** 表示ラベル（計画 / 即興 …） */
  label: string;
}

/** 診断の1軸 */
export interface Axis {
  id: string;
  emoji: string;
  /** 軸名（例: 計画 ↔ 即興） */
  title: string;
  /** 正極（逆転でない設問への「当てはまる」が寄る側）。スコア>=0 のとき採用 */
  positive: Pole;
  /** 負極。スコア<0 のとき採用 */
  negative: Pole;
}

export const AXES: Axis[] = [
  {
    id: "plan",
    emoji: "🧠",
    title: "計画 ↔ 即興",
    positive: { key: "p", label: "計画" },
    negative: { key: "i", label: "即興" },
  },
  {
    id: "desire",
    emoji: "🌿",
    title: "刺激 ↔ 癒し",
    // 逆転でない設問（Q5・Q6）は「癒し」に寄るため、正極 = 癒し
    positive: { key: "h", label: "癒し" },
    negative: { key: "s", label: "刺激" },
  },
  {
    id: "social",
    emoji: "👥",
    title: "内向 ↔ 外向",
    positive: { key: "n", label: "内向" },
    negative: { key: "e", label: "外向" },
  },
  {
    id: "value",
    emoji: "🎁",
    title: "体験 ↔ 形",
    // 逆転でない設問（Q13・Q14）は「形」に寄るため、正極 = 形
    positive: { key: "f", label: "形" },
    negative: { key: "x", label: "体験" },
  },
];

/** 5件法の選択肢（+2 〜 -2）。逆転項目はスコアを反転して集計する */
export const LIKERT_OPTIONS: { label: string; value: number }[] = [
  { label: "とても当てはまる", value: 2 },
  { label: "やや当てはまる", value: 1 },
  { label: "どちらでもない", value: 0 },
  { label: "あまり当てはまらない", value: -1 },
  { label: "全く当てはまらない", value: -2 },
];

/** 1軸あたりの設問数（=各軸の満点 2×4=8 の根拠） */
export const QUESTIONS_PER_AXIS = 4;
export const AXIS_MAX = QUESTIONS_PER_AXIS * 2; // 8

export interface LikertQuestion {
  id: string;
  /** 属する軸（AXES.id） */
  axisId: string;
  /** 設問文 */
  text: string;
  /** 逆転項目（★）。true ならスコアを反転して集計 */
  reverse: boolean;
}

/** 16問（4軸 × 4問）。設問文はユーザー提供のまま */
export const QUESTIONS: LikertQuestion[] = [
  // ① 計画 ↔ 即興
  { id: "q1", axisId: "plan", reverse: false, text: "1日の流れをある程度イメージしてから行動することが多い" },
  { id: "q2", axisId: "plan", reverse: false, text: "やるべきことは順番や優先順位を決めて進めたい" },
  { id: "q3", axisId: "plan", reverse: true, text: "予定外の出来事が起きると、それを楽しめることが多い" },
  { id: "q4", axisId: "plan", reverse: true, text: "空いた時間は、その時の気分で自由に使いたい" },
  // ② 刺激 ↔ 癒し
  { id: "q5", axisId: "desire", reverse: false, text: "休日はリラックスできる時間を重視したい" },
  { id: "q6", axisId: "desire", reverse: false, text: "自然や落ち着いた空間で過ごすと満足感が高い" },
  { id: "q7", axisId: "desire", reverse: true, text: "新しい体験やワクワクすることに強く惹かれる" },
  { id: "q8", axisId: "desire", reverse: true, text: "多少忙しくても充実感のある一日を過ごしたい" },
  // ③ 内向 ↔ 外向
  { id: "q9", axisId: "social", reverse: false, text: "大人数で過ごすより、少人数や一人の時間が好き" },
  { id: "q10", axisId: "social", reverse: false, text: "静かな環境で過ごすと落ち着く" },
  { id: "q11", axisId: "social", reverse: true, text: "人と一緒にいるとエネルギーが湧いてくる" },
  { id: "q12", axisId: "social", reverse: true, text: "初対面の人とも比較的気軽に話せる" },
  // ④ 体験 ↔ 形
  { id: "q13", axisId: "value", reverse: false, text: "思い出は形として残る方が嬉しいと感じる" },
  { id: "q14", axisId: "value", reverse: false, text: "お土産や写真など、後から見返せるものを大切にしたい" },
  { id: "q15", axisId: "value", reverse: true, text: "その場の体験や感情の方が価値があると感じる" },
  { id: "q16", axisId: "value", reverse: true, text: "記録よりも、その瞬間の空気や時間を大切にしたい" },
];

export interface DiagnosisType {
  /** 4文字コード（例: "phnx"）。[計画][刺激/癒し][内向/外向][体験/形] の順 */
  code: string;
  /** マスコット動物名（日本語） */
  animal: string;
  /** 画像パス（public/ 配下） */
  image: string;
  /** タイプ名（※仮。差し替え可） */
  name: string;
  /** キャッチコピー（※仮） */
  tagline: string;
  /** 説明文（※仮） */
  description: string;
  /** 将来のルート連携で使うジャンル候補（GENRE_LABELS の部分集合。暫定値） */
  genres: string[];
}

// 各極 → おすすめジャンルの暫定マップ（genres の自動導出用。将来のルート連携の初期値）
const POLE_GENRES: Record<string, string[]> = {
  h: ["温泉・サウナ", "自然・公園"],        // 癒し
  s: ["レジャー・体験"],                    // 刺激
  f: ["ショップ・雑貨", "美術館・博物館"],  // 形（残せるもの）
  x: ["カフェ", "食事処"],                  // 体験（その場を味わう）
};

function genresForCode(code: string): string[] {
  const set = new Set<string>();
  for (const ch of code) {
    for (const g of POLE_GENRES[ch] ?? []) set.add(g);
  }
  // GENRE_LABELS の定義順にそろえる（存在するものだけ）
  return GENRE_LABELS.filter((g) => set.has(g));
}

// タイプ定義の素（name/tagline/description は仮テキスト。ここを編集して本番の文言にする）
const TYPE_SEED: { code: string; image: string; animal: string; name: string; tagline: string; description: string }[] = [
  { code: "psnx", image: "/diagnosis-types/01_psnx_horse.png",      animal: "馬",         name: "ひとり絶景ハンター", tagline: "計画×刺激×内向×体験", description: "段取りは立てつつ、心が動く体験を静かに追いかけるあなた。刺激的なスポットを自分のペースで巡る旅が似合います。" },
  { code: "psnf", image: "/diagnosis-types/02_psnf_squirrel.png",   animal: "ニホンリス", name: "きっちり発見コレクター", tagline: "計画×刺激×内向×形", description: "気になったものはしっかり記録に残したい派。計画的に刺激的な場所を回り、写真やお土産で思い出を集めます。" },
  { code: "psex", image: "/diagnosis-types/03_psex_goat.png",       animal: "ヤギ",       name: "冒険ルートナビゲーター", tagline: "計画×刺激×外向×体験", description: "みんなを巻き込んで刺激的な体験へ。段取り上手で、その場の盛り上がりも大事にするアクティブタイプ。" },
  { code: "psef", image: "/diagnosis-types/04_psef_duck.png",       animal: "アヒル",     name: "思い出シェアマスター", tagline: "計画×刺激×外向×形", description: "計画的に人と刺激を楽しみ、記念もきっちり残す。にぎやかで思い出づくり上手な旅人。" },
  { code: "phnx", image: "/diagnosis-types/05_phnx_sheep.png",      animal: "ヒツジ",     name: "しずか湯めぐり人", tagline: "計画×癒し×内向×体験", description: "予定は決めつつ、静かな温泉や森カフェでゆっくり“ととのう”のが理想。落ち着いた那須を味わうタイプ。" },
  { code: "phnf", image: "/diagnosis-types/06_phnf_rabbit.png",     animal: "うさぎ",     name: "ていねい癒し収集家", tagline: "計画×癒し×内向×形", description: "穏やかな時間を大切にしながら、写真やお土産で思い出を残す。静かに満たされる旅を好みます。" },
  { code: "phex", image: "/diagnosis-types/07_phex_alpaca.png",     animal: "アルパカ",   name: "ほっと湯めぐり案内人", tagline: "計画×癒し×外向×体験", description: "計画的に癒しスポットを巡りつつ、人との時間も楽しむ。のんびり系だけど社交的なタイプ。" },
  { code: "phef", image: "/diagnosis-types/08_phef_cow.png",        animal: "牛",         name: "ぬくもりアルバム係", tagline: "計画×癒し×外向×形", description: "穏やかな時間をみんなで過ごし、しっかり記念に残す。あたたかい思い出づくりが得意な旅人。" },
  { code: "isnx", image: "/diagnosis-types/09_isnx_redpanda.png",   animal: "レッサーパンダ", name: "きまぐれ探検家", tagline: "即興×刺激×内向×体験", description: "その時の気分で刺激的な体験へ飛び込むあなた。ひとりで気ままに、心の動くままに那須を冒険します。" },
  { code: "isnf", image: "/diagnosis-types/10_isnf_guineapig.png",  animal: "モルモット", name: "ひらめきコレクター", tagline: "即興×刺激×内向×形", description: "ノープランでも刺激を求めて動き、良い瞬間は逃さず記録。自由だけど思い出はしっかり残すタイプ。" },
  { code: "isex", image: "/diagnosis-types/11_isex_otter.png",      animal: "コツメカワウソ", name: "ノリノリ冒険隊長", tagline: "即興×刺激×外向×体験", description: "その場のノリでみんなと刺激を楽しむ、フットワーク抜群の旅人。予定より“今この瞬間”を大切に。" },
  { code: "isef", image: "/diagnosis-types/12_isef_penguin.png",    animal: "ペンギン",   name: "しゅんかんシェアラー", tagline: "即興×刺激×外向×形", description: "気の向くままに食べ歩き＋写真スポット巡り。にぎやかに刺激を楽しみ、映える記録も残す欲張りタイプ。" },
  { code: "ihnx", image: "/diagnosis-types/13_ihnx_deer.png",       animal: "シカ",       name: "のんびり散歩びと", tagline: "即興×癒し×内向×体験", description: "決めすぎず、気分で静かな癒しスポットへ。ひとり時間と自然の空気を味わう、ゆるやかな旅を好みます。" },
  { code: "ihnf", image: "/diagnosis-types/14_ihnf_jerseycow.png",  animal: "ジャージー牛", name: "まったりごほうび集め人", tagline: "即興×癒し×内向×形", description: "行き当たりばったりでも癒しを大切に、お気に入りは写真に残す。マイペースに満たされるタイプ。" },
  { code: "ihex", image: "/diagnosis-types/15_ihex_donkey.png",     animal: "ロバ",       name: "ゆる旅なかまナビゲーター", tagline: "即興×癒し×外向×体験", description: "計画より流れにまかせ、人とのんびり癒しの時間を。寄り道しながら那須を楽しむおおらかなタイプ。" },
  { code: "ihef", image: "/diagnosis-types/16_ihef_capybara.png",   animal: "カピバラ",   name: "ほのぼの記録隊", tagline: "即興×癒し×外向×形", description: "気ままにみんなと癒しを味わい、思い出もちゃんと残す。とことんリラックスを楽しむ癒し系旅人。" },
];

/** タイプコード → タイプ定義 */
export const DIAGNOSIS_TYPES: Record<string, DiagnosisType> = Object.fromEntries(
  TYPE_SEED.map((t) => [t.code, { ...t, genres: genresForCode(t.code) }])
);

/** 1軸の集計結果 */
export interface AxisResult {
  axisId: string;
  title: string;
  /** 優勢だった極（タイプコードに使う。正極 or 負極） */
  pole: Pole;
  /** 左に表示する極（正極） */
  positive: Pole;
  /** 右に表示する極（負極） */
  negative: Pole;
  /** 正極（左）側の比率 %。負極側と合わせて必ず 100 になる */
  positivePercent: number;
  /** 負極（右）側の比率 %（= 100 - positivePercent） */
  negativePercent: number;
  /** 合計スコア（-8〜+8。正極方向が正） */
  score: number;
}

export interface DiagnosisResult {
  type: DiagnosisType;
  axes: AxisResult[];
}

/**
 * 全16問の回答値（各 -2〜+2、QUESTIONS と同じ並び）から結果を算出する。
 * 逆転項目はスコアを反転して軸ごとに合計 → 正極/負極を決定 → 4文字コードでタイプ確定。
 */
export function computeResult(values: number[]): DiagnosisResult {
  const axes: AxisResult[] = AXES.map((axis) => {
    let score = 0;
    QUESTIONS.forEach((q, i) => {
      if (q.axisId !== axis.id) return;
      const v = values[i] ?? 0;
      score += q.reverse ? -v : v;
    });
    // score -8〜+8 を「正極側の比率 0〜100%」に線形変換（score 0 = 50/50 の互角）
    const positivePercent = Math.round(((score + AXIS_MAX) / (2 * AXIS_MAX)) * 100);
    const pole = score >= 0 ? axis.positive : axis.negative;
    return {
      axisId: axis.id,
      title: axis.title,
      pole,
      positive: axis.positive,
      negative: axis.negative,
      positivePercent,
      negativePercent: 100 - positivePercent,
      score,
    };
  });

  const code = axes.map((a) => a.pole.key).join("");
  const type = DIAGNOSIS_TYPES[code];
  return { type, axes };
}
