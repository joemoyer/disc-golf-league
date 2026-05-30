import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  basePath: string;
  pageParam?: string;
  searchParams?: Record<string, string | undefined>;
};

const buildHref = (
  basePath: string,
  page: number,
  pageParam: string,
  searchParams?: Record<string, string | undefined>
) => {
  const params = new URLSearchParams();
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
  }
  params.set(pageParam, String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
};

export function Pagination({ page, totalPages, basePath, pageParam = "page", searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <nav className="flex items-center justify-between gap-2 text-sm" aria-label="Pagination">
      <span className="text-slate-600">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="rounded border bg-white px-3 py-1 hover:bg-slate-50" href={buildHref(basePath, prevPage, pageParam, searchParams)}>
            Previous
          </Link>
        ) : (
          <span className="rounded border px-3 py-1 text-slate-400">Previous</span>
        )}
        {page < totalPages ? (
          <Link className="rounded border bg-white px-3 py-1 hover:bg-slate-50" href={buildHref(basePath, nextPage, pageParam, searchParams)}>
            Next
          </Link>
        ) : (
          <span className="rounded border px-3 py-1 text-slate-400">Next</span>
        )}
      </div>
    </nav>
  );
}
