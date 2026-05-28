import type { PlayerRatingHistoryPoint } from "@/lib/db/queries";
import { formatDiff } from "@/lib/format-diff";

type RatingHistoryChartProps = {
  history: PlayerRatingHistoryPoint[];
};

const CHART_WIDTH = 640;
const CHART_HEIGHT = 200;
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 };

export function RatingHistoryChart({ history }: RatingHistoryChartProps) {
  if (history.length === 0) {
    return <p className="text-sm text-slate-600">No rating history yet. Play a rated round to get started.</p>;
  }

  const ratings = history.map((point) => point.rating);
  const minRating = Math.min(...ratings) - 20;
  const maxRating = Math.max(...ratings) + 20;
  const ratingRange = Math.max(maxRating - minRating, 1);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const points = history.map((point, index) => {
    const x =
      history.length === 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + (index / (history.length - 1)) * plotWidth;
    const y = PADDING.top + plotHeight - ((point.rating - minRating) / ratingRange) * plotHeight;
    return { ...point, x, y };
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="w-full max-w-3xl rounded border bg-white"
        role="img"
        aria-label="Rating over time"
      >
        <line
          x1={PADDING.left}
          y1={PADDING.top + plotHeight}
          x2={PADDING.left + plotWidth}
          y2={PADDING.top + plotHeight}
          stroke="#cbd5e1"
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={PADDING.top + plotHeight}
          stroke="#cbd5e1"
        />
        <text x={4} y={PADDING.top + 4} className="fill-slate-500 text-[10px]">
          {maxRating}
        </text>
        <text x={4} y={PADDING.top + plotHeight} className="fill-slate-500 text-[10px]">
          {minRating}
        </text>
        <polyline fill="none" stroke="#0369a1" strokeWidth="2" points={polyline} />
        {points.map((point) => (
          <g key={point.leagueEventId}>
            <circle cx={point.x} cy={point.y} r="4" fill="#0369a1" />
            <title>
              {point.eventName}: {point.rating} ({point.ratingDelta >= 0 ? "+" : ""}
              {point.ratingDelta})
            </title>
          </g>
        ))}
      </svg>

      <div className="overflow-x-auto">
        <table className="w-full border bg-white text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Event</th>
              <th className="p-2 text-left">Rating</th>
              <th className="p-2 text-left">Change</th>
              <th className="p-2 text-left">Round</th>
            </tr>
          </thead>
          <tbody>
            {history.map((point) => (
              <tr key={point.leagueEventId} className="border-t">
                <td className="p-2">{point.snapshotDate ?? "-"}</td>
                <td className="p-2">{point.eventName}</td>
                <td className="p-2 font-medium">{point.rating}</td>
                <td className="p-2">
                  {point.ratingDelta > 0 ? `+${point.ratingDelta}` : point.ratingDelta}
                </td>
                <td className="p-2">{formatDiff(point.roundDiff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
