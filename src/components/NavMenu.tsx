"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SELECT_STATE_KEY } from "@/lib/selectState";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** クリック時に選択状態を破棄して新規スタートにする（ルート設計） */
  freshStart?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "ホーム",
    icon: <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3v-5H7v5H4a1 1 0 0 1-1-1V9.5Z" />,
  },
  {
    href: "/select",
    label: "ルート設計",
    freshStart: true,
    icon: (
      <>
        <circle cx="5" cy="5" r="2" />
        <circle cx="15" cy="15" r="2" />
        <path d="M5 7v4a3 3 0 0 0 3 3h5" />
      </>
    ),
  },
  {
    href: "/diagnosis",
    label: "旅タイプ診断",
    icon: (
      <>
        <path d="M10 2.5a4 4 0 0 1 4 4c0 2-1.6 2.8-2.6 3.8-.6.6-.9 1.2-.9 2.2" />
        <circle cx="10" cy="16.5" r="1" />
      </>
    ),
  },
  {
    href: "/trips",
    label: "みんなの旅",
    icon: (
      <>
        <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" />
        <circle cx="10" cy="10" r="2.6" />
      </>
    ),
  },
  {
    href: "/post",
    label: "写真を投稿",
    icon: (
      <>
        <rect x="2" y="6" width="16" height="11" rx="2.5" />
        <path d="M6.8 6l1.2-2h4l1.2 2" />
        <circle cx="10" cy="11.5" r="3" />
      </>
    ),
  },
  {
    href: "/trips/new",
    label: "旅を記録",
    icon: (
      <>
        <path d="M4 16l.9-3.2 8-8 2.3 2.3-8 8L4 16Z" />
        <path d="M11.7 6.6 13.9 8.8" />
      </>
    ),
  },
  {
    href: "/me",
    label: "マイページ",
    icon: (
      <>
        <circle cx="10" cy="7" r="3.2" />
        <path d="M3.5 17c0-3.3 2.9-5 6.5-5s6.5 1.7 6.5 5" />
      </>
    ),
  },
  // アンケートは Google フォームで実施するため、アプリ内メニューからは外す。
  // アプリ内アンケートに戻すときはこのブロックのコメントを解除する。2026-07-16
  // {
  //   href: "/survey",
  //   label: "アンケート",
  //   icon: (
  //     <>
  //       <path d="M6 3h8a1 1 0 0 1 1 1v13l-2.5-1.6L10 17l-2.5-1.6L5 17V4a1 1 0 0 1 1-1Z" />
  //       <path d="M8 7h4M8 10h4" />
  //     </>
  //   ),
  // },
];

/** 現在パスに最も具体的に一致するナビ項目の href（最長一致）。どれにも該当しなければ "" */
function activeHrefFor(pathname: string): string {
  let best = "";
  for (const { href } of NAV_ITEMS) {
    const matches = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
    if (matches && href.length > best.length) best = href;
  }
  return best;
}

export default function NavMenu() {
  const pathname = usePathname();
  const activeHref = activeHrefFor(pathname);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 外側クリック・Escape で閉じる
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleItem = useCallback(
    (item: NavItem) => {
      setOpen(false);
      // ルート設計は前回の選択を破棄して白紙スタート（ホームCTAと同じ挙動）
      if (item.freshStart) {
        sessionStorage.removeItem(SELECT_STATE_KEY);
      }
    },
    []
  );

  return (
    <div ref={rootRef} style={{ position: "relative", pointerEvents: "auto" }}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="メニュー"
        onClick={() => setOpen((v) => !v)}
        className="nav-trigger"
        style={{
          display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer",
          padding: "9px 14px", borderRadius: "100px",
          border: "1px solid #e5e0d3", background: open ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.55)",
          color: "#5a7d5a", fontSize: "12px", fontWeight: 600, letterSpacing: ".18em",
          fontFamily: "var(--font-sans)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          {open ? (
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
        MENU
      </button>

      {open && (
        <div
          role="menu"
          aria-label="ページ移動"
          className="nav-panel"
          style={{
            position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 50,
            minWidth: "210px", padding: "8px",
            background: "rgba(247,245,240,.98)",
            border: "1px solid #e5e0d3", borderRadius: "16px",
            boxShadow: "0 24px 50px -22px rgba(36,48,25,.55)",
          }}
        >
          {NAV_ITEMS.map((item) => {
            // 最長一致の1項目だけを active にする（/trips/new で /trips まで点灯するのを防ぐ）
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => handleItem(item)}
                className="nav-item"
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "11px 13px", borderRadius: "11px", textDecoration: "none",
                  fontSize: "13.5px", fontWeight: 600, letterSpacing: ".05em",
                  fontFamily: "var(--font-sans)",
                  color: active ? "#f3f1ea" : "#2c3e2d",
                  background: active ? "#2c3e2d" : "transparent",
                }}
              >
                <span style={{ display: "inline-flex", color: active ? "#cfe0c6" : "#5a7d5a" }}>
                  <svg {...iconProps}>{item.icon}</svg>
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
