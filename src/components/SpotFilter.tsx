"use client";

interface SpotFilterProps {
  /** 選択肢（ジャンル大分類） */
  genres: string[];
  /** 選択肢（同行者） */
  parties: string[];
  /** 現在選択中のタグ（ジャンル・同行者を混ぜた集合） */
  active: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}

/** フィルターのチップ（DepartureSelector のチップと同じ配色：選択=深緑 / 未選択=生成り＋枠） */
function chipStyle(isActive: boolean): React.CSSProperties {
  return {
    flexShrink: 0,
    cursor: "pointer",
    background: isActive ? "#2c3e2d" : "rgba(255,255,255,.7)",
    border: `1px solid ${isActive ? "#2c3e2d" : "#e5e0d3"}`,
    borderRadius: "100px",
    padding: "7px 14px",
    fontSize: "12.5px",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    letterSpacing: ".04em",
    color: isActive ? "#f3f1ea" : "#5a7d5a",
    boxShadow: isActive ? "0 10px 22px -14px rgba(36,48,25,.7)" : undefined,
    transition: "background .2s, border-color .2s, color .2s",
  };
}

function FilterGroup({
  label,
  tags,
  active,
  onToggle,
}: {
  label: string;
  tags: string[];
  active: string[];
  onToggle: (tag: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
      <span
        style={{
          flexShrink: 0,
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: ".14em",
          color: "#8fa888",
          padding: "8px 0",
          minWidth: "48px",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {tags.map((tag) => (
          <button key={tag} type="button" onClick={() => onToggle(tag)} style={chipStyle(active.includes(tag))}>
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SpotFilter({ genres, parties, active, onToggle, onClear }: SpotFilterProps) {
  // 利用可能タグが無い（debug モード等）なら何も描画しない
  if (genres.length === 0 && parties.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginBottom: "24px",
        padding: "16px 18px",
        background: "rgba(255,255,255,.55)",
        border: "1px solid #e5e0d3",
        borderRadius: "18px",
      }}
    >
      <FilterGroup label="ジャンル" tags={genres} active={active} onToggle={onToggle} />
      <FilterGroup label="だれと" tags={parties} active={active} onToggle={onToggle} />

      {active.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          style={{
            alignSelf: "flex-start",
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: "2px 0",
            fontSize: "11.5px",
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            letterSpacing: ".06em",
            color: "#8a6d2e",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          条件をクリア（{active.length}）
        </button>
      )}
    </div>
  );
}
