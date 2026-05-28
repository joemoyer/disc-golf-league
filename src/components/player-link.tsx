import Link from "next/link";

type PlayerLinkProps = {
  playerId: string;
  displayName: string;
  className?: string;
};

export function PlayerLink({ playerId, displayName, className }: PlayerLinkProps) {
  return (
    <Link href={`/players/${playerId}`} className={className ?? "text-sky-700 hover:underline"}>
      {displayName}
    </Link>
  );
}
