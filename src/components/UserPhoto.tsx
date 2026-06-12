"use client";

/**
 * 投稿写真の表示（機能3）
 *
 * Supabase Storage のバケット内パス（photo_path）を受け取り、
 * publicPhotoUrl() で公開URLに変換して表示する。
 * - 既定: next/image の fill（親要素に position: relative と寸法が必要）。サムネ等の固定枠用
 * - natural: 写真の縦横比のまま表示（旅記録詳細など。投稿者が決めた構図を枠で再度切らない）
 * Vercel の画像最適化枠を使わないため unoptimized / 素の img（Google写真と同方針）。
 */
import Image from "next/image";
import { publicPhotoUrl } from "@/lib/photoUrl";

interface UserPhotoProps {
  path: string;
  alt: string;
  sizes?: string;
  /** true なら元の縦横比のまま表示（width 100% / height auto） */
  natural?: boolean;
}

export default function UserPhoto({ path, alt, sizes = "100vw", natural = false }: UserPhotoProps) {
  if (natural) {
    // 寸法が事前に分からないため next/image は使わない（unoptimized 方針なので不利益もない）
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={publicPhotoUrl(path)}
        alt={alt}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    );
  }
  return (
    <Image
      src={publicPhotoUrl(path)}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover"
      unoptimized
    />
  );
}
