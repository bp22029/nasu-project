/**
 * Supabase Storage の公開 URL ヘルパー（機能3）
 *
 * DB には photo_path（バケット内パス）だけを保存し、URL 化はここに集約する。
 * photos バケットは Public なので署名なしの公開 URL で配信される。
 */
import { getSupabase } from "@/lib/supabase/client";

export function publicPhotoUrl(photoPath: string): string {
  const { data } = getSupabase().storage.from("photos").getPublicUrl(photoPath);
  return data.publicUrl;
}
