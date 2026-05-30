"use client";

import { useFormStatus } from "react-dom";

export function ImportSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex items-center gap-2 rounded bg-slate-900 px-3 py-2 text-white disabled:cursor-wait disabled:opacity-70"
      type="submit"
      disabled={pending}
    >
      {pending ? (
        <>
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            aria-hidden
          />
          Importing…
        </>
      ) : (
        "Import Scores"
      )}
    </button>
  );
}
