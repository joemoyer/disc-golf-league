import { PlayerLink } from "@/components/player-link";

export type HighlightPlayer = {
  playerId: string;
  playerName: string;
};

type HighlightPlayerListProps = {
  players: HighlightPlayer[];
};

export function HighlightPlayerList({ players }: HighlightPlayerListProps) {
  if (players.length === 0) {
    return <p className="mt-1 text-lg font-semibold">-</p>;
  }

  return (
    <ul className="mt-1 space-y-1 text-lg font-semibold">
      {players.map((entry) => (
        <li key={entry.playerId}>
          <PlayerLink playerId={entry.playerId} displayName={entry.playerName} className="text-slate-900 hover:underline" />
        </li>
      ))}
    </ul>
  );
}
