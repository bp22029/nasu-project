"use client";

/**
 * 【管理者用】診断タイプ プレビュー（/admin/diagnosis-types）
 *
 * 診断の全16タイプ（動物画像・ラベル）を確認するための内部ツール。
 * - 上部: 4軸の % スライダーを動かすと、その組み合わせに対応するタイプの結果カードを即プレビュー
 *   （各軸 50% を境に正極/負極が切り替わり、4軸 = 2^4 = 16 タイプすべてに到達できる）
 * - 下部: 全16タイプのグリッド一覧（クリックでスライダーがそのタイプに合わせて動く）
 *
 * アクセス制限: /admin/* は src/middleware.ts の Basic 認証でガードしている（ナビには載せない）。
 */
import { useState } from "react";
import Image from "next/image";
import PageShell from "@/components/PageShell";
import { AXES, DIAGNOSIS_TYPES, type DiagnosisType } from "@/lib/diagnosis";

const ALL_TYPES: DiagnosisType[] = Object.values(DIAGNOSIS_TYPES);

// 4軸それぞれの「正極側 %」。50 以上で正極、未満で負極
type Pct = Record<string, number>;
const INITIAL_PCT: Pct = Object.fromEntries(AXES.map((a) => [a.id, 50]));

// スライダーの % 集合 → タイプコード（[軸1][軸2][軸3][軸4]）
function codeFromPct(pct: Pct): string {
  return AXES.map((a) => (pct[a.id] >= 50 ? a.positive.key : a.negative.key)).join("");
}

// あるタイプに一致するよう各軸を 100 / 0 に振る（グリッドクリック用）
function pctForType(t: DiagnosisType): Pct {
  const out: Pct = {};
  AXES.forEach((a, i) => {
    out[a.id] = t.code[i] === a.positive.key ? 100 : 0;
  });
  return out;
}

