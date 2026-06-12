"use client";

/**
 * 旅記録の作成ページ（05 — RECORD、機能3）
 *
 * タイトル + 任意コメント + 訪問順のエントリ（スポット, 写真は任意）を1つの旅記録として投稿する。
 * 起点は2つで画面は共通:
 * - /route の「この旅を記録する」→ sessionStorage `nasu-trip-draft`（TripDraft）から
 *   訪問順のスポットがプレフィルされる（route_query も引き継ぎ、trips.route_query に保存）
 * - ホームから直接 → 空の状態からスポットを手動追加
 *
 * 保存は「①写真を全てアップロード → ②trips insert → ③trip_entries insert、
 * ③失敗時は trips を delete」の順序でトランザクションを代替する（CLAUDE.md セクション14）。
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import spotsData from "@/../data/spots.json";
import PageShell from "@/components/PageShell";
import NicknameModal from "@/components/NicknameModal";
import TripEntryEditor, { newDraftEntry, type DraftEntry } from "@/components/TripEntryEditor";
import { ensureSignedInWithProfile } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { TRIP_DRAFT_KEY, TRIP_DRAFT_MAX_AGE_MS, type TripDraft } from "@/types/post";
import type { Spot } from "@/types/spot";

const SPOTS = spotsData as Spot[];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11.5px",
  letterSpacing: ".22em",
  color: "#5a7d5a",
  marginBottom: "10px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,.9)",
  border: "1px solid #d8d2c0",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "14px",
  color: "#2c3e2d",
  outline: "none",
  fontFamily: "var(--font-sans)",
};

export default function TripNewPage() {
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [routeQuery, setRouteQuery] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [nicknameOpen, setNicknameOpen] = useState(false);

  // /route からのプレフィル（TripDraft）を読む。古いドラフトは無視する
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TRIP_DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as TripDraft;
      if (Date.now() - draft.createdAt > TRIP_DRAFT_MAX_AGE_MS) {
        sessionStorage.removeItem(TRIP_DRAFT_KEY);
        return;
      }
      const prefillEntries = draft.spotIds
        .map((id) => SPOTS.find((s) => s.id === id))
        .filter((s): s is Spot => s !== undefined)
        .map(newDraftEntry);
      if (prefillEntries.length > 0) {
        setEntries(prefillEntries);
        setRouteQuery(draft.routeQuery);
        setPrefilled(true);
      }
    } catch {
      // 壊れたドラフトは捨てて空から始める
      sessionStorage.removeItem(TRIP_DRAFT_KEY);
    }
  }, []);

  const canSubmit = title.trim().length >= 1 && entries.length >= 1 && !submitting;

  /** セッション・プロフィール確認後の投稿本体 */
  const doSubmit = async (userId: string) => {
    const supabase = getSupabase();

    // ① 写真を全てアップロード（写真なしエントリは null のまま）
    const uploadedPaths: string[] = [];
    const photoPaths: (string | null)[] = [];
    try {
      for (const entry of entries) {
        if (!entry.photo) {
          photoPaths.push(null);
          continue;
        }
        const path = `${userId}/${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(path, entry.photo, { contentType: "image/jpeg" });
        if (uploadError) {
          throw new Error(`写真のアップロードに失敗しました: ${uploadError.message}`);
        }
        uploadedPaths.push(path);
        photoPaths.push(path);
      }

      // ② 旅記録本体
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert({
          title: title.trim(),
          comment: comment.trim() || null,
          route_query: routeQuery,
        })
        .select("id")
        .single();
      if (tripError || !trip) {
        throw new Error(`旅記録の保存に失敗しました: ${tripError?.message ?? "unknown"}`);
      }

      // ③ エントリ一括 insert。失敗したら trips を消してロールバック相当
      const { error: entriesError } = await supabase.from("trip_entries").insert(
        entries.map((entry, i) => ({
          trip_id: trip.id,
          position: i,
          spot_id: entry.spot.id,
          photo_path: photoPaths[i],
        }))
      );
      if (entriesError) {
        await supabase.from("trips").delete().eq("id", trip.id);
        throw new Error(`旅記録の保存に失敗しました: ${entriesError.message}`);
      }
    } catch (e) {
      // 途中で失敗したらアップロード済み写真を消す（ベストエフォート）
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("photos").remove(uploadedPaths).catch(() => {});
      }
      throw e;
    }

    sessionStorage.removeItem(TRIP_DRAFT_KEY);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { userId, profile } = await ensureSignedInWithProfile();
      if (!profile) {
        setNicknameOpen(true);
        setSubmitting(false);
        return;
      }
      await doSubmit(userId);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNicknameSaved = async (userId: string) => {
    setNicknameOpen(false);
    setSubmitting(true);
    try {
      await doSubmit(userId);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <PageShell backHref="/" backLabel="ホームへ" index="05" indexLabel="RECORD">
        <h1 className="sel-rise" style={{
          fontFamily: "var(--font-serif)", fontWeight: 600,
          fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.2, letterSpacing: ".03em",
          color: "#243019", marginBottom: "14px", animationDelay: ".12s",
        }}>
          旅を記録しました。
        </h1>
        <p className="sel-rise" style={{
          fontSize: "13px", color: "#5a7d5a", letterSpacing: ".05em",
          lineHeight: 1.9, marginBottom: "30px", animationDelay: ".2s",
        }}>
          「{title.trim()}」（{entries.length}スポット）を共有しました。ありがとうございます。
        </p>
        <Link href="/" className="sel-rise" style={{
          display: "inline-flex", alignItems: "center", gap: "12px",
          background: "#2c3e2d", color: "#f3f1ea",
          fontSize: "13.5px", fontWeight: 600, letterSpacing: ".1em",
          padding: "13px 24px", borderRadius: "100px",
          boxShadow: "0 14px 30px -16px rgba(36,48,25,.7)",
          animationDelay: ".26s",
        }}>
          ホームへ戻る
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell backHref="/" backLabel="ホームへ" index="05" indexLabel="RECORD">
      <h1 className="sel-rise" style={{
        fontFamily: "var(--font-serif)", fontWeight: 600,
        fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.2, letterSpacing: ".03em",
        color: "#243019", marginBottom: "12px", animationDelay: ".12s",
      }}>
        あなたの<span style={{ color: "#5a7d5a" }}>旅</span>を記録する。
      </h1>
      <p className="sel-rise" style={{
        fontSize: "12.5px", color: "#8fa888", letterSpacing: ".06em",
        lineHeight: 1.9, marginBottom: "34px", animationDelay: ".18s",
      }}>
        {prefilled
          ? "設計したルートの訪問地が入っています。写真を添えたり、順番を直したりして仕上げましょう。"
          : "訪れたスポットを順番に並べて、ひとつの旅として共有できます。"}
      </p>

      <div className="sel-rise" style={{ maxWidth: "560px", animationDelay: ".24s" }}>
        {/* タイトル */}
        <div style={{ marginBottom: "28px" }}>
          <span style={labelStyle}>TITLE</span>
          <input
            type="text"
            value={title}
            maxLength={60}
            placeholder="例: 春の那須 牧場めぐり"
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* 訪問エントリ */}
        <div style={{ marginBottom: "28px" }}>
          <span style={labelStyle}>SPOTS — 訪問した順に</span>
          <TripEntryEditor spots={SPOTS} entries={entries} onChange={setEntries} />
        </div>

        {/* コメント（任意） */}
        <div style={{ marginBottom: "30px" }}>
          <span style={labelStyle}>COMMENT（任意）</span>
          <textarea
            value={comment}
            maxLength={500}
            rows={4}
            placeholder="旅のふりかえり（500文字まで）"
            onChange={(e) => setComment(e.target.value)}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.7 }}
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
          {submitting ? "投稿中…" : "旅を記録する"}
        </button>
        <p style={{ fontSize: "10.5px", color: "#9a947f", marginTop: "12px", letterSpacing: ".04em", lineHeight: 1.8 }}>
          タイトルとスポット1件以上で投稿できます。写真は任意です。
          投稿はニックネームと一緒に公開されます。
        </p>
      </div>

      <NicknameModal
        open={nicknameOpen}
        onSaved={(profile) => handleNicknameSaved(profile.id)}
        onCancel={() => setNicknameOpen(false)}
      />
    </PageShell>
  );
}
