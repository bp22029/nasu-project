"use client";

/**
 * 投稿写真の表示（機能3）
 *
 * Supabase Storage のバケット内パス（photo_path）を受け取り、
 * publicPhotoUrl() で公開URLに変換して next/image で表示する。
 * 親要素に position: relative と寸法（または aspect-ratio）が必要。
 * Vercel の画像最適化枠を使わないため unoptimized（Google写真と同方針）。
 */
import Image from "next/image";
import { publicPhotoUrl } from "@/lib/photoUrl";

interface UserPhotoProps {
  path: string;
  alt: string;
  sizes?: string;
}

export default function UserPhoto({ path, alt, sizes = "100vw" }: UserPhotoProps) {
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
