"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { Spot } from "@/types/spot";
import { parseSpotTags } from "@/lib/spotTags";

interface SpotCardProps {
  spot: Spot;
  selected: boolean;
  onToggle: () => void;
  routeNumber?: number;
  index?: number;
  selectionOrder?: number;
  /** 施設名の表示（「直感で選ぶ」ために隠せる。撮影者クレジットは規約上常に表示） */
  showName?: boolean;
  /** シャッフルのたびに増える値。表示写真をランダムに選び直す */
  shuffleNonce?: number;
}

// /api/photos/[spotId] のレスポンス。Google 写真と投稿写真（機能3）が混在する
interface PhotoItem {
  uri: string;
  source: "google" | "user";
  authorAttributions?: Array<{ displayName: string; uri?: string }>;
  nickname?: string;
}

// プレースホルダー色は spot.id から決める（グリッド内の位置に依存させない）。
// シャッフルで並びが変わっても同じスポットは常に同じ見た目になる。
function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function cardGradient(seed: number): string {
  const hue = 118 + (seed * 13) % 64;
  const light = 0.62 + ((seed * 7) % 20) / 100;
  const c1 = `oklch(${(light + 0.12).toFixed(2)} 0.05 ${hue})`;
  const c2 = `oklch(${(light - 0.18).toFixed(2)} 0.06 ${(hue + 22) % 360})`;
  return `linear-gradient(${145 + (seed * 9) % 40}deg, ${c1}, ${c2})`;
}

// 写真クレジット: Google 写真は撮影者名 + Google Maps（規約上必須）、投稿写真はニックネーム。
// Google Maps Platform ポリシー: 新規実装は帰属表示に「Google Maps」を使う（旧「Google」は経過措置）。
// テキストでの帰属表示が認められる。撮影者名が返らなくても Google 写真には帰属表示を出す。
function photoCredit(photo: PhotoItem): string | null {
  if (photo.source === "user") {
    return `${photo.nickname ?? "名無しの旅人"} さんの投稿`;
  }
  const author = photo.authorAttributions?.[0]?.displayName;
  return author ? `${author} · Google Maps` : "Google Maps";
}

// 写真の自動切替（クロスフェード）。5秒はグリッドで眺めたときに落ち着く間隔で、
// 3秒未満は「選ぶ画面」としてせわしなくなる
const AUTO_ADVANCE_MS = 5000;
// カードごとに開始タイミングをずらす幅。写真ありカードが同フレームで一斉に切り替わると
// デコードが集中し、見た目も機械的になる（ずれ幅は spot.id から決めるので毎回同じ）
const AUTO_ADVANCE_PHASE_MS = 3000;
// クロスフェードの長さ
const CROSSFADE_MS = 900;

const arrowStyle: React.CSSProperties = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  border: "none",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  background: "rgba(20,28,16,.45)",
  color: "rgba(255,255,255,.9)",
  padding: 0,
};

