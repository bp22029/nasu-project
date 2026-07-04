import type { RouteResult } from "@/types/route";

interface RouteTimelineProps {
  result: RouteResult;
  // 固定中のスポットID集合（親が URL から算出して渡す）
  lockedSpotIds?: Set<string>;
  // スポット行の「固定/解除」トグル。position は訪問順の位置（1始まり）。
  // 省略時は固定UI自体を表示しない（読み取り専用表示に使える）。
  onToggleLock?: (spotId: string, position: number) => void;
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

export default function RouteTimeline({ result, lockedSpotIds, onToggleLock }: RouteTimelineProps) {
  const { departure, orderedSpots, tripType, avoidTolls, segments, totalDuration, totalDistance } = result;

  // タイムラインに表示する全ウェイポイント名
  const labels = [
    departure.name,
    ...orderedSpots.map((s) => s.name),
    ...(tripType === "roundtrip" ? [departure.name] : []),
  ];

  // 固定UIは 2 スポット以上のときだけ意味がある（1 スポットは順番の概念がない）
  const showLockUI = Boolean(onToggleLock) && orderedSpots.length >= 2;

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

      {/* 巡回順の一部固定の使い方（固定UIが有効なときだけ） */}
      {showLockUI && (
        <p style={{
          fontSize: "11px", letterSpacing: ".06em", color: "#8fa888",
          lineHeight: 1.7, marginBottom: "14px",
        }}>
          スポットの「固定」を押すと、その順番を保ったまま残りを自動で並べ直します。
        </p>
      )}

      <ol>
        {labels.map((label, i) => {
          const isStart = i === 0;
          const isEnd = i === labels.length - 1;
          const isDeparture = isStart || (tripType === "roundtrip" && isEnd);
          const spotNumber = isDeparture ? null : i; // 1-based spot number
          // スポット行のみ: 固定対象のスポットと固定状態
          const spot = isDeparture ? null : orderedSpots[i - 1];
          const isLocked = spot ? Boolean(lockedSpotIds?.has(spot.id)) : false;

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

                {/* 巡回順の固定トグル（スポット行のみ・2件以上のとき） */}
                {showLockUI && spot && spotNumber !== null && (
                  <button
                    type="button"
                    onClick={() => onToggleLock?.(spot.id, spotNumber)}
                    aria-pressed={isLocked}
                    aria-label={isLocked
                      ? `${label}の順番固定を解除する`
                      : `${label}を${spotNumber}番目に固定する`}
                    title={isLocked ? "この順番の固定を解除" : "この順番で固定する"}
                    style={{
                      marginLeft: "auto", flexShrink: 0,
                      display: "inline-flex", alignItems: "center", gap: "5px",
                      cursor: "pointer",
                      background: isLocked ? "#2c3e2d" : "transparent",
                      color: isLocked ? "#f3f1ea" : "#8fa888",
                      border: `1.5px solid ${isLocked ? "#2c3e2d" : "#cdd8c4"}`,
                      borderRadius: "100px",
                      padding: "5px 11px",
                      fontSize: "10.5px", fontWeight: 600, letterSpacing: ".08em",
                      fontFamily: "var(--font-sans)",
                      transition: "background .15s, color .15s, border-color .15s",
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24"
                      fill={isLocked ? "currentColor" : "none"}
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    {isLocked ? "固定中" : "固定"}
                  </button>
                )}
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
