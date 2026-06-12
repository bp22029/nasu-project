/**
 * 投稿写真のクライアント側切り抜き + リサイズ（機能3）
 *
 * Supabase Storage 無料枠（1GB / 帯域5GB月）を守るため、アップロード前に
 * 必ずここを通す: 長辺 1600px に縮小し JPEG (quality 0.82) で再エンコード。
 * 1枚 200〜400KB 程度になり、1GB で約3,000枚相当。
 * スマホの生データ（3〜10MB）をそのまま上げてはいけない。
 */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/** react-easy-crop が返す元画像ピクセル基準の切り抜き範囲 */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 元画像の指定範囲を切り抜いて JPEG に変換する（CropModal の確定時に使う）。
 * 出力も長辺 1600px に収める（無料枠保護の方針はそのまま）。
 */
export async function cropImageToJpeg(file: File, crop: CropArea): Promise<Blob> {
  const bitmap = await decodeImage(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(crop.width, crop.height));
    const width = Math.max(1, Math.round(crop.width * scale));
    const height = Math.max(1, Math.round(crop.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像の処理に失敗しました（canvas 未対応）");
    ctx.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) throw new Error("画像の変換に失敗しました");
    return blob;
  } finally {
    if ("close" in bitmap) bitmap.close();
  }
}

/**
 * createImageBitmap が使えればそれを、なければ <img> 経由でデコードする。
 * HEIC 等ブラウザがデコードできない形式はここで例外になる
 * （呼び出し側で「JPEG/PNG を選んでください」と案内する）。
 */
async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // フォールバックへ
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("この画像形式は使えません。JPEG または PNG を選んでください。");
  } finally {
    URL.revokeObjectURL(url);
  }
}
