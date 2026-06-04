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
  const { departure, orderedSpots, tripType, segments, totalDuration, totalDistance } = result;

  // タイムラインに表示する全ウェイポイント名
  const labels = [
    departure.name,
    ...orderedSpots.map((s) => s.name),
    ...(tripType === "roundtrip" ? [departure.name] : []),
  ];

  const modeLabel = tripType === "roundtrip" ? "周遊（出発地へ戻る）" : "片道";

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-700">
          ルート（{orderedSpots.length}スポット / {modeLabel}）
        </h2>
        <span className="text-xs text-gray-500">
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
                    ${isDeparture ? "bg-green-600 text-white" : "bg-blue-600 text-white"}`}
                >
                  {isDeparture ? (isStart ? "出" : "戻") : spotNumber}
                </div>
                <span className="text-sm font-medium text-gray-800">{label}</span>
              </div>

              {/* 区間情報（最後のウェイポイント以外） */}
              {i < segments.length && (
                <div className="flex items-center gap-2 ml-[14px] pl-6 border-l-2 border-blue-200 py-1">
                  <span className="text-base">🚗</span>
                  <span className="text-xs text-gray-500">
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
