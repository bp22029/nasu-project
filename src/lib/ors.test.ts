import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDirectionsGeoJSON, getDurationMatrix } from "@/lib/ors";

describe("ors", () => {
  beforeEach(() => {
    vi.stubEnv("ORS_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("Matrix API に座標と有料道路回避オプションを送り durations を返す", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ durations: [[0, 10], [12, 0]] }),
    } as Response);

    await expect(
      getDurationMatrix(
        [
          [140.0, 37.0],
          [140.1, 37.1],
        ],
        true
      )
    ).resolves.toEqual([[0, 10], [12, 0]]);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      locations: [
        [140.0, 37.0],
        [140.1, 37.1],
      ],
      metrics: ["duration"],
      options: { avoid_features: ["tollways"] },
    });
  });

  it("Directions API は avoidTolls=false のとき options を送らない", async () => {
    const geojson = { type: "FeatureCollection", features: [] };
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => geojson,
    } as Response);

    await expect(getDirectionsGeoJSON([[140, 37]], false)).resolves.toBe(geojson);

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      coordinates: [[140, 37]],
    });
  });

  it("APIキー未設定なら fetch せず例外にする", async () => {
    vi.stubEnv("ORS_API_KEY", "");

    await expect(getDurationMatrix([[140, 37]], false)).rejects.toThrow(
      "ORS_API_KEY が設定されていません"
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("APIエラー時はステータスと本文を含めて例外にする", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limit",
    } as Response);

    await expect(getDirectionsGeoJSON([[140, 37]], false)).rejects.toThrow(
      "ORS Directions API エラー 429: rate limit"
    );
  });
});
