import dynamic from "next/dynamic";
import spotsData from "@/../data/spots.json";
import type { Spot } from "@/types/spot";

const spots = spotsData as Spot[];

// SSRを無効化してLeafletを読み込む（LeafletはSSRで壊れるため）
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">
      地図を読み込み中...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="flex flex-col h-screen">
      <header className="px-4 py-3 bg-white border-b shadow-sm flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-800">那須旅 — 観光ルート提案</h1>
        <p className="text-sm text-gray-500">
          行きたいスポットを選んで、最適なルートを見つけよう（{spots.length}件）
        </p>
      </header>

      <div className="flex-1 relative">
        <Map spots={spots} />
      </div>
    </main>
  );
}
