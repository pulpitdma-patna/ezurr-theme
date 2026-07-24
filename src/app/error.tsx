"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for observability; replace with a real logger when available.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">Something went wrong</h1>
      <p className="max-w-md text-sm text-[#6E6E73]">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-10 items-center rounded-xl bg-[#1D1D1F] px-5 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  );
}
