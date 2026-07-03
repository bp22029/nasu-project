/**
 * POST /api/survey — 使用感アンケートの回答を Google スプレッドシートへ保存する
 *
 * ブラウザ → 同一オリジンの本ルート → Apps Script Web App（SURVEY_WEBHOOK_URL）へ
 * サーバー間 POST。サーバー経由なので CORS 不要で、Web App URL も環境変数で秘匿できる。
 *
 * 設問の正本は src/lib/survey.ts（クライアントと共有）。ここではその定義で回答を検証し、
 * key 順のフラットなオブジェクトにして Apps Script へ転送する（Apps Script 側の HEADER と対応）。
 *
 * CLAUDE.md セクション11: Next.js は Route Handler 内の fetch をキャッシュするため、
 * `dynamic = "force-dynamic"` と外部 fetch の `cache: "no-store"` を必ず付ける。
 */
import { NextResponse } from "next/server";
import { SURVEY_QUESTIONS } from "@/lib/survey";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = process.env.SURVEY_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json(
      { error: "アンケートの保存先が未設定です（SURVEY_WEBHOOK_URL）" },
      { status: 500 }
    );
  }

  let body: { source?: unknown; answers?: unknown };
  try {
    body = (await req.json()) as { source?: unknown; answers?: unknown };
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const answers =
    body.answers && typeof body.answers === "object"
      ? (body.answers as Record<string, unknown>)
      : {};

  // 設問定義に沿って検証しつつ、シート列（key 順）のフラットな行を組み立てる
  const row: Record<string, string> = {
    source: typeof body.source === "string" ? body.source.slice(0, 40) : "",
  };
  for (const q of SURVEY_QUESTIONS) {
    const raw = answers[q.key];
    const value = typeof raw === "string" ? raw.trim() : "";

    if (q.type === "text") {
      if (q.required && value === "") {
        return NextResponse.json({ error: `未回答の設問があります（${q.key}）` }, { status: 400 });
      }
      row[q.key] = value.slice(0, q.maxLength ?? 1000);
    } else {
      // single / scale: 定義済みの選択肢ラベルのいずれかであること
      const allowed = q.options ?? [];
      if (value === "") {
        if (q.required) {
          return NextResponse.json({ error: `未回答の設問があります（${q.key}）` }, { status: 400 });
        }
        row[q.key] = "";
      } else if (!allowed.includes(value)) {
        return NextResponse.json({ error: `回答が不正です（${q.key}）` }, { status: 400 });
      } else {
        row[q.key] = value;
      }
    }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      // Apps Script は e.postData.contents に本文を格納する。content-type は問わない。
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
      cache: "no-store",
      redirect: "follow", // Apps Script Web App は googleusercontent へ 302 する
    });
    if (!res.ok) {
      return NextResponse.json({ error: "保存に失敗しました" }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
