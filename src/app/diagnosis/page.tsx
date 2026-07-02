"use client";

/**
 * 那須旅診断（機能2）— 16問の5件法 → 4軸で旅タイプ（動物）を表示
 *
 * 状態機械: intro → question（1問ずつ・5件法）→ result。ローカル state のみで完結する
 * （URL / sessionStorage は使わない = 今回はルート連携しないため）。
 * 診断の中身（軸・質問・タイプ・採点）は src/lib/diagnosis.ts に集約。ここは表示だけ。
 *
 * 世界観は他ページと共通（PageShell + 明朝見出し + 深緑アクセント）。新規CSSは足さず、
 * 既存の .sel-rise アニメと /select 由来のボタンスタイルを流用する。
 */
import { useState } from "react";
import Image from "next/image";
import PageShell from "@/components/PageShell";
import {
  AXES,
  QUESTIONS,
  LIKERT_OPTIONS,
  computeResult,
  type DiagnosisResult,
} from "@/lib/diagnosis";

type Phase = "intro" | "question" | "result";

export default function DiagnosisPage() {
  const total = QUESTIONS.length;
  const [phase, setPhase] = useState<Phase>("intro");
  // 各設問の回答値（-2〜+2、未回答は null）。QUESTIONS と同じ並びの固定長配列で保持する
  // ＝前の質問に戻っても選んだ値が残り、チェック状態として可視化できる
  const [values, setValues] = useState<(number | null)[]>(() => Array(total).fill(null));
  // 今表示している設問の index（append 方式をやめ、明示的なポインタで前後に移動する）
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const start = () => {
    setValues(Array(total).fill(null));
    setCurrent(0);
    setResult(null);
    setPhase("question");
  };

  // 現在の設問の値をセット（自動で次へは進まない。送りは「次へ」で明示する）
  const select = (value: number) => {
    setValues((v) => {
      const next = [...v];
      next[current] = value;
      return next;
    });
  };

  const next = () => {
    if (values[current] == null) return; // 未選択なら進めない
    if (current < total - 1) {
      setCurrent((c) => c + 1);
    } else {
      // 全問回答済み。未回答が万一あっても 0 に倒して算出
      setResult(computeResult(values.map((v) => v ?? 0)));
      setPhase("result");
    }
  };

  const back = () => {
    if (phase === "result") {
      setResult(null);
      setCurrent(total - 1);
      setPhase("question");
      return;
    }
    if (current > 0) {
      setCurrent((c) => c - 1);
    } else {
      setPhase("intro"); // 最初の設問からはイントロへ戻る
    }
  };

  const restart = () => {
    setValues(Array(total).fill(null));
    setCurrent(0);
    setResult(null);
    setPhase("intro");
  };

  return (
    <PageShell backHref="/" backLabel="もどる" index="00" indexLabel="DIAGNOSIS">
      {phase === "intro" && <Intro total={total} onStart={start} />}
      {phase === "question" && (
        <QuestionView
          index={current}
          total={total}
          selected={values[current]}
          onSelect={select}
          onNext={next}
          onBack={back}
        />
      )}
      {phase === "result" && result && (
        <ResultView result={result} onRestart={restart} onBack={back} />
      )}
    </PageShell>
  );
}

/* ── intro ───────────────────────────────────────────── */
function Intro({ total, onStart }: { total: number; onStart: () => void }) {
  return (
    <div>
      <h1
        className="sel-rise"
        style={{
          fontFamily: "var(--font-serif)", fontWeight: 600,
          fontSize: "clamp(30px, 4.6vw, 56px)", lineHeight: 1.16, letterSpacing: ".03em",
          color: "#243019", marginBottom: "16px", animationDelay: ".12s",
        }}
      >
        {total}の質問で、<br />
        あなたの<span style={{ color: "#5a7d5a" }}>那須の旅タイプ</span>を診断。
      </h1>
      <p
        className="sel-rise text-balance"
        style={{
          fontSize: "clamp(13px, 1.3vw, 16px)", color: "#5a7d5a",
          letterSpacing: ".06em", lineHeight: 1.9, maxWidth: "46ch", marginBottom: "28px",
          animationDelay: ".2s",
        }}
      >
        「計画 ↔ 即興」「刺激 ↔ 癒し」「内向 ↔ 外向」「体験 ↔ 形」の4つの視点から、あなたにぴったりの過ごし方（動物タイプ）が見つかります。
      </p>

      {/* 4軸の紹介 */}
      <div className="sel-rise" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "40px", animationDelay: ".24s" }}>
        {AXES.map((a) => (
          <span key={a.id} style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "9px 15px", borderRadius: "100px",
            border: "1px solid #e5e0d3", background: "rgba(255,255,255,.6)",
            fontSize: "12.5px", fontWeight: 600, color: "#5a7d5a", letterSpacing: ".05em",
          }}>
            <span style={{ fontSize: "14px" }}>{a.emoji}</span>
            {a.title}
          </span>
        ))}
      </div>

      {/* start-cta 単独で使う（sel-rise と併用すると animation が競合し opacity:0 のまま消える）。
          start-cta 自身の rise アニメが opacity 0→1 のフェードインを担う */}
      <button onClick={onStart} className="start-cta" style={{ ...ctaStyle, animationDelay: ".3s" }}>
        診断をはじめる
        <span style={ringBtnStyle}><Arrow /></span>
      </button>
    </div>
  );
}

