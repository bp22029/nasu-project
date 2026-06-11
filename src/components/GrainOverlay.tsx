// 紙のようなグレインテクスチャ。スタート画面は absolute、選択画面は fixed で使う。
export default function GrainOverlay({ fixed = false }: { fixed?: boolean }) {
  return (
    <div
      className={`${fixed ? "fixed" : "absolute"} inset-0 pointer-events-none`}
      style={{
        zIndex: 1, opacity: 0.035, mixBlendMode: "multiply",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
      }}
    />
  );
}
