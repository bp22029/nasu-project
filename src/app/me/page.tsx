"use client";

/**
 * マイページ（06 — MY PAGE、機能3）
 *
 * 自分の投稿（旅記録・単体投稿）の確認・編集・削除と、ニックネームの変更。
 * - 編集できるのは文章と掲載許可のみ（posts: caption/show_in_grid、
 *   trips: title/comment/show_in_grid）。写真の差し替えは「削除して再投稿」で代替。
 * - 削除は DB 行と Storage の写真の両方を消す → /select グリッドからも自動的に消える
 *   （写真APIは毎回DBを引くため）。
 * - このページでは匿名サインインを発火しない（無駄な匿名MAUを増やさない。
 *   セッションがなければ空状態を表示する）。
 */
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import NicknameModal from "@/components/NicknameModal";
import GridConsentCheckbox from "@/components/GridConsentCheckbox";
import UserPhoto from "@/components/UserPhoto";
import ShareButton from "@/components/ShareButton";
import { formatTripDate } from "@/components/TripCard";
import { useProfile } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { spotNameOf } from "@/lib/spots";
import { deriveRouteTitle, routeSpotIds } from "@/lib/savedRoutes";
import { decodeDiagnosisQuery } from "@/lib/diagnosisQuery";
import type { Post, Trip, SavedRoute, SavedDiagnosis } from "@/types/post";

const sectionLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  fontSize: "11px",
  letterSpacing: ".26em",
  color: "#8fa888",
  textTransform: "uppercase",
  margin: "34px 0 14px",
};

const itemCard: React.CSSProperties = {
  background: "rgba(255,255,255,.85)",
  border: "1px solid rgba(143,168,136,.35)",
  borderRadius: "16px",
  padding: "14px",
  marginBottom: "12px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,.9)",
  border: "1px solid #d8d2c0",
  borderRadius: "10px",
  padding: "9px 12px",
  fontSize: "13.5px",
  color: "#2c3e2d",
  outline: "none",
  fontFamily: "var(--font-sans)",
};

const smallButton = (variant: "primary" | "ghost" | "danger"): React.CSSProperties => ({
  cursor: "pointer",
  border: variant === "ghost" ? "1px solid #d8d2c0" : "none",
  background: variant === "primary" ? "#2c3e2d" : variant === "danger" ? "transparent" : "transparent",
  color: variant === "primary" ? "#f3f1ea" : variant === "danger" ? "#b06a5a" : "#6b6552",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: ".06em",
  padding: "8px 16px",
  borderRadius: "100px",
  fontFamily: "var(--font-sans)",
});

