import { NextResponse } from "next/server";
import { SPOTS } from "@/lib/spots";
import type { Spot } from "@/types/spot";
import type { TripType } from "@/types/departure";
import type { SpotLock } from "@/types/route";
import { calculateRoute } from "@/lib/calculateRoute";

const allSpots = SPOTS;

interface RequestBody {
  spotIds: string[];
  departure: { lat: number; lng: number; name: string };
  tripType: TripType;
  avoidTolls: boolean;
  // 巡回順の一部固定（任意）。不正・矛盾する制約は calculateRoute / solveTSP 側で安全に無視される。
  locks?: SpotLock[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as RequestBody;
    const { spotIds, departure, tripType, avoidTolls, locks } = body;

    if (!Array.isArray(spotIds) || spotIds.length < 1) {
      return NextResponse.json({ error: "spotIds は1件以上の配列で指定してください" }, { status: 400 });
    }
    if (!departure?.lat || !departure?.lng || !departure?.name) {
      return NextResponse.json({ error: "departure (lat, lng, name) が必要です" }, { status: 400 });
    }
    if (tripType !== "roundtrip" && tripType !== "oneway") {
      return NextResponse.json({ error: "tripType は 'roundtrip' または 'oneway'" }, { status: 400 });
    }

    const selectedSpots = spotIds
      .map((id) => allSpots.find((s) => s.id === id))
      .filter((s): s is Spot => s !== undefined);

    if (selectedSpots.length < 1) {
      return NextResponse.json({ error: "有効なスポットが見つかりません" }, { status: 400 });
    }

    const validLocks = Array.isArray(locks) ? locks : undefined;
    const result = await calculateRoute(selectedSpots, departure, tripType, avoidTolls ?? true, validLocks);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "ルート計算に失敗しました";
    console.error("[/api/route]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
