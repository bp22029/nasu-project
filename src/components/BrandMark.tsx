/**
 * サービス名「#NASU（ハッシュナス）」のブランド署名。
 *
 * SNS のハッシュタグを連想させるため「#」を要素として見せる（那須＝NASU を内包）。
 * ヘッダー右上（→ホーム）とホームのフッターで共通利用する。
 *
 * - 「#」はアクセント色（やや淡い緑）で、ハッシュタグ記号として認識させる
 * - 「NASU」は本体色。ハッシュタグらしく字間は詰めめ（従来の .4em ベタ組みから変更）
 * - size で 11〜13px を切替（ヘッダーは小さめ、ホームのインデックスラインは少し大きめ）
 */
interface BrandMarkProps {
  /** ハッシュ記号の色（既定: 中間の緑） */
  hashColor?: string;
  /** 文字本体の色（既定: 深い緑） */
  textColor?: string;
  fontSize?: string;
  /** 明朝体（見出しと同じ Shippori Mincho）で組む。大きく見せるホーム上部用 */
  serif?: boolean;
  className?: string;
}

export default function BrandMark({
  hashColor = "#7d9a76",
  textColor = "#2c3e2d",
  fontSize = "13px",
  serif = false,
  className,
}: BrandMarkProps) {
  return (
    <span
      className={className}
      aria-label="ハッシュナス"
      style={{
        fontFamily: serif ? "var(--font-serif)" : "var(--font-sans)",
        fontWeight: serif ? 600 : 700,
        fontSize,
        letterSpacing: serif ? ".04em" : ".1em",
        color: textColor,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ color: hashColor, fontWeight: 600, marginRight: ".04em" }}>#</span>
      NASU
    </span>
  );
}