export default function MyPage() {
  const { profile, loading: profileLoading, refresh } = useProfile();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[] | null>(null);
  // 診断結果は 1ユーザー1行（最新のみ）。null=未保存、undefined=未取得
  const [diagnosis, setDiagnosis] = useState<SavedDiagnosis | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [nicknameOpen, setNicknameOpen] = useState(false);

  // 自分の投稿・保存ルート・診断結果を読む（セッションがなければ空のまま）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) { setPosts([]); setTrips([]); setSavedRoutes([]); setDiagnosis(null); }
        return;
      }
      const uid = session.user.id;
      const [postsRes, tripsRes, savedRes, diagRes] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("trips").select("*, trip_entries(*)").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("saved_routes").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
        supabase.from("diagnoses").select("*").eq("user_id", uid).maybeSingle(), // 最新1件
      ]);
      if (cancelled) return;
      if (postsRes.error || tripsRes.error || savedRes.error || diagRes.error) {
        setError(postsRes.error?.message ?? tripsRes.error?.message ?? savedRes.error?.message ?? diagRes.error?.message ?? "読み込みに失敗しました");
        return;
      }
      setPosts((postsRes.data as Post[]) ?? []);
      setTrips((tripsRes.data as unknown as Trip[]) ?? []);
      setSavedRoutes((savedRes.data as SavedRoute[]) ?? []);
      setDiagnosis((diagRes.data as SavedDiagnosis | null) ?? null);
    })();
    return () => { cancelled = true; };
  }, []);

  const loading = profileLoading || posts === null || trips === null || savedRoutes === null || diagnosis === undefined;
  const isEmpty = !profile && (posts?.length ?? 0) === 0 && (trips?.length ?? 0) === 0 && (savedRoutes?.length ?? 0) === 0 && !diagnosis;

  return (
    <PageShell backHref="/" backLabel="ホームへ" indexLabel="MY PAGE">
      <h1 className="sel-rise" style={{
        fontFamily: "var(--font-serif)", fontWeight: 600,
        fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.2, letterSpacing: ".03em",
        color: "#243019", marginBottom: "12px", animationDelay: ".1s",
      }}>
        わたしの<span style={{ color: "#5a7d5a" }}>記録</span>。
      </h1>

      {loading ? (
        <div className="sel-rise flex justify-center" style={{ paddingTop: "10vh", animationDelay: ".16s" }}>
          <span className="animate-spin" style={{
            width: "30px", height: "30px", borderRadius: "50%", display: "inline-block",
            border: "3px solid rgba(90,125,90,.22)", borderTopColor: "#5a7d5a",
          }} />
        </div>
      ) : error ? (
        <p className="sel-rise" style={{ fontSize: "13px", color: "#9a4a3a", letterSpacing: ".05em", animationDelay: ".16s" }}>
          ⚠ {error}
        </p>
      ) : isEmpty ? (
        <div className="sel-rise" style={{ animationDelay: ".16s" }}>
          <p style={{ fontSize: "13.5px", color: "#5a7d5a", letterSpacing: ".05em", lineHeight: 2, marginBottom: "24px", maxWidth: "46ch" }}>
            まだ記録がありません。設計したルートを保存したり、写真や旅を投稿すると、ここに集まっていきます。
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/select" style={{
              display: "inline-flex", background: "#2c3e2d", color: "#f3f1ea",
              fontSize: "13.5px", fontWeight: 600, letterSpacing: ".1em",
              padding: "13px 24px", borderRadius: "100px",
              boxShadow: "0 14px 30px -16px rgba(36,48,25,.7)",
            }}>
              ルートを設計する
            </Link>
            <Link href="/trips/new" style={{
              fontSize: "13px", color: "#5a7d5a", letterSpacing: ".08em",
              textDecoration: "underline", textUnderlineOffset: "4px",
            }}>
              旅を記録する
            </Link>
            <Link href="/post" style={{
              fontSize: "13px", color: "#5a7d5a", letterSpacing: ".08em",
              textDecoration: "underline", textUnderlineOffset: "4px",
            }}>
              写真を投稿する
            </Link>
          </div>
        </div>
      ) : (
        <div className="sel-rise" style={{ maxWidth: "640px", animationDelay: ".16s" }}>
          {/* ニックネーム */}
          <div style={{ ...itemCard, display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: "10.5px", letterSpacing: ".22em", color: "#8fa888", marginBottom: "4px" }}>NICKNAME</span>
              <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "17px", color: "#243019", letterSpacing: ".04em" }}>
                {profile?.nickname ?? "未設定"}
              </span>
            </div>
            <button type="button" onClick={() => setNicknameOpen(true)} style={smallButton("ghost")}>
              変更
            </button>
          </div>
          <p style={{ fontSize: "10.5px", color: "#9a947f", letterSpacing: ".04em", lineHeight: 1.8, margin: "8px 2px 0" }}>
            アカウントはこのブラウザに紐づいています。ブラウザのデータを消すと別のアカウントになります。
          </p>

          {/* 旅タイプ診断（最新1件のみ） */}
          <div style={sectionLabel}>
            <span>DIAGNOSIS — 旅タイプ</span>
            <span style={{ flex: 1, height: "1px", background: "#e5e0d3" }} />
          </div>
          {!diagnosis ? (
            <p style={{ fontSize: "12.5px", color: "#9a947f", letterSpacing: ".04em" }}>
              まだ診断結果がありません。<Link href="/diagnosis" style={{ color: "#5a7d5a", textDecoration: "underline", textUnderlineOffset: "3px" }}>旅タイプ診断</Link>で調べてみましょう。
            </p>
          ) : (
            <MyDiagnosisItem diagnosis={diagnosis} onDeleted={() => setDiagnosis(null)} />
          )}

          {/* 保存したルート（軽量ブックマーク） */}
          <div style={sectionLabel}>
            <span>SAVED ROUTES — 保存したルート</span>
            <span style={{ flex: 1, height: "1px", background: "#e5e0d3" }} />
            <span style={{ letterSpacing: ".1em" }}>{savedRoutes!.length}件</span>
          </div>
          {savedRoutes!.length === 0 ? (
            <p style={{ fontSize: "12.5px", color: "#9a947f", letterSpacing: ".04em" }}>
              まだ保存したルートがありません。ルート画面の「ルートを保存」で残せます。
            </p>
          ) : (
            savedRoutes!.map((route) => (
              <MySavedRouteItem key={route.id} route={route}
                onDeleted={() => setSavedRoutes((prev) => prev!.filter((r) => r.id !== route.id))} />
            ))
          )}

          {/* 旅記録 */}
          <div style={sectionLabel}>
            <span>TRIPS — 旅の記録</span>
            <span style={{ flex: 1, height: "1px", background: "#e5e0d3" }} />
            <span style={{ letterSpacing: ".1em" }}>{trips!.length}件</span>
          </div>
          {trips!.length === 0 ? (
            <p style={{ fontSize: "12.5px", color: "#9a947f", letterSpacing: ".04em" }}>まだ旅の記録がありません。</p>
          ) : (
            trips!.map((trip) => (
              <MyTripItem key={trip.id} trip={trip}
                onDeleted={() => setTrips((prev) => prev!.filter((t) => t.id !== trip.id))} />
            ))
          )}

          {/* 単体投稿 */}
          <div style={sectionLabel}>
            <span>PHOTOS — 単体投稿</span>
            <span style={{ flex: 1, height: "1px", background: "#e5e0d3" }} />
            <span style={{ letterSpacing: ".1em" }}>{posts!.length}件</span>
          </div>
          {posts!.length === 0 ? (
            <p style={{ fontSize: "12.5px", color: "#9a947f", letterSpacing: ".04em" }}>まだ単体投稿がありません。</p>
          ) : (
            posts!.map((post) => (
              <MyPostItem key={post.id} post={post}
                onDeleted={() => setPosts((prev) => prev!.filter((p) => p.id !== post.id))} />
            ))
          )}
        </div>
      )}

      <NicknameModal
        open={nicknameOpen}
        initialNickname={profile?.nickname ?? ""}
        onSaved={() => { setNicknameOpen(false); refresh(); }}
        onCancel={() => setNicknameOpen(false)}
      />
    </PageShell>
  );
}

