type RoundScoreCellProps = {
  score: number;
  isDnf?: boolean;
  className?: string;
};

export function RoundScoreCell({ score, isDnf = false, className = "" }: RoundScoreCellProps) {
  if (isDnf) {
    return <span className={`font-medium text-slate-500 ${className}`.trim()}>DNF</span>;
  }
  return <span className={className}>{score}</span>;
}
