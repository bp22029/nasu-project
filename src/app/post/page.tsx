"use client";

/**
 * 単体投稿ページ（05 — POST、機能3）
 *
 * 写真1枚 + スポット（部分一致検索で選択）+ 任意キャプションを投稿する。
 * 認証は遅延発火: 「投稿する」を押した瞬間に匿名サインインし、
 * ニックネーム未設定なら NicknameModal を挟んでから投稿を続行する。
 *
 * 保存先: Supabase Storage `photos/{user_id}/{uuid}.jpg` + posts テーブル。
 * 投稿写真は自前ストレージなので Google 規約の制約外（CLAUDE.md セクション5は不変）。
 */
import Link from "next/link";
import { useState } from "react";
import PageShell from "@/components/PageShell";
import SpotSearchPicker from "@/components/SpotSearchPicker";
import PhotoUploadField from "@/components/PhotoUploadField";
import NicknameModal from "@/components/NicknameModal";
import GridConsentCheckbox from "@/components/GridConsentCheckbox";
import { ensureSignedInWithProfile } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase/client";
import { SPOTS } from "@/lib/spots";
import type { Spot } from "@/types/spot";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11.5px",
  letterSpacing: ".22em",
  color: "#5a7d5a",
  marginBottom: "10px",
};

export default function PostPage() {
  const [spot, setSpot] = useState<Spot | null>(null);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [caption, setCaption] = useState("");
  const [showInGrid, setShowInGrid] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [nicknameOpen, setNicknameOpen] = useState(false);

  const canSubmit = spot !== null && photo !== null && !submitting;

  /** セッション・プロフィール確認後の投稿本体 */
  const doSubmit = async (userId: string) => {
    if (!spot || !photo) return;
    const supabase = getSupabase();
    const photoPath = `${userId}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(photoPath, photo, { contentType: "image/jpeg" });
    if (uploadError) {
      throw new Error(`写真のアップロードに失敗しました: ${uploadError.message}`);
    }

    const { error: insertError } = await supabase.from("posts").insert({
      spot_id: spot.id,
      photo_path: photoPath,
      caption: caption.trim() || null,
      show_in_grid: showInGrid,
    });
    if (insertError) {
      // DB 行が作れなかったら写真も消しておく（孤児ファイル防止のベストエフォート）
      await supabase.storage.from("photos").remove([photoPath]);
      throw new Error(`投稿の保存に失敗しました: ${insertError.message}`);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const { userId, profile } = await ensureSignedInWithProfile();
      if (!profile) {
        // ニックネーム未設定 → モーダルで入力後に onSaved から再開
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

  const handleNicknameSaved = async (profileUserId: string) => {
    setNicknameOpen(false);
    setSubmitting(true);
    try {
      await doSubmit(profileUserId);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <PageShell backHref="/" backLabel="ホームへ" index="05" indexLabel="POST">
        <h1 className="sel-rise" style={{
          fontFamily: "var(--font-serif)", fontWeight: 600,
          fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.2, letterSpacing: ".03em",
          color: "#243019", marginBottom: "14px", animationDelay: ".12s",
        }}>
          投稿しました。
        </h1>
        <p className="sel-rise" style={{
          fontSize: "13px", color: "#5a7d5a", letterSpacing: ".05em",
          lineHeight: 1.9, marginBottom: "30px", animationDelay: ".2s",
        }}>
          {spot?.name} の写真を共有しました。ありがとうございます。
        </p>
        <div className="sel-rise flex items-center gap-4 flex-wrap" style={{ animationDelay: ".26s" }}>
          <button
            type="button"
            onClick={() => {
              setSpot(null);
              setPhoto(null);
              setCaption("");
              setDone(false);
            }}
            style={{
              cursor: "pointer",
              background: "#2c3e2d", color: "#f3f1ea", border: "none",
              fontSize: "13.5px", fontWeight: 600, letterSpacing: ".1em",
              padding: "13px 24px", borderRadius: "100px",
              boxShadow: "0 14px 30px -16px rgba(36,48,25,.7)",
              fontFamily: "var(--font-sans)",
            }}
          >
            もう一枚投稿する
          </button>
          <Link href="/" style={{
            fontSize: "13px", color: "#5a7d5a", letterSpacing: ".08em",
            textDecoration: "underline", textUnderlineOffset: "4px",
          }}>
            ホームへ戻る
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell backHref="/" backLabel="ホームへ" index="05" indexLabel="POST">
      <h1 className="sel-rise" style={{
        fontFamily: "var(--font-serif)", fontWeight: 600,
        fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.2, letterSpacing: ".03em",
        color: "#243019", marginBottom: "12px", animationDelay: ".12s",
      }}>
        一枚の<span style={{ color: "#5a7d5a" }}>那須</span>を残す。
      </h1>
      <p className="sel-rise" style={{
        fontSize: "12.5px", color: "#8fa888", letterSpacing: ".06em",
        lineHeight: 1.9, marginBottom: "34px", animationDelay: ".18s",
      }}>
        旅先で出会った景色を、スポットと一緒に共有できます。
      </p>

      <div className="sel-rise" style={{ maxWidth: "560px", animationDelay: ".24s" }}>
        {/* 写真 */}
        <div style={{ marginBottom: "28px" }}>
          <span style={labelStyle}>PHOTO</span>
          <PhotoUploadField photo={photo} onChange={setPhoto} />
        </div>

        {/* スポット */}
        <div style={{ marginBottom: "28px" }}>
          <span style={labelStyle}>SPOT</span>
          <SpotSearchPicker spots={SPOTS} selected={spot} onSelect={setSpot} />
        </div>

        {/* キャプション（任意） */}
        <div style={{ marginBottom: "30px" }}>
          <span style={labelStyle}>COMMENT（任意）</span>
          <textarea
            value={caption}
            maxLength={200}
            rows={3}
            placeholder="ひとことメモ（200文字まで）"
            onChange={(e) => setCaption(e.target.value)}
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

        {/* グリッド掲載の許可（初期値ON） */}
        <div style={{ marginBottom: "30px" }}>
          <GridConsentCheckbox checked={showInGrid} onChange={setShowInGrid} />
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
          {submitting ? "投稿中…" : "投稿する"}
        </button>
        <p style={{ fontSize: "10.5px", color: "#9a947f", marginTop: "12px", letterSpacing: ".04em", lineHeight: 1.8 }}>
          投稿はニックネームと一緒に公開されます。メールアドレス等の登録は不要です。
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
