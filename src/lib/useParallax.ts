"use client";

import { useEffect, useRef } from "react";

// ポインタ位置に追従して data-depth に応じたパララックス移動を与える。
// 返り値の ref 配列を各レイヤーの <div ref={...} data-depth="20"> に割り当てる。
export function useParallax(count: number) {
  const layers = useRef<(HTMLDivElement | null)[]>(Array.from({ length: count }, () => null));

  useEffect(() => {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };
    let raf: number;
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      for (const l of layers.current) {
        if (!l) continue;
        const d = parseFloat(l.dataset.depth ?? "0");
        l.style.transform = `translate(${cx * d}px, ${cy * d}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove as EventListener);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove as EventListener);
      cancelAnimationFrame(raf);
    };
  }, []);

  return layers;
}