/* ── question ────────────────────────────────────────── */
function QuestionView({
  index, total, selected, onSelect, onNext, onBack,
}: {
  index: number;
  total: number;
  /** この設問の現在の回答値（未回答は null）。戻ってきたときのチェック状態に使う */
  selected: number | null;
  onSelect: (value: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const q = QUESTIONS[index];
  const progress = ((index + 1) / total) * 100;
  const isLast = index === total - 1;
  const isAnswered = selected != null;

  return (
    // key を親で使わず index 依存の再マウントを避けるため、進捗と設問だけ key で差し替える
    <div>
      {/* 進捗 */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "22px", fontWeight: 700, color: "#2c3e2d", fontVariantNumeric: "tabular-nums" }}>
            {index + 1}
          </span>
          <span style={{ fontSize: "12px", color: "#8fa888", letterSpacing: ".1em" }}>/ {total}</span>
        </div>
        <div style={{ height: "3px", borderRadius: "100px", background: "#e5e0d3", overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#5a7d5a", borderRadius: "100px", transition: "width .35s cubic-bezier(.2,.7,.2,1)" }} />
        </div>
      </div>

      {/* 設問文（key で設問切替時だけ再アニメ。maxWidth は付けず .text-balance で全文をバランス改行）。
          .text-balance は globals.css の text-wrap: balance ユーティリティ */}
      <h2
        key={q.id}
        className="sel-rise text-balance"
        style={{
          fontFamily: "var(--font-serif)", fontWeight: 600,
          fontSize: "clamp(22px, 3.2vw, 34px)", lineHeight: 1.45, letterSpacing: ".03em",
          color: "#243019", marginBottom: "28px",
        }}
      >
        {q.text}
      </h2>

      {/* 5件法の選択肢（チェックボックス。単一選択＝選び直すと切り替わる。戻ると選択が残る） */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "520px" }}>
        {LIKERT_OPTIONS.map((opt) => {
          const isChecked = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isChecked}
              onClick={() => onSelect(opt.value)}
              className="diag-option"
              style={{
                display: "flex", alignItems: "center", gap: "14px", textAlign: "left",
                cursor: "pointer", width: "100%",
                padding: "15px 18px", borderRadius: "14px",
                border: isChecked ? "1.5px solid #5a7d5a" : "1px solid #e5e0d3",
                background: isChecked ? "rgba(90,125,90,.1)" : "rgba(255,255,255,.7)",
                color: "#2c3e2d", fontSize: "15px", fontWeight: 600,
                letterSpacing: ".04em", fontFamily: "var(--font-sans)",
                transition: "transform .2s cubic-bezier(.2,.7,.2,1), background .2s, border-color .2s",
              }}
            >
              {/* チェックボックス */}
              <span style={{
                width: "22px", height: "22px", borderRadius: "7px", flexShrink: 0,
                display: "grid", placeItems: "center",
                border: isChecked ? "none" : "1.5px solid #cddac6",
                background: isChecked ? "#5a7d5a" : "transparent",
                transition: "background .2s, border-color .2s",
              }}>
                {isChecked && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12.5l4.5 4.5L19 7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span style={{ flex: 1 }}>{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* 前へ / 次へ */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "28px", flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={textLinkStyle}>
          {index > 0 ? "← 前の質問にもどる" : "← はじめにもどる"}
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-disabled={!isAnswered}
          style={{
            ...ctaStyle,
            padding: "14px 18px 14px 26px", fontSize: "14px",
            opacity: isAnswered ? 1 : 0.5,
            cursor: isAnswered ? "pointer" : "default",
            transition: "opacity .2s, transform .3s cubic-bezier(.2,.7,.2,1), background .3s",
          }}
        >
          {isLast ? "結果を見る" : "次へ"}
          <span style={ringBtnStyle}><Arrow /></span>
        </button>
      </div>
    </div>
  );
}

/* ── result ──────────────────────────────────────────── */
function ResultView({
  result, onRestart, onBack,
}: {
  result: DiagnosisResult;
  onRestart: () => void;
  onBack: () => void;
}) {
  const { type, axes } = result;

  return (
    // 結果ブロック全体（見出し・カード・ボタン）を中央寄せ。カード幅に揃えて中央に配置する
    <div style={{ maxWidth: "640px", margin: "0 auto", width: "100%" }}>
      <p className="sel-rise" style={{ fontSize: "12px", letterSpacing: ".26em", color: "#8fa888", textTransform: "uppercase", marginBottom: "14px", animationDelay: ".05s" }}>
        Your Type
      </p>

      {/* 結果カード */}
      <div
        className="sel-rise"
        style={{
          background: "rgba(255,255,255,.72)", border: "1px solid #e5e0d3",
          borderRadius: "24px", padding: "clamp(20px, 3.2vw, 36px)",
          boxShadow: "0 22px 50px -30px rgba(36,48,25,.5)", width: "100%",
          animationDelay: ".12s",
        }}
      >
        {/* 画像（3:2） */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 2", borderRadius: "16px", overflow: "hidden", marginBottom: "22px", background: "#eef1ea" }}>
          <Image
            src={type.image}
            alt={`${type.name}（${type.animal}）`}
            fill
            sizes="(max-width: 680px) 100vw, 640px"
            style={{ objectFit: "cover" }}
            priority
          />
        </div>

        <p style={{ fontSize: "13px", color: "#5a7d5a", letterSpacing: ".08em", marginBottom: "8px" }}>
          あなたは「{type.animal}」タイプ
        </p>
        <h1 style={{
          fontFamily: "var(--font-serif)", fontWeight: 600,
          fontSize: "clamp(24px, 4vw, 42px)", lineHeight: 1.25, letterSpacing: ".03em",
          color: "#243019", marginBottom: "12px",
        }}>
          {type.name}
        </h1>
        <p style={{
          fontFamily: "var(--font-serif)", fontSize: "clamp(14px, 1.6vw, 18px)",
          color: "#5a7d5a", letterSpacing: ".04em", lineHeight: 1.7, marginBottom: "20px",
        }}>
          {type.tagline}
        </p>
        <div style={{ height: "1px", background: "#e5e0d3", marginBottom: "20px" }} />
        <p style={{ fontSize: "15px", color: "#3a4a32", letterSpacing: ".04em", lineHeight: 2, marginBottom: "26px" }}>
          {type.description}
        </p>

        {/* 4軸の内訳（二極バランス。左極%と右極%は合計100。優勢な側を濃く表示） */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {axes.map((a) => {
            const leftWins = a.positivePercent >= a.negativePercent;
            return (
              <div key={a.axisId}>
                {/* 左極ラベル+% ／ 右極%+ラベル（優勢側を濃色・太字に） */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "7px", fontSize: "13px", letterSpacing: ".04em" }}>
                  <span style={{ color: leftWins ? "#2c3e2d" : "#a7b3a0", fontWeight: leftWins ? 700 : 500 }}>
                    {a.positive.label}
                    <span style={{ fontVariantNumeric: "tabular-nums", marginLeft: "8px" }}>{a.positivePercent}%</span>
                  </span>
                  <span style={{ color: !leftWins ? "#2c3e2d" : "#a7b3a0", fontWeight: !leftWins ? 700 : 500 }}>
                    <span style={{ fontVariantNumeric: "tabular-nums", marginRight: "8px" }}>{a.negativePercent}%</span>
                    {a.negative.label}
                  </span>
                </div>
                {/* バランスバー: 左極(濃緑) と 右極(淡緑) を比率で分割。中央に50%目盛り */}
                <div style={{ position: "relative", display: "flex", height: "9px", borderRadius: "100px", overflow: "hidden", background: "#e6ece1" }}>
                  <div style={{ width: `${a.positivePercent}%`, background: "#5a7d5a", transition: "width .4s cubic-bezier(.2,.7,.2,1)" }} />
                  <div style={{ width: `${a.negativePercent}%`, background: "#c2d2b8", transition: "width .4s cubic-bezier(.2,.7,.2,1)" }} />
                  {/* 中央（50%）の目盛り線 */}
                  <span style={{ position: "absolute", left: "50%", top: "-2px", bottom: "-2px", width: "1px", background: "rgba(36,48,25,.28)", transform: "translateX(-0.5px)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/*
        将来のルート連携（スコープ外）: ここに「この結果で旅をつくる」ボタンを足す。
        type.genres を activeTags として /select へ渡す（SELECT_STATE_KEY に書き込む）か、
        encodeRouteQuery で /route へ直行する想定。差し込み口は type.genres。
      */}

      <div className="sel-rise" style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "28px", alignItems: "center", animationDelay: ".22s" }}>
        <button type="button" onClick={onRestart} className="start-cta" style={ctaStyle}>
          もう一度診断する
          <span style={ringBtnStyle}><Arrow /></span>
        </button>
        <button type="button" onClick={onBack} style={textLinkStyle}>
          ← 質問にもどる
        </button>
      </div>
    </div>
  );
}

/* ── 共通スタイル・小物 ───────────────────────────────── */
const ctaStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "14px", alignSelf: "flex-start",
  background: "#2c3e2d", color: "#f3f1ea", border: "none", cursor: "pointer",
  fontFamily: "var(--font-sans)", fontSize: "15px", fontWeight: 500,
  letterSpacing: ".14em", padding: "17px 20px 17px 32px", borderRadius: "100px",
  boxShadow: "0 18px 40px -18px rgba(36,48,25,.7)",
};

const ringBtnStyle: React.CSSProperties = {
  width: "36px", height: "36px", borderRadius: "50%",
  background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center",
};

const textLinkStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", padding: "6px 0",
  fontSize: "13px", fontWeight: 600, fontFamily: "var(--font-sans)",
  color: "#5a7d5a", letterSpacing: ".08em",
};

function Arrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
