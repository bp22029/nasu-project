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

  const modeLabel = tripType === "roundtrip" ? "周遊（出発地へ戻る）" : "片道";

  return (
    <div className="px-6 py-4">
      {/* 有料道路が含まれる場合の注記 */}
      {!avoidTolls && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800">
          <span>🛣️</span>
          <span className="flex-1">有料道路が含まれる場合があります。</span>
          <a
            href="https://www.driveplaza.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#5a7d5a] underline underline-offset-1 whitespace-nowrap"
          >
            料金を調べる↗
          </a>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[#2c3e2d]">
          ルート（{orderedSpots.length}スポット / {modeLabel}）
        </h2>
        <span className="text-xs text-[#6b7d6b]">
          {formatDuration(totalDuration)} · {formatDistance(totalDistance)}
        </span>
      </div>

      <ol className="space-y-0">
        {labels.map((label, i) => {
          const isStart = i === 0;
          const isEnd = i === labels.length - 1;
          const isDeparture = isStart || (tripType === "roundtrip" && isEnd);
          const spotNumber = isDeparture ? null : i; // 1-based spot number

          return (
            <li key={i}>
              {/* ウェイポイント行 */}
              <div className="flex items-center gap-3 py-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow text-xs font-bold
                    ${isDeparture ? "bg-[#5a7d5a] text-white" : "bg-[#2c3e2d] text-white"}`}
                >
                  {isDeparture ? (isStart ? "出" : "戻") : spotNumber}
                </div>
                <span className="text-sm font-medium text-[#2c3e2d]">{label}</span>
              </div>

              {/* 区間情報（最後のウェイポイント以外） */}
              {i < segments.length && (
                <div className="flex items-center gap-2 ml-[14px] pl-6 border-l-2 border-[#e5e0d3] py-1">
                  <span className="text-base">🚗</span>
                  <span className="text-xs text-[#6b7d6b]">
                    {formatDuration(segments[i].duration)}（{formatDistance(segments[i].distance)}）
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
