import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 管理者ページ（/admin/*）を Basic 認証でガードする。
 *
 * - 資格情報は環境変数（ADMIN_USER / ADMIN_PASSWORD）。ADMIN_USER 未設定なら "admin"。
 * - ADMIN_PASSWORD 未設定のとき:
 *   - 開発（next dev）は素通し（ローカル確認の利便のため）
 *   - 本番は 503 で塞ぐ（未設定のまま公開されないように）
 * - 認証はサーバー（Edge middleware）側で行うため、クライアントを見ても突破できない。
 *
 * ※ /admin 配下だけを対象にする（matcher）。それ以外のページ・APIには影響しない。
 */
export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASSWORD;

  if (!pass) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse(
      "管理者ページは未設定です（環境変数 ADMIN_PASSWORD を設定してください）。",
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization");
  if (header) {
    const [scheme, encoded] = header.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const sep = decoded.indexOf(":");
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (u === user && p === pass) return NextResponse.next();
    }
  }

  return new NextResponse("認証が必要です。", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="admin", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
