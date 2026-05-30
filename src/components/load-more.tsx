import Link from "next/link";

type LoadMoreProps = {
  href: string;
  label?: string;
};

export function LoadMore({ href, label = "Load More" }: LoadMoreProps) {
  return (
    <div className="pt-2">
      <Link className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50" href={href}>
        {label}
      </Link>
    </div>
  );
}

export const buildLoadMoreHref = (
  basePath: string,
  params: Record<string, string | number | undefined>
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
};
