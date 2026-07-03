/**
 * POST /api/survey — 使用感アンケートの回答を Google スプレッドシートへ保存する
 *
 * ブラウザ → 同一オリジンの本ルート → Apps Script Web App（SURVEY_WEBHOOK_URL）へ
 * サーバー間 POST。サーバー経由なので CORS 不要で、Web App URL も環境変数で秘匿できる。
 *
 * CLAUDE.md セクション11: Next.js は Route Handler 内の fetch をキャッシュするため、
 * `dynamic = "force-dynamic"` と外部 fetch の `cache: "no-store"` を必ず付ける。
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const inRange = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5;

export async function POST(req: Request) {
  const url = process.env.SURVEY_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json(
      { error: "アンケートの保存先が未設定です（SURVEY_WEBHOOK_URL）" },
      { status: 500 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }

  const { source, satisfaction, ease_of_use, recommend, free_comment } = body;
  if (!inRange(satisfaction) || !inRange(ease_of_use) || !inRange(recommend)) {
    return NextResponse.json({ error: "回答が不正です" }, { status: 400 });
  }

  const payload = {
    source: typeof source === "string" ? source.slice(0, 40) : "",
    satisfaction,
    ease_of_use,
    recommend,
    free_comment: typeof free_comment === "string" ? free_comment.slice(0, 1000) : "",
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      // Apps Script は e.postData.contents に本文を格納する。content-type は問わない。
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