export default function SpotCard({ spot, selected, onToggle, routeNumber, index = 0, selectionOrder, showName = true, shuffleNonce = 0 }: SpotCardProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  // 読み込みに失敗した写真URL（消された投稿写真・失効した Google URL など）。
  // 一枚も出ないより、残りの写真かプレースホルダーに素直に倒す
  const [brokenUris, setBrokenUris] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [hovered, setHovered] = useState(false);
  // 画面に近づいたカードだけ写真を取得する（本番は約200スポットあるため、
  // 全カード一斉に取得すると /select を開くたびに Google API を数百回消費してしまう）
  const [visible, setVisible] = useState(false);
  // いま画面内にあるか（visible と違い出入りで false に戻る）。自動切替のガードに使う。
  // 画面外のカードでタイマーを回し続けても意味がないので止める
  const [inView, setInView] = useState(false);
  // 動きを減らす設定（自動切替を止める）。購読は写真2枚以上のカードだけ
  const [reduceMotion, setReduceMotion] = useState(false);
  // クロスフェードで下に残す「直前の1枚」。DOM に置く写真は常に最大2枚に保つ
  // （全枚数を重ねて先読みすると通信量が数MB増える。投稿写真は長辺1600pxのJPEG）
  const [prevUri, setPrevUri] = useState<string | null>(null);
  const [fadedIn, setFadedIn] = useState(true);
  const lastUriRef = useRef<string | null>(null);
  // 読み込み済みと分かっている写真URL / 次に出す写真URL（自動切替の可否判定に使う）
  const preloadedRef = useRef<Set<string>>(new Set());
  const nextUriRef = useRef<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  // シャッフル時の写真選び直し用（effect から最新の photos を読むため）
  const photosRef = useRef<PhotoItem[]>([]);
  // 出現アニメーションの遅延は初回マウント時の位置で固定する。
  // シャッフルで index が変わったときに style が変化してアニメが再発火するのを防ぐ
  const appearDelay = useRef(0.38 + index * 0.04).current;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      setInView(true);
      return;
    }
    // 自動切替のガードに使うため disconnect せず監視し続ける（写真の取得トリガーである
    // visible は一度 true にしたら戻さないので、写真の再取得は起きない）
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.some((e) => e.isIntersecting);
        setInView(intersecting);
        if (intersecting) setVisible(true);
      },
      { rootMargin: "250px 0px" } // 画面の少し手前から先読みしてスクロールを待たせない（先読みしすぎるとAPI消費が増えるため控えめに）
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return; // 画面に近づくまで取得しない
    const debugOff =
      process.env.NEXT_PUBLIC_DEBUG_NO_PHOTOS === "true" ||
      (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("noPhotos"));
    if (debugOff) { setPhotoLoading(false); return; }
    let cancelled = false;
    // キーは spots.json の id（投稿写真は placeId のないスポットにも付き得る）
    fetch(`/api/photos/${encodeURIComponent(spot.id)}`)
      .then((r) => r.json())
      .then((data: { photos?: PhotoItem[] }) => {
        if (!cancelled && data.photos) {
          setPhotos(data.photos);
          photosRef.current = data.photos;
          // 最初に見せる写真は Google + 投稿写真からランダムに選ぶ
          // （訪れるたびに違う一枚が出る。「写真が増えて画面が変わる」体験の核）
          setPhotoIndex(Math.floor(Math.random() * Math.max(1, data.photos.length)));
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPhotoLoading(false); });
    return () => { cancelled = true; };
  }, [spot.id, visible]);

  // シャッフルボタンで並びだけでなく表示写真も選び直す（カードは再マウントされないため
  // nonce の変化をトリガーにする。写真の再取得はしない）
  useEffect(() => {
    if (shuffleNonce === 0) return;
    const p = photosRef.current;
    if (p.length < 2) return;
    setPhotoIndex((prev) => {
      // 必ず今と違う写真にする（「変わった感」を保証する）
      let next = Math.floor(Math.random() * p.length);
      if (next === prev) next = (next + 1) % p.length;
      return next;
    });
  }, [shuffleNonce]);

  // 壊れた写真は候補から外す。全滅したらプレースホルダー表示に落ちる
  const shownPhotos = photos.filter((p) => !brokenUris.includes(p.uri));
  const photo = shownPhotos[photoIndex] ?? shownPhotos[0] ?? null;
  const badgeNum = routeNumber ?? selectionOrder;
  // 写真が無いカードは「読み込み失敗」に見えないよう、施設名とジャンルを必ず出す
  // （施設名スイッチが OFF でも表示する。写真の代わりの手がかりが無くなるため）
  const genre = parseSpotTags(spot).genres[0] ?? null;
  const nameVisible = showName || !photo;
  const photoCount = shownPhotos.length;
  const currentUri = photo?.uri ?? null;

  // 「動きを減らす」設定の購読。写真が2枚以上のカードだけ購読する
  // （グリッドは約200枚あるので、全カードにリスナーを張らない）
  useEffect(() => {
    if (photoCount < 2 || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [photoCount]);

  // 写真の自動切替。次をすべて満たすときだけタイマーを回す:
  //   ① 表示できる写真が2枚以上 ② カードが画面内 ③ hover していない ④ 未選択 ⑤ reduced-motion でない
  // ③④は「カードが選択コントロールでもある」ため。触っている最中や選んだ後に絵が変わると、
  // 気に入った写真でタップしたつもりが別の写真になる事故になる。
  useEffect(() => {
    if (photoCount < 2 || !inView || hovered || selected || reduceMotion) return;
    const tick = () => {
      // 次の1枚がまだ読めていなければ今回は見送る（読めていないまま進めると、
      // 透明な新レイヤーが前の写真を隠してカードが下地に抜ける）
      const next = nextUriRef.current;
      if (next && !preloadedRef.current.has(next)) return;
      setPhotoIndex((i) => (i + 1) % photoCount);
    };
    // 開始を spot.id 由来のオフセットでずらす（同フレームでの一斉切替を避ける）
    const phase = idHash(spot.id) % AUTO_ADVANCE_PHASE_MS;
    let interval: number | undefined;
    const start = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, AUTO_ADVANCE_MS);
    }, AUTO_ADVANCE_MS + phase);
    return () => {
      window.clearTimeout(start);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [photoCount, inView, hovered, selected, reduceMotion, spot.id]);

  // 次の1枚だけ先読みする。全枚数の先読みはしない
  // （写真ありカード×最大6枚を一斉に読むと通信量が跳ねる。投稿写真は長辺1600pxのJPEG）
  const nextUri = photoCount > 1 ? shownPhotos[(photoIndex + 1) % photoCount].uri : null;
  useEffect(() => {
    nextUriRef.current = nextUri;
    if (!inView || !nextUri || typeof window === "undefined") return;
    if (preloadedRef.current.has(nextUri)) return;
    const img = new window.Image();
    img.onload = () => preloadedRef.current.add(nextUri);
    img.src = nextUri;
  }, [nextUri, inView]);

  // クロスフェード: 直前の1枚を下に残したまま、新しい1枚を上に重ねて opacity で入れ替える。
  // フェードは**新しい画像が読み込めてから**始める（時間で始めると、まだ読めていない透明な層が
  // 前の写真を消してカードが下地に抜ける）。読み込みが遅い間は前の写真が出たままになる。
  useEffect(() => {
    if (!currentUri) {
      lastUriRef.current = null;
      setPrevUri(null);
      return;
    }
    if (currentUri === lastUriRef.current) return;
    const prev = lastUriRef.current;
    lastUriRef.current = currentUri;
    if (!prev) {
      setFadedIn(true); // 最初の1枚は下地のグラデーションからそのまま出す
      return;
    }
    setPrevUri(prev);
    setFadedIn(false);
    // onLoad を取り逃したとき用の保険（キャッシュ済み画像など）
    const fallback = window.setTimeout(() => setFadedIn(true), 2500);
    return () => window.clearTimeout(fallback);
  }, [currentUri]);

  // フェード完了後に下の1枚を外す（DOM に残す写真を最大2枚に保つ後始末）
  useEffect(() => {
    if (!fadedIn || !prevUri) return;
    const clear = window.setTimeout(() => setPrevUri(null), CROSSFADE_MS + 80);
    return () => window.clearTimeout(clear);
  }, [fadedIn, prevUri]);

  const stepPhoto = (e: React.MouseEvent, dir: -1 | 1) => {
    e.stopPropagation(); // カードの選択トグルを発火させない
    setPhotoIndex((i) => (i + dir + shownPhotos.length) % shownPhotos.length);
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
      aria-pressed={selected}
      aria-label={spot.name}
      className="sel-card relative w-full p-0 border-none"
      style={{
        borderRadius: "16px",
        aspectRatio: "4 / 5",
        background: "#f0ede4",
        cursor: "pointer",
        isolation: "isolate",
        animationDelay: `${appearDelay}s`,
        boxShadow: selected
          ? "0 16px 36px -16px rgba(90,125,90,.6)"
          : hovered
          ? "0 20px 40px -18px rgba(44,62,45,.45)"
          : "0 10px 26px -16px rgba(44,62,45,.35)",
        transform: hovered ? "translateY(-4px)" : "none",
        transition: "transform .3s cubic-bezier(.2,.7,.2,1), box-shadow .3s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 下地のグラデーション + 写真レイヤー（自動切替はクロスフェード） */}
      <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: "16px" }}>
        {/* 下地のグラデーション。写真の読み込み中も写真なしのときもここが見えるので、
            カードが下地色に白く抜けることがない */}
        <div className="w-full h-full" style={{ background: cardGradient(idHash(spot.id)) }}>
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
            opacity: .08, mixBlendMode: "overlay",
          }} />
        </div>
        {photo && (
          <>
            {/* 下に残す直前の1枚（クロスフェード中だけ存在する） */}
            {prevUri && prevUri !== photo.uri && (
              <Image
                key={prevUri}
                src={prevUri}
                alt=""
                aria-hidden
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
                unoptimized
              />
            )}
            <Image
              key={photo.uri}
              src={photo.uri}
              alt={spot.name}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
              unoptimized
              style={{
                opacity: fadedIn ? 1 : 0,
                transition: `opacity ${CROSSFADE_MS}ms ease`,
              }}
              onLoad={() => {
                preloadedRef.current.add(photo.uri);
                setFadedIn(true); // 読み込めた時点でフェード開始（それまでは前の写真が見えている）
              }}
              onError={() => setBrokenUris((b) => (b.includes(photo.uri) ? b : [...b, photo.uri]))}
            />
          </>
        )}
      </div>

      {/* 左上ラベル: 写真ありは「写真」、写真なしはジャンル。
          写真が無いカードを無地のパネルに見せず、意図した見た目にするための手がかり */}
      <span className="absolute flex items-center gap-[5px]" style={{
        top: "11px", left: "12px", zIndex: 3,
        fontFamily: "var(--font-sans)", fontSize: "9px", letterSpacing: ".18em",
        color: photo ? "rgba(255,255,255,.82)" : "rgba(28,38,24,.62)",
        textTransform: "uppercase",
      }}>
        <span style={{
          width: "5px", height: "5px", borderRadius: "1px",
          background: photo ? "rgba(255,255,255,.7)" : "rgba(28,38,24,.45)", flexShrink: 0,
        }} />
        {photo ? "写真" : genre ?? "スポット"}
      </span>

      {/* Loading spinner */}
      {photoLoading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <span className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Selection overlay + border */}
      {selected && (
        <div className="absolute inset-0 pointer-events-none" style={{
          border: "3px solid #5a7d5a",
          borderRadius: "16px",
          background: "rgba(90,125,90,.16)",
          zIndex: 2,
        }} />
      )}

      {/* Number badge top-right (selection order or route number) */}
      {badgeNum !== undefined && (
        <span className="absolute" style={{
          top: "10px", right: "11px", zIndex: 4,
          width: "27px", height: "27px", borderRadius: "50%",
          display: "grid", placeItems: "center",
          background: "#5a7d5a",
          border: "1.5px solid #fff",
          color: "#fff", fontSize: "12px", fontWeight: 700,
        }}>
          {badgeNum}
        </span>
      )}

      {/* 写真送り（複数枚あるときだけ）: Google 写真 + 許可済み投稿写真のカルーセル */}
      {shownPhotos.length > 1 && (
        <div
          className="absolute flex items-center gap-[7px]"
          style={{ top: "50%", right: "8px", transform: "translateY(-50%)", zIndex: 4, flexDirection: "column" }}
        >
          <button type="button" aria-label="前の写真" onClick={(e) => stepPhoto(e, -1)} style={arrowStyle}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 19V5M6 11l6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span style={{
            fontSize: "9px", letterSpacing: ".08em", color: "rgba(255,255,255,.9)",
            background: "rgba(20,28,16,.45)", borderRadius: "100px", padding: "2px 7px",
            fontFamily: "var(--font-sans)",
          }}>
            {photoIndex + 1}/{shownPhotos.length}
          </span>
          <button type="button" aria-label="次の写真" onClick={(e) => stepPhoto(e, 1)} style={arrowStyle}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M6 13l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Bottom caption: name (toggleable) + credit (Google写真は規約上常に表示・投稿写真はニックネーム) */}
      <div className="absolute left-0 right-0 bottom-0" style={{
        padding: nameVisible ? "38px 14px 14px" : "20px 14px 9px",
        zIndex: 3,
        background: nameVisible
          ? "linear-gradient(0deg, rgba(20,28,16,.62) 0%, rgba(20,28,16,.22) 55%, transparent 100%)"
          : "linear-gradient(0deg, rgba(20,28,16,.4) 0%, transparent 100%)",
        transition: "padding .3s, background .3s",
      }}>
        {nameVisible && (
          <div style={{
            fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "16px",
            lineHeight: 1.32, color: "#f6f4ed", letterSpacing: ".03em",
            textShadow: "0 1px 8px rgba(0,0,0,.3)",
          }}>
            {spot.name}
          </div>
        )}
        {photo && photoCredit(photo) && (
          <p style={{
            fontSize: "8px", color: "rgba(255,255,255,.65)", marginTop: nameVisible ? "3px" : 0,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {photoCredit(photo)}
          </p>
        )}
      </div>
    </div>
  );
}
