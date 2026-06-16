import { describe, expect, it, vi } from "vitest";

describe("spots", () => {
  it("既定では debug データを使う", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SPOTS_MODE", "");

    const { SPOTS } = await import("@/lib/spots");

    expect(SPOTS).toHaveLength(13);
    expect(SPOTS.some((s) => s.id === "cheese-garden")).toBe(true);
  });

  it("full モードでは full データを使う", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SPOTS_MODE", "full");

    const { SPOTS } = await import("@/lib/spots");

    expect(SPOTS.length).toBeGreaterThan(13);
    expect(SPOTS.some((s) => s.id === "s-84833a78")).toBe(true);
  });

  it("debug モードでも full 側にしかない id の名前へフォールバックする", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SPOTS_MODE", "");

    const { spotNameOf } = await import("@/lib/spots");

    expect(spotNameOf("s-84833a78")).toBe("Alma Cafe");
    expect(spotNameOf("unknown")).toBe("（削除されたスポット）");
  });
});
