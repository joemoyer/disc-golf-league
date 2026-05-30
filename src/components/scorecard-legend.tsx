import { MiniGameIcon } from "@/components/mini-game-icon";
import { StatIcon } from "@/components/stat-icon";
import { MINI_GAME_KINDS } from "@/lib/mini-games";

const LEGEND_ENTRIES = [
  ...MINI_GAME_KINDS.map((entry) => ({
    key: entry.kind,
    label: entry.label,
    icon: <MiniGameIcon kind={entry.kind} className="h-3 w-3" />,
  })),
  {
    key: "best_round",
    label: "Personal Best Round",
    icon: <StatIcon kind="best_round" className="h-3 w-3" />,
  },
] as const;

export function ScorecardLegend() {
  return (
    <div className="rounded border bg-white p-3 text-sm text-slate-700">
      <h3 className="mb-2 font-medium text-slate-900">Legend</h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {LEGEND_ENTRIES.map((entry) => (
          <li key={entry.key} className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-white p-px shadow ring-1 ring-slate-200">
              {entry.icon}
            </span>
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
