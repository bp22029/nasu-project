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

  it("固定情報(locks)を encode/decode で往復できる", () => {
    // 仕様: 巡回順の一部固定。lock=<spotId>:<pos> で URL に載る。
    const input = {
      spotIds: ["chausu", "cheese-garden", "rindo"],
      departure: PRESET_DEPARTURES[0],
      tripType: "oneway" as const,
      avoidTolls: true,
      locks: [{ spotId: "cheese-garden", position: 1 }],
    };

    const result = decodeRouteQuery(new URLSearchParams(encodeRouteQuery(input)));

    expect(result).toEqual({ ok: true, value: input });
  });

  it("後方互換: lock パラメータが無ければ locks は付かない", () => {
    const result = decodeRouteQuery(
      new URLSearchParams("spots=chausu,cheese-garden&dep=nasu-ic&trip=oneway&tolls=1")
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toHaveProperty("locks");
    }
  });

  it("不正な固定（範囲外・未選択spot・位置重複）は捨てる", () => {
    // 位置がスポット数(2)を超える / 選択に無い spotId は無効。位置重複は先勝ち。
    const result = decodeRouteQuery(
      new URLSearchParams(
        "spots=chausu,cheese-garden&dep=nasu-ic&trip=oneway&tolls=1&lock=chausu:1,cheese-garden:1,unknown:2,chausu:9"
      )
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.locks).toEqual([{ spotId: "chausu", position: 1 }]);
    }
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
