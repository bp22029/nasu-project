import type { RouteResult } from "@/types/route";

interface RouteTimelineProps {
  result: RouteResult;
  // 固定中のスポットID集合（親が URL から算出して渡す）
  lockedSpotIds?: Set<string>;
  // スポットの訪問順を指定位置に固定（position=1..N）／解除（position=null）。
  // 省略時は固定UI自体を表示しない（読み取り専用表示に使える）。
  onSetLock?: (spotId: string, position: number | null) => void;
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

export default function RouteTimeline({ result, lockedSpotIds, onSetLock }: RouteTimelineProps) {
  const { departure, orderedSpots, tripType, avoidTolls, segments, totalDuration, totalDistance } = result;

  // タイムラインに表示する全ウェイポイント名
  const labels = [
    departure.name,
    ...orderedSpots.map((s) => s.name),
    ...(tripType === "roundtrip" ? [departure.name] : []),
  ];

  // 固定UIは 2 スポット以上のときだけ意味がある（1 スポットは順番の概念がない）
  const showLockUI = Boolean(onSetLock) && orderedSpots.length >= 2;
  // 訪問順セレクトの選択肢（1..スポット数）
  const positionOptions = Array.from({ length: orderedSpots.length }, (_, k) => k + 1);

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
          行きたい順番を選ぶと、その順番に固定して残りを自動で並べ直します（「自動」で解除）。
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

                {/* 巡回順セレクト（スポット行のみ・2件以上のとき）。
                    「自動」＝固定なし、数字＝その訪問順に固定。固定中スポットは表示位置＝固定位置。 */}
                {showLockUI && spot && spotNumber !== null && (
                  <div
                    className="flex items-center"
                    style={{ marginLeft: "auto", flexShrink: 0, gap: "6px" }}
                  >
                    {/* 固定中を示す南京錠アイコン（未固定時はグレー） */}
                    <svg width="11" height="11" viewBox="0 0 24 24"
                      aria-hidden="true"
                      fill={isLocked ? "#2c3e2d" : "none"}
                      stroke={isLocked ? "#2c3e2d" : "#cdd8c4"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <select
                      aria-label={`${label}の訪問順を選ぶ`}
                      value={isLocked ? String(spotNumber) : ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        onSetLock?.(spot.id, v === "" ? null : Number(v));
                      }}
                      style={{
                        cursor: "pointer",
                        background: isLocked ? "rgba(44,62,45,.08)" : "rgba(255,255,255,.7)",
                        color: isLocked ? "#2c3e2d" : "#5a7d5a",
                        border: `1.5px solid ${isLocked ? "#2c3e2d" : "#cdd8c4"}`,
                        borderRadius: "100px",
                        padding: "4px 10px",
                        fontSize: "11px", fontWeight: 600, letterSpacing: ".04em",
                        fontFamily: "var(--font-sans)",
                        transition: "border-color .15s, background .15s, color .15s",
                      }}
                    >
                      <option value="">自動</option>
                      {positionOptions.map((n) => (
                        <option key={n} value={n}>{n}番目に行く</option>
                      ))}
                    </select>
                  </div>
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
