"use client";

/**
 * /select グリッドへの掲載許可チェック（機能3）
 *
 * 投稿者がアップロード時に「自分の写真をスポット選択の画像に使ってよいか」を選ぶ。
 * 初期値は ON（許可）で、外したい人だけチェックを外す。
 * 単体投稿（/post）と旅記録（/trips/new、投稿単位で1つ）で共用。
 */

interface GridConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function GridConsentCheckbox({ checked, onChange }: GridConsentCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        background: "rgba(255,255,255,.72)",
        border: "1px solid #e5e0d3",
        borderRadius: "14px",
        padding: "13px 14px",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* チェックマーク */}
      <span
        style={{
          width: "20px",
          height: "20px",
          borderRadius: "6px",
          flexShrink: 0,
          marginTop: "1px",
          display: "grid",
          placeItems: "center",
          background: checked ? "#2c3e2d" : "rgba(255,255,255,.9)",
          border: `1.5px solid ${checked ? "#2c3e2d" : "#b9b49f"}`,
          transition: "background .2s, border-color .2s",
        }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#f3f1ea" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>

      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#2c3e2d", letterSpacing: ".04em" }}>
          写真をスポット選択の画像に使ってもOK
        </span>
        <span style={{ display: "block", fontSize: "11px", color: "#8fa888", marginTop: "3px", lineHeight: 1.7, letterSpacing: ".03em" }}>
          許可すると、スポットを選ぶ画面の写真として表示されることがあります（ニックネーム付き）。
        </span>
      </span>
    </button>
  );
}
