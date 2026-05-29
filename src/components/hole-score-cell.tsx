import { MiniGameIconBadge } from "@/components/mini-game-icon";
import type { MiniGameWinDisplay } from "@/lib/mini-games";

type HoleScoreCellContentProps = {
  score: number;
  par: number;
  miniGameWins?: MiniGameWinDisplay[];
};

export function HoleScoreCellContent({ score, par, miniGameWins = [] }: HoleScoreCellContentProps) {
  const isBirdie = score < par;
  const isEagleOrBetter = score <= par - 2;
  const isBogey = score > par;
  const bogeyAmount = score - par;
  const isAce = score === 1;

  const scoreContent = isAce ? (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-yellow-700 bg-yellow-200 text-yellow-900">
      {score}
    </span>
  ) : isEagleOrBetter ? (
    <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-800 bg-blue-200 text-blue-900">
      <span className="absolute inset-[2px] rounded-full border border-blue-800" />
      <span className="relative z-10">{score}</span>
    </span>
  ) : isBirdie ? (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-700 bg-sky-100 text-sky-900">
      {score}
    </span>
  ) : isBogey && bogeyAmount >= 2 ? (
    <span className="relative inline-flex h-8 w-8 items-center justify-center border border-red-800 bg-red-200 text-red-950">
      <span className="absolute inset-[2px] border border-red-800" />
      <span className="relative z-10">{score}</span>
    </span>
  ) : isBogey ? (
    <span className="inline-flex h-7 w-7 items-center justify-center border border-red-700 bg-red-100 text-red-900">
      {score}
    </span>
  ) : (
    <span className="inline-flex min-h-7 min-w-7 items-center justify-center px-0.5">{score}</span>
  );

  return (
    <div className="relative inline-flex items-center justify-center pr-1 pt-1">
      {scoreContent}
      {miniGameWins.length > 0 ? (
        <span className="absolute right-0 top-0 z-10 flex translate-x-1/2 -translate-y-1/2 flex-row-reverse items-start -space-x-1.5">
          {miniGameWins.map((win, index) => (
            <MiniGameIconBadge key={`${win.kind}-${index}`} kind={win.kind} prize={win.prize} overlay />
          ))}
        </span>
      ) : null}
    </div>
  );
}