/** 保存した診断結果の行（最新1件）: 見直す + もう一度共有 + 旅を設計 + 削除 */
function MyDiagnosisItem({ diagnosis, onDeleted }: { diagnosis: SavedDiagnosis; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const decoded = decodeDiagnosisQuery(new URLSearchParams(diagnosis.result_query));
  const type = decoded?.type ?? null;
  const reviewHref = `/diagnosis?${diagnosis.result_query}`;   // 見直す（結果を再表示）
  const designHref = `/select?${diagnosis.result_query}`;      // この結果で旅を設計（/select 診断モード）
  const shareUrl = `${origin}${reviewHref}`;

  const remove = async () => {
    if (!window.confirm("保存した診断結果を削除しますか?")) return;
    setBusy(true);
    const { error } = await getSupabase().from("diagnoses").delete().eq("user_id", diagnosis.user_id);
    if (error) { setBusy(false); setError(`削除に失敗しました: ${error.message}`); return; }
    onDeleted();
  };

  return (
    <div style={itemCard}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div className="relative overflow-hidden" style={{
          width: "56px", height: "56px", borderRadius: "10px", flexShrink: 0, background: "#eef1ea",
        }}>
          {type && <Image src={type.image} alt={type.name} fill sizes="56px" style={{ objectFit: "cover" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={reviewHref} style={{
            display: "block", fontFamily: "var(--font-serif)", fontWeight: 600,
            fontSize: "15px", color: "#243019", letterSpacing: ".03em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {type ? type.name : "診断結果"}
          </Link>
          <span style={{ fontSize: "10.5px", letterSpacing: ".1em", color: "#8fa888" }}>
            {formatTripDate(diagnosis.created_at)}{type ? ` ・ 「${type.animal}」タイプ ・ 見直す →` : ""}
          </span>
        </div>
        <button type="button" onClick={remove} disabled={busy} style={{ ...smallButton("danger"), flexShrink: 0 }}>削除</button>
      </div>

      <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <Link href={designHref} style={{ ...smallButton("ghost"), display: "inline-flex", textDecoration: "none" }}>
          この結果で旅を設計
        </Link>
        {/* 周囲の小ボタン（旅を設計・削除）と仕様を揃える（大きい従属pillにしない・アイコン無し） */}
        <ShareButton
          url={shareUrl}
          title="#NASU 旅タイプ診断"
          text={type ? `私の那須旅タイプは「${type.name}」でした` : "私の那須旅タイプ"}
          label="共有する"
          ariaLabel="この診断結果を共有する"
          buttonStyle={{ ...smallButton("ghost"), display: "inline-flex", alignItems: "center" }}
          buttonClassName=""
          hideIcon
        />
      </div>

      {error && <p style={{ fontSize: "11.5px", color: "#e05252", margin: "8px 0 0" }}>⚠ {error}</p>}
    </div>
  );
}

/** 保存したルートの行: 表示（地図で見る）+ 改名 + 削除 */
function MySavedRouteItem({ route, onDeleted }: { route: SavedRoute; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [savedTitle, setSavedTitle] = useState<string | null>(route.title);
  const [title, setTitle] = useState(route.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayTitle = deriveRouteTitle(route.route_query, savedTitle);
  const autoTitle = deriveRouteTitle(route.route_query, null);
  const spotCount = routeSpotIds(route.route_query).length;

  // 改名: 空にすると null（自動生成名に戻る）。DB の CHECK は 1〜60 文字なので空文字は入れない
  const rename = async () => {
    const next = title.trim() || null;
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().from("saved_routes").update({ title: next }).eq("id", route.id);
    setBusy(false);
    if (error) { setError(`保存に失敗しました: ${error.message}`); return; }
    setSavedTitle(next);
    setEditing(false);
  };

  const remove = async () => {
    if (!window.confirm(`保存したルート「${displayTitle}」を削除しますか?`)) return;
    setBusy(true);
    const { error } = await getSupabase().from("saved_routes").delete().eq("id", route.id);
    if (error) { setBusy(false); setError(`削除に失敗しました: ${error.message}`); return; }
    onDeleted();
  };

  return (
    <div style={itemCard}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div className="relative overflow-hidden" style={{
          width: "56px", height: "56px", borderRadius: "10px", flexShrink: 0,
          display: "grid", placeItems: "center",
          background: "linear-gradient(145deg, #cfe0c6, #8fa888)",
        }}>
          {/* ルート（経路）アイコン */}
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 19V8a3 3 0 013-3h6a3 3 0 013 3" stroke="#2c3e2d" strokeWidth="2" strokeLinecap="round" />
            <circle cx="6" cy="19" r="2.2" fill="#2c3e2d" />
            <circle cx="18" cy="8" r="2.2" fill="#2c3e2d" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/route?${route.route_query}`} style={{
            display: "block", fontFamily: "var(--font-serif)", fontWeight: 600,
            fontSize: "15px", color: "#243019", letterSpacing: ".03em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {displayTitle}
          </Link>
          <span style={{ fontSize: "10.5px", letterSpacing: ".1em", color: "#8fa888" }}>
            {formatTripDate(route.created_at)} ・ {spotCount}スポット ・ 地図で見る →
          </span>
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            <button type="button" onClick={() => setEditing(true)} disabled={busy} style={smallButton("ghost")}>名前</button>
            <button type="button" onClick={remove} disabled={busy} style={smallButton("danger")}>削除</button>
          </div>
        )}
      </div>

      {editing && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <input type="text" value={title} maxLength={60} placeholder={autoTitle}
            onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          <p style={{ fontSize: "10.5px", color: "#9a947f", letterSpacing: ".04em", margin: 0 }}>
            空のままにすると、スポット名から自動でつけた名前（{autoTitle}）に戻ります。
          </p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" disabled={busy} style={smallButton("ghost")}
              onClick={() => { setEditing(false); setTitle(savedTitle ?? ""); setError(null); }}>
              キャンセル
            </button>
            <button type="button" onClick={rename} disabled={busy} style={smallButton("primary")}>
              {busy ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: "11.5px", color: "#e05252", margin: "8px 0 0" }}>⚠ {error}</p>}
    </div>
  );
}

/** 旅記録の行: 表示 + 編集（タイトル/コメント/掲載許可）+ 削除 */
function MyTripItem({ trip, onDeleted }: { trip: Trip; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(trip.title);
  const [comment, setComment] = useState(trip.comment ?? "");
  const [showInGrid, setShowInGrid] = useState(trip.show_in_grid);
  const [saved, setSaved] = useState({ title: trip.title, comment: trip.comment ?? "", showInGrid: trip.show_in_grid });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = [...(trip.trip_entries ?? [])].sort((a, b) => a.position - b.position);
  const thumb = entries.find((e) => e.photo_path)?.photo_path ?? null;

  const save = async () => {
    if (title.trim().length < 1) { setError("タイトルを入力してください"); return; }
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().from("trips")
      .update({ title: title.trim(), comment: comment.trim() || null, show_in_grid: showInGrid })
      .eq("id", trip.id);
    setBusy(false);
    if (error) { setError(`保存に失敗しました: ${error.message}`); return; }
    setSaved({ title: title.trim(), comment: comment.trim(), showInGrid });
    setEditing(false);
  };

  const remove = async () => {
    if (!window.confirm(`旅記録「${saved.title}」を削除しますか?\n含まれる写真もすべて削除されます。`)) return;
    setBusy(true);
    const supabase = getSupabase();
    const photoPaths = entries.map((e) => e.photo_path).filter((p): p is string => p !== null);
    const { error } = await supabase.from("trips").delete().eq("id", trip.id); // entries は cascade
    if (error) { setBusy(false); setError(`削除に失敗しました: ${error.message}`); return; }
    if (photoPaths.length > 0) {
      await supabase.storage.from("photos").remove(photoPaths).catch(() => {});
    }
    onDeleted();
  };

  return (
    <div style={itemCard}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div className="relative overflow-hidden" style={{
          width: "56px", height: "56px", borderRadius: "10px", flexShrink: 0,
          background: "linear-gradient(145deg, #cfe0c6, #8fa888)",
        }}>
          {thumb && <UserPhoto path={thumb} alt={saved.title} sizes="56px" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/trips/${trip.id}`} style={{
            display: "block", fontFamily: "var(--font-serif)", fontWeight: 600,
            fontSize: "15px", color: "#243019", letterSpacing: ".03em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {saved.title}
          </Link>
          <span style={{ fontSize: "10.5px", letterSpacing: ".1em", color: "#8fa888" }}>
            {formatTripDate(trip.created_at)} ・ {entries.length}スポット{saved.showInGrid ? "" : " ・ グリッド非掲載"}
          </span>
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            <button type="button" onClick={() => setEditing(true)} disabled={busy} style={smallButton("ghost")}>編集</button>
            <button type="button" onClick={remove} disabled={busy} style={smallButton("danger")}>削除</button>
          </div>
        )}
      </div>

      {editing && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <input type="text" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          <textarea value={comment} maxLength={500} rows={3} placeholder="旅のふりかえり（任意）"
            onChange={(e) => setComment(e.target.value)} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} />
          <GridConsentCheckbox checked={showInGrid} onChange={setShowInGrid} />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" disabled={busy} style={smallButton("ghost")}
              onClick={() => { setEditing(false); setTitle(saved.title); setComment(saved.comment); setShowInGrid(saved.showInGrid); setError(null); }}>
              キャンセル
            </button>
            <button type="button" onClick={save} disabled={busy} style={smallButton("primary")}>
              {busy ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: "11.5px", color: "#e05252", margin: "8px 0 0" }}>⚠ {error}</p>}
    </div>
  );
}

/** 単体投稿の行: 表示 + 編集（キャプション/掲載許可）+ 削除 */
function MyPostItem({ post, onDeleted }: { post: Post; onDeleted: () => void }) {
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption ?? "");
  const [showInGrid, setShowInGrid] = useState(post.show_in_grid);
  const [saved, setSaved] = useState({ caption: post.caption ?? "", showInGrid: post.show_in_grid });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const { error } = await getSupabase().from("posts")
      .update({ caption: caption.trim() || null, show_in_grid: showInGrid })
      .eq("id", post.id);
    setBusy(false);
    if (error) { setError(`保存に失敗しました: ${error.message}`); return; }
    setSaved({ caption: caption.trim(), showInGrid });
    setEditing(false);
  };

  const remove = async () => {
    if (!window.confirm(`${spotNameOf(post.spot_id)}の写真を削除しますか?`)) return;
    setBusy(true);
    const supabase = getSupabase();
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) { setBusy(false); setError(`削除に失敗しました: ${error.message}`); return; }
    await supabase.storage.from("photos").remove([post.photo_path]).catch(() => {});
    onDeleted();
  };

  return (
    <div style={itemCard}>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div className="relative overflow-hidden" style={{ width: "56px", height: "56px", borderRadius: "10px", flexShrink: 0, background: "#e5e0d3" }}>
          <UserPhoto path={post.photo_path} alt={spotNameOf(post.spot_id)} sizes="56px" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: "block", fontFamily: "var(--font-serif)", fontWeight: 600,
            fontSize: "15px", color: "#243019", letterSpacing: ".03em",
          }}>
            {spotNameOf(post.spot_id)}
          </span>
          <span style={{
            display: "block", fontSize: "11px", color: "#8fa888", letterSpacing: ".04em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {saved.caption || "（キャプションなし）"}{saved.showInGrid ? "" : " ・ グリッド非掲載"}
          </span>
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
            <button type="button" onClick={() => setEditing(true)} disabled={busy} style={smallButton("ghost")}>編集</button>
            <button type="button" onClick={remove} disabled={busy} style={smallButton("danger")}>削除</button>
          </div>
        )}
      </div>

      {editing && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <textarea value={caption} maxLength={200} rows={2} placeholder="ひとことメモ（任意）"
            onChange={(e) => setCaption(e.target.value)} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }} />
          <GridConsentCheckbox checked={showInGrid} onChange={setShowInGrid} />
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button type="button" disabled={busy} style={smallButton("ghost")}
              onClick={() => { setEditing(false); setCaption(saved.caption); setShowInGrid(saved.showInGrid); setError(null); }}>
              キャンセル
            </button>
            <button type="button" onClick={save} disabled={busy} style={smallButton("primary")}>
              {busy ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: "11.5px", color: "#e05252", margin: "8px 0 0" }}>⚠ {error}</p>}
    </div>
  );
}
