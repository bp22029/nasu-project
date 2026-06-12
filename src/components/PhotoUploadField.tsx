"use client";

/**
 * 写真選択フィールド（機能3の投稿画面用）
 *
 * ファイル選択 → クライアント側リサイズ（lib/imageResize.ts、長辺1600px JPEG）→
 * プレビュー表示。親には File ではなく**リサイズ済み Blob** を渡す
 * （Storage 無料枠保護のため、生データをそのままアップロードさせない）。
 */
import { useEffect, useRef, useState } from "react";
import { resizeImageToJpeg } from "@/lib/imageResize";

interface PhotoUploadFieldProps {
  photo: Blob | null;
  onChange: (photo: Blob | null) => void;
}

export default function PhotoUploadField({ photo, onChange }: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // プレビュー URL は photo から生成し、差し替え時に必ず revoke する
  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      onChange(await resizeImageToJpeg(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の読み込みに失敗しました");
      onChange(null);
    } finally {
      setProcessing(false);
      // 同じファイルを選び直せるよう input をリセット
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {previewUrl ? (
        <div style={{ position: "relative" }}>
          {/* リサイズ済み Blob のローカルプレビュー（next/image 不要） */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="投稿する写真のプレビュー"
            style={{
              width: "100%",
              aspectRatio: "4 / 3",
              objectFit: "cover",
              borderRadius: "16px",
              border: "1px solid #e5e0d3",
              display: "block",
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{
              position: "absolute", right: "10px", bottom: "10px",
              cursor: "pointer",
              background: "rgba(247,245,240,.95)",
              border: "1px solid #d8d2c0",
              borderRadius: "100px",
              padding: "8px 16px",
              fontSize: "12px", fontWeight: 600, color: "#2c3e2d",
              letterSpacing: ".06em",
              fontFamily: "var(--font-sans)",
            }}
          >
            選び直す
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={processing}
          style={{
            width: "100%",
            cursor: processing ? "default" : "pointer",
            background: "rgba(255,255,255,.72)",
            border: "1.5px dashed #b6cbac",
            borderRadius: "16px",
            padding: "38px 16px",
            textAlign: "center",
            color: "#5a7d5a",
            transition: "border-color .25s, background .25s",
            fontFamily: "var(--font-sans)",
          }}
        >
          <span style={{ display: "block", fontSize: "26px", lineHeight: 1, marginBottom: "10px" }}>＋</span>
          <span style={{ display: "block", fontSize: "13px", fontWeight: 600, letterSpacing: ".08em" }}>
            {processing ? "画像を準備中…" : "写真を選ぶ"}
          </span>
          <span style={{ display: "block", fontSize: "10.5px", color: "#8fa888", marginTop: "6px", letterSpacing: ".04em" }}>
            自動で縮小してからアップロードされます
          </span>
        </button>
      )}

      {error && (
        <p style={{ fontSize: "12px", color: "#e05252", margin: "8px 0 0" }}>{error}</p>
      )}
    </div>
  );
}
