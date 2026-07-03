"use client";

/**
 * 使用感アンケートページ（06 — SURVEY）
 *
 * 5段階3問（満足度・使いやすさ・おすすめ度）+ 自由記述（任意）。回答は
 * POST /api/survey 経由で Google スプレッドシートへ保存する（認証不要・完全匿名）。
 *
 * 世界観は他ページ共通（PageShell + 明朝見出し + 深緑アクセント）。設問の5択UIは
 * /diagnosis の5件法、フォームの器は /post のスタイルを流用する。
 * `?from=` は「どこから来たか」として回答に添付する（未指定は空）。
 */
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import {
  SURVEY_QUESTIONS,
  SURVEY_ANSWERED_KEY,
  optionValue,
  type SurveyQuestion,
} from "@/lib/surveyClient";

type Answers = Record<SurveyQuestion["key"], number | null>;

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11.5px",
  letterSpacing: ".22em",
  color: "#5a7d5a",
  marginBottom: "12px",
};

function SurveyForm() {
  const searchParams = useSearchParams();
  const source = searchParams.get("from") ?? "";

  const [answers, setAnswers] = useState<Answers>({
    satisfaction: null,
    ease_of_use: null,
    recommend: null,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const allAnswered = SURVEY_QUESTIONS.every((q) => answers[q.key] != null);
  const canSubmit = allAnswered && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          satisfaction: answers.satisfaction,
          ease_of_use: answers.ease_of_use,
          recommend: answers.recommend,
          free_comment: comment.trim(),
        }),
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
          ありがとうございました。
        </h1>
        <p className="sel-rise" style={{
          fontSize: "13px", color: "#5a7d5a", letterSpacing: ".05em",
          lineHeight: 1.9, marginBottom: "30px", animationDelay: ".2s",
        }}>
          いただいた感想は、これからのアプリづくりに役立てます。
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
        color: "#243019", marginBottom: "12px", animationDelay: ".12s",
      }}>
        使ってみて、<span style={{ color: "#5a7d5a" }}>どうでしたか</span>。
      </h1>
      <p className="sel-rise" style={{
        fontSize: "12.5px", color: "#8fa888", letterSpacing: ".06em",
        lineHeight: 1.9, marginBottom: "34px", animationDelay: ".18s",
      }}>
        よりよいアプリにするための、かんたんなアンケートです（30秒ほど）。
      </p>

      <div className="sel-rise" style={{ maxWidth: "560px", animationDelay: ".24s" }}>
        {SURVEY_QUESTIONS.map((q) => (
          <div key={q.key} style={{ marginBottom: "30px" }}>
            <span style={labelStyle}>{q.label}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {q.options.map((opt, i) => {
                const value = optionValue(i);
                const isChecked = answers[q.key] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isChecked}
                    onClick={() => setAnswers((a) => ({ ...a, [q.key]: value }))}
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
          </div>
        ))}

        {/* 自由記述（任意） */}
        <div style={{ marginBottom: "30px" }}>
          <span style={labelStyle}>ひとこと（任意）</span>
          <textarea
            value={comment}
            maxLength={1000}
            rows={4}
            placeholder="よかった点・改善してほしい点など（1000文字まで）"
            onChange={(e) => setComment(e.target.value)}
            style={{
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
              background: "rgba(255,255,255,.9)",
              border: "1px solid #d8d2c0",
              borderRadius: "12px",
              padding: "12px 14px",
              fontSize: "14px",
              color: "#2c3e2d",
              outline: "none",
              lineHeight: 1.7,
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        {error && (
          <p style={{ fontSize: "12.5px", color: "#e05252", marginBottom: "16px", lineHeight: 1.7 }}>
            ⚠ {error}
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

export default function SurveyPage() {
  // useSearchParams は Suspense 境界の内側でしか使えない（Next.js App Router の制約）
  return (
    <PageShell backHref="/" backLabel="ホームへ" index="06" indexLabel="SURVEY">
      <Suspense fallback={
        <p style={{ fontSize: "12px", letterSpacing: ".2em", color: "#8fa888" }}>読み込み中…</p>
      }>
        <SurveyForm />
      </Suspense>
    </PageShell>
  );
}
