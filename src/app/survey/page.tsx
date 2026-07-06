"use client";

/**
 * 使用感アンケートページ（06 — SURVEY）
 *
 * 実証実験用アンケート: 属性2問（単一選択）+ 5段階評価4問 + 単一選択1問（＝必須7問）
 * + 自由記述2問（任意）。設問の正本は src/lib/survey.ts。回答は POST /api/survey 経由で
 * Google スプレッドシートへ保存する（認証不要・完全匿名）。
 *
 * 世界観は他ページ共通（PageShell + 明朝見出し + 深緑アクセント）。選択肢UIは /diagnosis の
 * 5件法、フォームの器は /post のスタイルを流用。`?from=` を回答に添付する。
 */
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import {
  SURVEY_QUESTIONS,
  SURVEY_INTRO,
  SURVEY_ANSWERED_KEY,
  type SurveyQuestion,
} from "@/lib/survey";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: 600,
  color: "#243019",
  letterSpacing: ".02em",
  lineHeight: 1.7,
  marginBottom: "12px",
};

function SurveyForm() {
  const searchParams = useSearchParams();
  const source = searchParams.get("from") ?? "";

  // 全設問の回答を key → 文字列（選択肢ラベル or 自由記述）で保持
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setAnswer = (key: string, value: string) =>
    setAnswers((a) => ({ ...a, [key]: value }));

  const allRequiredAnswered = useMemo(
    () =>
      SURVEY_QUESTIONS.filter((q) => q.required).every(
        (q) => (answers[q.key] ?? "").trim() !== ""
      ),
    [answers]
  );
  const canSubmit = allRequiredAnswered && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, answers }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "送信に失敗しました");
      }
      try {
        localStorage.setItem(SURVEY_ANSWERED_KEY, "1");
      } catch {
        /* localStorage 不可でも送信は成功しているので無視 */
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <>
        <h1 className="sel-rise" style={{
          fontFamily: "var(--font-serif)", fontWeight: 600,
          fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.2, letterSpacing: ".03em",
          color: "#243019", marginBottom: "14px", animationDelay: ".12s",
        }}>
          ご協力ありがとうございました。
        </h1>
        <p className="sel-rise" style={{
          fontSize: "13px", color: "#5a7d5a", letterSpacing: ".05em",
          lineHeight: 1.9, marginBottom: "30px", animationDelay: ".2s",
        }}>
          いただいた回答は、実証実験と今後のアプリづくりに役立てます。
        </p>
        <Link href="/" className="sel-rise" style={{
          display: "inline-flex", alignItems: "center", gap: "12px",
          background: "#2c3e2d", color: "#f3f1ea",
          fontSize: "13.5px", fontWeight: 600, letterSpacing: ".1em",
          padding: "13px 24px", borderRadius: "100px",
          boxShadow: "0 14px 30px -16px rgba(36,48,25,.7)",
          textDecoration: "none", animationDelay: ".26s",
        }}>
          ホームへ戻る
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="sel-rise" style={{
        fontFamily: "var(--font-serif)", fontWeight: 600,
        fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.2, letterSpacing: ".03em",
        color: "#243019", marginBottom: "16px", animationDelay: ".12s",
      }}>
        アンケートの<span style={{ color: "#5a7d5a" }}>お願い</span>。
      </h1>

      {/* 冒頭の説明文 */}
      <p className="sel-rise" style={{
        fontSize: "12.5px", color: "#5a7d5a", letterSpacing: ".03em",
        lineHeight: 2, maxWidth: "560px", marginBottom: "36px", animationDelay: ".18s",
      }}>
        {SURVEY_INTRO}
      </p>

      <div className="sel-rise" style={{ maxWidth: "560px", animationDelay: ".24s" }}>
        {SURVEY_QUESTIONS.map((q, i) => (
          <QuestionBlock
            key={q.key}
            index={i}
            question={q}
            value={answers[q.key] ?? ""}
            onChange={(v) => setAnswer(q.key, v)}
          />
        ))}

        {error && (
          <p style={{ fontSize: "12.5px", color: "#e05252", marginBottom: "16px", lineHeight: 1.7 }}>
            ⚠ {error}
          </p>
        )}

        {!allRequiredAnswered && (
          <p style={{ fontSize: "11.5px", color: "#9a947f", marginBottom: "14px", letterSpacing: ".04em" }}>
            必須の設問（★）にすべてお答えいただくと送信できます。
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{
            cursor: canSubmit ? "pointer" : "default",
            background: canSubmit ? "#2c3e2d" : "#b9b49f",
            color: "#f3f1ea",
            border: "none",
            fontSize: "14px", fontWeight: 700, letterSpacing: ".12em",
            padding: "15px 34px", borderRadius: "100px",
            boxShadow: canSubmit ? "0 14px 30px -16px rgba(36,48,25,.7)" : "none",
            transition: "background .25s, box-shadow .25s",
            fontFamily: "var(--font-sans)",
          }}
        >
          {submitting ? "送信中…" : "送信する"}
        </button>
        <p style={{ fontSize: "10.5px", color: "#9a947f", marginTop: "12px", letterSpacing: ".04em", lineHeight: 1.8 }}>
          回答は匿名で集計されます。個人を特定する情報は集めません。
        </p>
      </div>
    </>
  );
}

