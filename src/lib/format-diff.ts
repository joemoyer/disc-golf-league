export const formatDiff = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
};
