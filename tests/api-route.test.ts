import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateRoute } from "@/lib/calculateRoute";

vi.mock("@/lib/spots", () => ({
  SPOTS: [
    {
      id: "chausu",
      name: "茶臼岳",
      lat: 37.1,
      lng: 140.1,
      placeId: "p1",
      tags: [],
      description: "山",
    },
  ],
}));

vi.mock("@/lib/calculateRoute", () => ({
  calculateRoute: vi.fn(),
}));

const validBody = {
  spotIds: ["chausu"],
  departure: { lat: 37, lng: 140, name: "出発地" },
  tripType: "oneway",
  avoidTolls: true,
};

async function post(body: unknown) {
  const { POST } = await import("@/app/api/route/route");
  return POST(
    new Request("http://localhost/api/route", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

describe("POST /api/route", () => {
  beforeEach(() => {
    vi.mocked(calculateRoute).mockResolvedValue({
      ok: true,
    } as never);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("spotIds が空なら 400 を返す", async () => {
    const res = await post({ ...validBody, spotIds: [] });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "spotIds は1件以上の配列で指定してください",
    });
  });

  it("departure が欠けていれば 400 を返す", async () => {
    const res = await post({ ...validBody, departure: undefined });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "departure (lat, lng, name) が必要です",
    });
  });

  it("tripType が不正なら 400 を返す", async () => {
    const res = await post({ ...validBody, tripType: "loop" });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "tripType は 'roundtrip' または 'oneway'",
    });
  });

  it("有効なスポットがなければ 400 を返す", async () => {
    const res = await post({ ...validBody, spotIds: ["missing"] });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "有効なスポットが見つかりません",
    });
  });

  it("正常系では calculateRoute の結果を 200 で返す", async () => {
    vi.mocked(calculateRoute).mockResolvedValue({ route: "ok" } as never);

    const res = await post(validBody);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ route: "ok" });
    expect(calculateRoute).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "chausu",
        }),
      ],
      validBody.departure,
      "oneway",
      true
    );
  });

  it("calculateRoute が失敗したら 500 を返す", async () => {
    vi.mocked(calculateRoute).mockRejectedValue(new Error("ORS failed"));

    const res = await post(validBody);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "ORS failed" });
  });
});