export default function AdminDiagnosisTypesPage() {
  const [pct, setPct] = useState<Pct>(INITIAL_PCT);
  const code = codeFromPct(pct);
  const type = DIAGNOSIS_TYPES[code];

  return (
    <PageShell backHref="/" backLabel="もどる" index="＊" indexLabel="ADMIN / TYPES">
      <h1 style={{
        fontFamily: "var(--font-serif)", fontWeight: 600,
        fontSize: "clamp(24px, 3.6vw, 40px)", lineHeight: 1.2, letterSpacing: ".03em",
        color: "#243019", marginBottom: "10px",
      }}>
        診断タイプ プレビュー
      </h1>
      <p style={{ fontSize: "13px", color: "#8a6d2e", letterSpacing: ".04em", lineHeight: 1.8, marginBottom: "32px" }}>
        管理者用の内部ツールです。スライダーで4軸の%を動かすと、対応するタイプが切り替わります（50%を境に極が反転）。
      </p>

      {/* ── スライダー + プレビュー ── */}
      <div style={{ display: "grid", gap: "28px", gridTemplateColumns: "minmax(0, 1fr)", marginBottom: "48px" }}>
        {/* スライダー */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "560px" }}>
          {AXES.map((a) => {
            const v = pct[a.id];
            const leftWins = v >= 50;
            return (
              <div key={a.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px", fontSize: "13px" }}>
                  <span style={{ color: leftWins ? "#2c3e2d" : "#a7b3a0", fontWeight: leftWins ? 700 : 500 }}>
                    {a.positive.label} <span style={{ fontVariantNumeric: "tabular-nums" }}>{v}%</span>
                  </span>
                  <span style={{ color: "#8fa888", fontSize: "11px", letterSpacing: ".1em" }}>{a.emoji} {a.title}</span>
                  <span style={{ color: !leftWins ? "#2c3e2d" : "#a7b3a0", fontWeight: !leftWins ? 700 : 500 }}>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{100 - v}%</span> {a.negative.label}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={v}
                  onChange={(e) => setPct((prev) => ({ ...prev, [a.id]: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#5a7d5a", cursor: "pointer" }}
                  aria-label={a.title}
                />
              </div>
            );
          })}
        </div>

        {/* プレビューカード */}
        {type ? (
          <TypeCard type={type} pct={pct} />
        ) : (
          <div style={{ color: "#a33", fontSize: "14px" }}>コード {code} に対応するタイプがありません。</div>
        )}
      </div>

      {/* ── 全16タイプ一覧 ── */}
      <div className="flex items-center gap-3 mb-[16px]">
        <span style={{ fontSize: "11px", letterSpacing: ".26em", color: "#8fa888", textTransform: "uppercase" }}>All types</span>
        <span style={{ fontSize: "12px", letterSpacing: ".14em", color: "#5a7d5a" }}>全16タイプ</span>
        <span style={{ flex: 1, height: "1px", background: "#e5e0d3" }} />
      </div>
      <div style={{ display: "grid", gap: "14px", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {ALL_TYPES.map((t) => {
          const active = t.code === code;
          return (
            <button
              key={t.code}
              type="button"
              onClick={() => setPct(pctForType(t))}
              style={{
                textAlign: "left", cursor: "pointer", padding: "10px", borderRadius: "14px",
                border: active ? "1.5px solid #5a7d5a" : "1px solid #e5e0d3",
                background: active ? "rgba(90,125,90,.1)" : "rgba(255,255,255,.7)",
                transition: "border-color .2s, background .2s",
              }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 2", borderRadius: "9px", overflow: "hidden", marginBottom: "8px", background: "#eef1ea" }}>
                <Image src={t.image} alt={t.animal} fill sizes="200px" style={{ objectFit: "cover" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#2c3e2d" }}>{t.animal}</span>
              </div>
              <div style={{ fontSize: "12.5px", color: "#3a4a32", marginTop: "2px", lineHeight: 1.4 }}>{t.name}</div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}

/* 選択中タイプの結果カード（本番の結果画面に近い体裁のプレビュー） */
function TypeCard({ type, pct }: { type: DiagnosisType; pct: Pct }) {
  return (
    <div style={{
      background: "rgba(255,255,255,.72)", border: "1px solid #e5e0d3",
      borderRadius: "24px", padding: "clamp(20px, 3vw, 32px)",
      boxShadow: "0 22px 50px -30px rgba(36,48,25,.5)", maxWidth: "640px", width: "100%",
    }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 2", borderRadius: "16px", overflow: "hidden", marginBottom: "18px", background: "#eef1ea" }}>
        <Image src={type.image} alt={`${type.name}（${type.animal}）`} fill sizes="(max-width: 680px) 100vw, 640px" style={{ objectFit: "cover" }} />
      </div>
      <p style={{ fontSize: "13px", color: "#5a7d5a", letterSpacing: ".08em", marginBottom: "6px" }}>
        「{type.animal}」タイプ
      </p>
      <h2 style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "clamp(22px, 3.4vw, 34px)", lineHeight: 1.25, color: "#243019", marginBottom: "10px" }}>
        {type.name}
      </h2>
      <p style={{ fontFamily: "var(--font-serif)", fontSize: "16px", color: "#5a7d5a", lineHeight: 1.6, marginBottom: "16px" }}>
        {type.tagline}
      </p>
      <p style={{ fontSize: "14px", color: "#3a4a32", lineHeight: 1.9, marginBottom: "20px" }}>
        {type.description}
      </p>

      {/* 4軸バランスバー（スライダー値をそのまま反映） */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {AXES.map((a) => {
          const v = pct[a.id];
          return (
            <div key={a.id}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px", color: "#5a7d5a" }}>
                <span>{a.positive.label} {v}%</span>
                <span>{100 - v}% {a.negative.label}</span>
              </div>
              <div style={{ display: "flex", height: "8px", borderRadius: "100px", overflow: "hidden", background: "#e6ece1" }}>
                <div style={{ width: `${v}%`, background: "#5a7d5a" }} />
                <div style={{ width: `${100 - v}%`, background: "#c2d2b8" }} />
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: "11.5px", color: "#8fa888", marginTop: "16px", lineHeight: 1.7 }}>
        genres（将来のルート連携用）: {type.genres.join(" / ") || "—"}
      </p>
    </div>
  );
}
