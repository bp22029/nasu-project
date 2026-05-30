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
  const { orderedSpots, segments, totalDuration, totalDistance } = result;

  return (
    <div className="px-4 py-3">
      <h2 className="text-sm font-bold text-gray-700 mb-3">
        ルート（{orderedSpots.length}件 / 合計 {formatDuration(totalDuration)} · {formatDistance(totalDistance)}）
      </h2>

      <ol className="space-y-0">
        {orderedSpots.map((spot, i) => (
          <li key={spot.id}>
            {/* スポット行 */}
            <div className="flex items-center gap-3 py-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow">
                {i + 1}
              </div>
              <span className="text-sm font-medium text-gray-800">{spot.name}</span>
            </div>

            {/* 区間情報（最後のスポット以外） */}
            {i < segments.length && (
              <div className="flex items-center gap-2 ml-[14px] pl-6 border-l-2 border-blue-200 py-1">
                <span className="text-lg">🚗</span>
                <span className="text-xs text-gray-500">
                  {formatDuration(segments[i].duration)}（{formatDistance(segments[i].distance)}）
                </span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
