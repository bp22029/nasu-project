"use client";

/**
 * 写真の切り抜き調整モーダル（機能3）
 *
 * 投稿写真をドラッグで位置調整・ピンチ/スライダーで拡大縮小してから確定する。
 * react-easy-crop を使用（タッチのピンチ操作・マウスホイールに対応）。
 *
 * 切り抜き枠は「縦 4:5」（/select グリッドのカードと同じ比率）と「横 4:3」
 * （旅記録詳細などの横向き表示に合う）から選べ、**写真の向きから自動で初期選択**する。
 * 縦長写真を横枠に強制すると、グリッド表示時に二重切り抜きになって
 * 画質と構図が損なわれるため（ユーザー指摘、2026-06-12）。
 * 「切り抜かずに使う」で元の縦横比のままアップロードもできる。
 */
import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { cropImageToJpeg, resizeImageToJpeg, type CropArea } from "@/lib/imageResize";

// 縦はグリッドカード（4:5）、横は詳細ページ等（4:3）に合わせる
const ASPECTS = {
  portrait: { ratio: 4 / 5, label: "縦 4:5" },
  landscape: { ratio: 4 / 3, label: "横 4:3" },
} as const;

type AspectKey = keyof typeof ASPECTS;

interface CropModalProps {
  /** 切り抜き対象の元ファイル。null のときは何も描画しない */
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

export default function CropModal({ file, onCancel, onCropped }: CropModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [aspect, setAspect] = useState<AspectKey>("landscape");
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

  const changeAspect = (key: AspectKey) => {
    if (key === aspect) return;
    setAspect(key);
    // 枠が変わるので位置・倍率は初期化する
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

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

  // 切り抜かずに元の縦横比のまま使う（縮小のみ）
  const handleSkipCrop = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onCropped(await resizeImageToJpeg(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の処理に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const aspectButtonStyle = (selected: boolean): React.CSSProperties => ({
    cursor: "pointer",
    background: selected ? "#2c3e2d" : "rgba(255,255,255,.8)",
    border: `1px solid ${selected ? "#2c3e2d" : "#d8d2c0"}`,
    borderRadius: "100px",
    padding: "7px 16px",
    fontSize: "12px",
    fontWeight: 600,
    color: selected ? "#f3f1ea" : "#5a7d5a",
    letterSpacing: ".06em",
    transition: "background .2s, border-color .2s",
    fontFamily: "var(--font-sans)",
  });

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
        <p style={{ fontSize: "11.5px", color: "#8fa888", margin: "0 0 12px", letterSpacing: ".04em", lineHeight: 1.7 }}>
          ドラッグで位置を、ピンチやスライダーで大きさを調整できます。
        </p>

        {/* 枠の向き切替 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          {(Object.keys(ASPECTS) as AspectKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => changeAspect(key)}
              aria-pressed={aspect === key}
              style={aspectButtonStyle(aspect === key)}
            >
              {ASPECTS[key].label}
            </button>
          ))}
        </div>

        {/* 切り抜きエリア（コンテナは固定高、枠の比率は aspect に追従） */}
        <div style={{
          position: "relative",
          width: "100%",
          height: "min(340px, 48vh)",
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
            aspect={ASPECTS[aspect].ratio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_area, areaPixels) => setCropPixels(areaPixels)}
            onMediaLoaded={(mediaSize) => {
              // 写真の向きに合わせて枠の初期値を決める（縦長写真→縦枠）。
              // 二重切り抜き（横枠→グリッドの縦カード）を避けるため
              setAspect(mediaSize.naturalHeight > mediaSize.naturalWidth ? "portrait" : "landscape");
              setError(null);
            }}
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

        {/* 切り抜かない選択肢（元の縦横比のまま） */}
        <button
          type="button"
          onClick={handleSkipCrop}
          disabled={busy}
          style={{
            display: "block", width: "100%", marginTop: "12px",
            cursor: "pointer", background: "none", border: "none",
            fontSize: "12px", color: "#5a7d5a", letterSpacing: ".06em",
            textDecoration: "underline", textUnderlineOffset: "4px",
            fontFamily: "var(--font-sans)",
          }}
        >
          切り抜かずに元の比率のまま使う
        </button>
      </div>
    </div>
  );
}
