export const MINI_GAME_KINDS = [
  { kind: "closest_to_pin", label: "Closest to Pin" },
  { kind: "longest_putt", label: "Longest Putt" },
  { kind: "shortest_drive", label: "Shortest Drive" },
] as const;

export type MiniGameKind = (typeof MINI_GAME_KINDS)[number]["kind"];

const MINI_GAME_KIND_SET = new Set<string>(MINI_GAME_KINDS.map((entry) => entry.kind));

export const isMiniGameKind = (value: string): value is MiniGameKind =>
  MINI_GAME_KIND_SET.has(value);

export const getMiniGameLabel = (kind: string) =>
  MINI_GAME_KINDS.find((entry) => entry.kind === kind)?.label ?? kind;

export type MiniGameWinDisplay = {
  kind: string;
  prize: string | null;
};

export const miniGameCellKey = (playerId: string, holeNumber: number) => `${playerId}:${holeNumber}`;

export const buildMiniGameWinsByCell = (
  wins: { playerId: string; holeNumber: number; kind: string; prize: string | null }[]
) => {
  const map = new Map<string, MiniGameWinDisplay[]>();
  for (const win of wins) {
    const key = miniGameCellKey(win.playerId, win.holeNumber);
    const existing = map.get(key) ?? [];
    existing.push({ kind: win.kind, prize: win.prize });
    map.set(key, existing);
  }
  return map;
};
