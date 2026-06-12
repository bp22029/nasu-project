"use client";

/**
 * 写真の切り抜き調整モーダル（機能3）
 *
 * 投稿写真をドラッグで位置調整・ピンチ/スライダーで拡大縮小してから確定する
 * （自動の中央切り抜きだと意図しない構図になるため。ユーザー要望、2026-06-12）。
 * react-easy-crop を使用（タッチのピンチ操作・マウスホイールに対応）。
 * 確定時に lib/imageResize.ts の cropImageToJpeg で切り抜き + 長辺1600px JPEG 化する。
 *
 * アスペクト比は 4:3 固定（投稿プレビューと旅記録詳細の表示比率に合わせる）。
 */
import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { cropImageToJpeg, type CropArea } from "@/lib/imageResize";

const ASPECT = 4 / 3;

interface CropModalProps {
  /** 切り抜き対象の元ファイル。null のときは何も描画しない */
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

export default function CropModal({ file, onCancel, onCropped }: CropModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<CropArea | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropPixels(null);
    setError(null);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file || !imageUrl) return null;

  const handleConfirm = async () => {
    if (!cropPixels || busy) return;
    setBusy(true);
    setError(null);
    try {
      onCropped(await cropImageToJpeg(file, cropPixels));
    } catch (e) {
      setError(e instanceof Error ? e.message : "切り抜きに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="写真の切り抜き調整"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(44,62,45,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "#f7f5f0",
        borderRadius: "20px",
        border: "1px solid #e5e0d3",
        boxShadow: "0 24px 60px -24px rgba(36,48,25,.55)",
        padding: "20px",
        fontFamily: "var(--font-sans)",
      }}>
        <h2 style={{
          fontFamily: "var(--font-serif)", fontSize: "17px", fontWeight: 600,
          color: "#2c3e2d", letterSpacing: ".06em", margin: "0 0 6px",
        }}>
          写真の範囲を調整
        </h2>
        <p style={{ fontSize: "11.5px", color: "#8fa888", margin: "0 0 14px", letterSpacing: ".04em", lineHeight: 1.7 }}>
          ドラッグで位置を、ピンチやスライダーで大きさを調整できます。
        </p>

        {/* 切り抜きエリア */}
        <div style={{
          position: "relative",
          width: "100%",
          aspectRatio: "4 / 3",
          borderRadius: "14px",
          overflow: "hidden",
          background: "#1c241a",
        }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={4}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, areaPixels) => setCropPixels(areaPixels)}
            onMediaLoaded={() => setError(null)}
          />
        </div>

        {/* ズームスライダー */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "14px 2px 0" }}>
          <span style={{ fontSize: "10.5px", letterSpacing: ".18em", color: "#8fa888" }}>ZOOM</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1, accentColor: "#5a7d5a" }}
            aria-label="拡大縮小"
          />
        </div>

        {error && (
          <p style={{ fontSize: "12px", color: "#e05252", margin: "10px 0 0" }}>⚠ {error}</p>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1, cursor: "pointer",
              background: "transparent", border: "1px solid #d8d2c0",
              borderRadius: "12px", padding: "12px 0",
              fontSize: "13px", color: "#6b6552", letterSpacing: ".06em",
              fontFamily: "var(--font-sans)",
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!cropPixels || busy}
            style={{
              flex: 1.4, cursor: cropPixels && !busy ? "pointer" : "default",
              background: cropPixels && !busy ? "#2c3e2d" : "#b9b49f",
              border: "none", borderRadius: "12px", padding: "12px 0",
              fontSize: "13px", fontWeight: 700, color: "#f3f1ea", letterSpacing: ".08em",
              transition: "background .25s",
              fontFamily: "var(--font-sans)",
            }}
          >
            {busy ? "処理中…" : "この範囲で使う"}
          </button>
        </div>
      </div>
    </div>
  );
}
