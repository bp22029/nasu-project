import { describe, expect, it } from "vitest";
import { PRESET_DEPARTURES } from "@/types/departure";
import { decodeRouteQuery, encodeRouteQuery } from "@/lib/routeQuery";

describe("routeQuery", () => {
  it("プリセット出発地のルート条件を encode/decode で往復できる", () => {
    // 仕様: CLAUDE.md セクション8 ルート条件はURLで表現する。
    const input = {
      spotIds: ["chausu", "cheese-garden"],
      departure: PRESET_DEPARTURES[0],
      tripType: "roundtrip" as const,
      avoidTolls: false,
    };

    const result = decodeRouteQuery(new URLSearchParams(encodeRouteQuery(input)));

    expect(result).toEqual({ ok: true, value: input });
  });

  it("GPS現在地は6桁に丸めて encode/decode できる", () => {
    const result = decodeRouteQuery(
      new URLSearchParams(
        encodeRouteQuery({
          spotIds: ["chausu"],
          departure: {
            id: "current-location",
            name: "現在地",
            lat: 36.1234567,
            lng: 140.7654321,
            description: "GPSで取得",
          },
          tripType: "oneway",
          avoidTolls: true,
        })
      )
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.departure).toMatchObject({
        id: "current-location",
        name: "現在地",
        lat: 36.123457,
        lng: 140.765432,
      });
    }
  });

  it("スポットが空なら不正入力になる", () => {
    const result = decodeRouteQuery(
      new URLSearchParams("spots=&dep=nasushiobara-station&trip=oneway&tolls=0")
    );

    expect(result).toEqual({ ok: false, error: "スポットが指定されていません" });
  });

  it("GPS座標が数値でなければ不正入力になる", () => {
    const result = decodeRouteQuery(
      new URLSearchParams("spots=chausu&dep=gps&lat=abc&lng=140")
    );

    expect(result).toEqual({ ok: false, error: "現在地の座標が不正です" });
  });

  it("tolls は 0 以外を有料道路回避として扱う", () => {
    const withMissingTolls = decodeRouteQuery(
      new URLSearchParams("spots=chausu&dep=nasu-ic&trip=oneway")
    );
    const withOne = decodeRouteQuery(
      new URLSearchParams("spots=chausu&dep=nasu-ic&trip=oneway&tolls=1")
    );

    expect(withMissingTolls.ok && withMissingTolls.value.avoidTolls).toBe(true);
    expect(withOne.ok && withOne.value.avoidTolls).toBe(true);
  });
});
