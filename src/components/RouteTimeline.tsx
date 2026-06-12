import type { RouteResult } from "@/types/route";

interface RouteTimelineProps {
  result: RouteResult;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins}分`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function RouteTimeline({ result }: RouteTimelineProps) {
  const { departure, orderedSpots, tripType, avoidTolls, segments, totalDuration, totalDistance } = result;

  // タイムラインに表示する全ウェイポイント名
  const labels = [
    departure.name,
    ...orderedSpots.map((s) => s.name),
    ...(tripType === "roundtrip" ? [departure.name] : []),
  ];

  return (
    <div style={{ padding: "26px clamp(20px, 4vw, 34px) 28px" }}>
      {/* 有料道路が含まれる場合の注記 */}
      {!avoidTolls && (
        <div className="flex items-center gap-2 flex-wrap" style={{
          background: "#f3ede0", border: "1px solid #d8c79e", borderRadius: "12px",
          padding: "9px 14px", marginBottom: "20px", fontSize: "11.5px", color: "#8a6d2e", letterSpacing: ".04em",
        }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#c39a3e", flexShrink: 0 }} />
          <span className="flex-1" style={{ minWidth: "180px" }}>有料道路が含まれる場合があります。</span>
          <a
            href="https://www.driveplaza.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#8a6d2e", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px", whiteSpace: "nowrap" }}
          >
            料金を調べる ↗
          </a>
        </div>
      )}

      {/* カードヘッダー: 小ラベル + 合計 */}
      <div className="flex items-end justify-between gap-3 flex-wrap" style={{ marginBottom: "20px" }}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "10.5px", letterSpacing: ".26em", color: "#8fa888", textTransform: "uppercase" }}>Itinerary</span>
          <span style={{ fontSize: "12px", letterSpacing: ".14em", color: "#5a7d5a" }}>旅程</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "24px", fontWeight: 700, color: "#2c3e2d", lineHeight: 1 }}>
            {formatDuration(totalDuration)}
          </span>
          <span style={{ fontSize: "11.5px", letterSpacing: ".1em", color: "#8fa888" }}>
            / {formatDistance(totalDistance)}
          </span>
        </div>
      </div>

      <ol>
        {labels.map((label, i) => {
          const isStart = i === 0;
          const isEnd = i === labels.length - 1;
          const isDeparture = isStart || (tripType === "roundtrip" && isEnd);
          const spotNumber = isDeparture ? null : i; // 1-based spot number

          return (
            <li key={i}>
              {/* ウェイポイント行 */}
              <div className="flex items-center gap-3" style={{ padding: "5px 0" }}>
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: "29px", height: "29px", borderRadius: "50%",
                    background: isDeparture ? "#5a7d5a" : "#2c3e2d",
                    color: "#f3f1ea", fontSize: "12px", fontWeight: 700,
                    border: "1.5px solid rgba(255,255,255,.85)",
                    boxShadow: "0 6px 14px -6px rgba(36,48,25,.55)",
                  }}
                >
                  {isDeparture ? (isStart ? "出" : "戻") : spotNumber}
                </div>
                <span style={{
                  fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "15.5px",
                  letterSpacing: ".04em", color: "#243019",
                }}>
                  {label}
                </span>
              </div>

              {/* 区間情報（最後のウェイポイント以外） */}
              {i < segments.length && (
                <div className="flex items-center gap-2" style={{
                  marginLeft: "14px", paddingLeft: "26px", padding: "7px 0 7px 26px",
                  borderLeft: "2px solid #e5e0d3",
                }}>
                  <span style={{ fontSize: "11.5px", letterSpacing: ".1em", color: "#8fa888" }}>
                    車で {formatDuration(segments[i].duration)}
                    <span style={{ opacity: .75 }}>（{formatDistance(segments[i].distance)}）</span>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
