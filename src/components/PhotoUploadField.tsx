"use client";

/**
 * 写真選択フィールド（機能3の投稿画面用）
 *
 * ファイル選択 → 切り抜き調整モーダル（CropModal: ドラッグ/ピンチで自由に調整）→
 * 確定した範囲を JPEG 化してプレビュー表示。親には File ではなく
 * **切り抜き・縮小済み Blob** を渡す（Storage 無料枠保護のため、生データを上げない）。
 * 元ファイルを保持しているので「範囲を調整」でいつでも切り抜き直せる。
 */
import { useEffect, useRef, useState } from "react";
import CropModal from "@/components/CropModal";

interface PhotoUploadFieldProps {
  photo: Blob | null;
  onChange: (photo: Blob | null) => void;
}

const previewButtonStyle: React.CSSProperties = {
  cursor: "pointer",
  background: "rgba(247,245,240,.95)",
  border: "1px solid #d8d2c0",
  borderRadius: "100px",
  padding: "8px 14px",
  fontSize: "12px",
  fontWeight: 600,
  color: "#2c3e2d",
  letterSpacing: ".06em",
  fontFamily: "var(--font-sans)",
};

export default function PhotoUploadField({ photo, onChange }: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // 切り抜き直しのために元ファイルを保持する
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
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

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setRawFile(file);
    setCropOpen(true); // 選んだらまず切り抜き調整へ
    // 同じファイルを選び直せるよう input をリセット
    if (inputRef.current) inputRef.current.value = "";
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
          {/* 切り抜き済み Blob のローカルプレビュー（next/image 不要）。
              枠で再度切らず、確定した縦横比のまま見せる */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="投稿する写真のプレビュー"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: "16px",
              border: "1px solid #e5e0d3",
              display: "block",
            }}
          />
          <div style={{ position: "absolute", right: "10px", bottom: "10px", display: "flex", gap: "8px" }}>
            {rawFile && (
              <button type="button" onClick={() => setCropOpen(true)} style={previewButtonStyle}>
                範囲を調整
              </button>
            )}
            <button type="button" onClick={() => inputRef.current?.click()} style={previewButtonStyle}>
              選び直す
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            width: "100%",
            cursor: "pointer",
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
            写真を選ぶ
          </span>
          <span style={{ display: "block", fontSize: "10.5px", color: "#8fa888", marginTop: "6px", letterSpacing: ".04em" }}>
            選んだあとに表示範囲を自由に調整できます
          </span>
        </button>
      )}

      {/* 切り抜き調整モーダル */}
      <CropModal
        file={cropOpen ? rawFile : null}
        onCancel={() => setCropOpen(false)}
        onCropped={(blob) => {
          onChange(blob);
          setCropOpen(false);
        }}
      />
    </div>
  );
}