/* ── 設問1つ分（single / scale = 選択肢ボタン、text = テキストエリア） ── */
function QuestionBlock({
  index, question, value, onChange,
}: {
  index: number;
  question: SurveyQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const { label, type, required, options, maxLength } = question;
  return (
    <div style={{ marginBottom: "34px" }}>
      <span style={labelStyle}>
        <span style={{ color: "#8fa888", fontVariantNumeric: "tabular-nums", marginRight: "8px" }}>
          Q{index + 1}
        </span>
        {label}
        {required
          ? <span style={{ color: "#c66", marginLeft: "6px", fontSize: "12px" }}>★</span>
          : <span style={{ color: "#9a947f", marginLeft: "6px", fontSize: "11px", fontWeight: 500 }}>（任意）</span>}
      </span>

      {type === "text" ? (
        <textarea
          value={value}
          maxLength={maxLength ?? 1000}
          rows={4}
          placeholder={`${maxLength ?? 1000}文字まで`}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", resize: "vertical",
            background: "rgba(255,255,255,.9)", border: "1px solid #d8d2c0",
            borderRadius: "12px", padding: "12px 14px", fontSize: "14px",
            color: "#2c3e2d", outline: "none", lineHeight: 1.7,
            fontFamily: "var(--font-sans)",
          }}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {(options ?? []).map((opt) => {
            const isChecked = value === opt;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={isChecked}
                onClick={() => onChange(opt)}
                className="diag-option"
                style={{
                  display: "flex", alignItems: "center", gap: "14px", textAlign: "left",
                  cursor: "pointer", width: "100%",
                  padding: "13px 16px", borderRadius: "14px",
                  border: isChecked ? "1.5px solid #5a7d5a" : "1px solid #e5e0d3",
                  background: isChecked ? "rgba(90,125,90,.1)" : "rgba(255,255,255,.7)",
                  color: "#2c3e2d", fontSize: "14.5px", fontWeight: 600,
                  letterSpacing: ".04em", fontFamily: "var(--font-sans)",
                  transition: "background .2s, border-color .2s",
                }}
              >
                <span style={{
                  width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0,
                  display: "grid", placeItems: "center",
                  border: isChecked ? "none" : "1.5px solid #cddac6",
                  background: isChecked ? "#5a7d5a" : "transparent",
                  transition: "background .2s, border-color .2s",
                }}>
                  {isChecked && (
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fff" }} />
                  )}
                </span>
                <span style={{ flex: 1 }}>{opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SurveyPage() {
  // useSearchParams は Suspense 境界の内側でしか使えない（Next.js App Router の制約）
  return (
    <PageShell backHref="/" backLabel="ホームへ" indexLabel="SURVEY">
      <Suspense fallback={
        <p style={{ fontSize: "12px", letterSpacing: ".2em", color: "#8fa888" }}>読み込み中…</p>
      }>
        <SurveyForm />
      </Suspense>
    </PageShell>
  );
}
