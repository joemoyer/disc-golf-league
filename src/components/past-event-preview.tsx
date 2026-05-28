import Link from "next/link";
import { PlayerLink } from "@/components/player-link";
import type { PastEventPreview } from "@/lib/db/queries";
import { formatDiff } from "@/lib/format-diff";

type PastEventPreviewCardProps = {
  preview: PastEventPreview;
};

export function PastEventPreviewCard({ preview }: PastEventPreviewCardProps) {
  return (
    <article className="rounded border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">
            <Link href={`/events/${preview.id}`} className="text-sky-700 hover:underline">
              {preview.name}
            </Link>
          </h3>
          <p className="text-sm text-slate-600">
            {preview.eventDate ?? "Date TBD"} · {preview.courseName}
          </p>
        </div>
        <Link href={`/events/${preview.id}`} className="text-sm text-sky-700 hover:underline">
          Full results →
        </Link>
      </div>

      {preview.topThree.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No scores recorded yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="p-1 text-left">Player</th>
                <th className="p-1 text-center">Score</th>
                <th className="p-1 text-center">Diff</th>
                {preview.holeNumbers.map((holeNumber) => (
                  <th key={holeNumber} className="p-1 text-center text-xs font-normal text-slate-500">
                    {holeNumber}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.topThree.map((row) => (
                <tr key={row.playerId} className="border-t">
                  <td className="p-1">
                    <PlayerLink playerId={row.playerId} displayName={row.displayName} />
                  </td>
                  <td className="p-1 text-center">{row.totalScore}</td>
                  <td className="p-1 text-center">{formatDiff(row.totalDiff)}</td>
                  {preview.holeNumbers.map((holeNumber) => {
                    const holeScore = row.holeScores.find((h) => h.holeNumber === holeNumber);
                    return (
                      <td key={holeNumber} className="p-1 text-center">
                        {holeScore?.score ?? "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
