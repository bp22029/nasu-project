import { NextResponse } from "next/server";
import spotsData from "@/../data/spots.json";
import type { Spot } from "@/types/spot";
import { calculateRoute } from "@/lib/calculateRoute";

const allSpots = spotsData as Spot[];

export async function POST(request: Request) {
  try {
    const body = await request.json() as { spotIds: string[] };
    const { spotIds } = body;

    if (!Array.isArray(spotIds) || spotIds.length < 2) {
      return NextResponse.json(
        { error: "spotIds は2件以上の配列で指定してください" },
        { status: 400 }
      );
    }

    // 選択順を保持したままスポットを取得
    const selectedSpots = spotIds
      .map((id) => allSpots.find((s) => s.id === id))
      .filter((s): s is Spot => s !== undefined);

    if (selectedSpots.length < 2) {
      return NextResponse.json(
        { error: "有効なスポットが2件未満です" },
        { status: 400 }
      );
    }

    const result = await calculateRoute(selectedSpots);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "ルート計算に失敗しました";
    console.error("[/api/route]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
