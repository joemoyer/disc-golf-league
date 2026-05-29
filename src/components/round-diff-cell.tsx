import { StatIcon } from "@/components/stat-icon";
import { formatDiff } from "@/lib/format-diff";

type RoundDiffCellContentProps = {
  diff: number;
  isBestRound?: boolean;
  className?: string;
};

export function RoundDiffCellContent({ diff, isBestRound = false, className = "" }: RoundDiffCellContentProps) {
  return (
    <div className={`relative inline-flex items-center justify-center pr-1 pt-1 ${className}`.trim()}>
      {formatDiff(diff)}
      {isBestRound ? (
        <span
          className="absolute right-0 top-0 z-10 translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-px shadow ring-1 ring-slate-200"
          title="Personal best round"
        >
          <StatIcon kind="best_round" className="h-3 w-3" />
        </span>
      ) : null}
    </div>
  );
}
