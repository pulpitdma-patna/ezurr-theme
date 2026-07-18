"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

/** Local search string, seeded from `?q=` without an effect. */
export function useSearchQueryParam(param = "q") {
  const searchParams = useSearchParams();
  const urlValue = searchParams.get(param) ?? "";
  const [local, setLocal] = useState<string | null>(null);
  const [seenUrl, setSeenUrl] = useState(urlValue);

  if (urlValue !== seenUrl) {
    setSeenUrl(urlValue);
    setLocal(null);
  }

  return [local ?? urlValue, setLocal as (value: string) => void] as const;
}

/** Reset page to 1 when the filter fingerprint changes (render-time adjust). */
export function usePagedList(filterKey: string) {
  const [page, setPage] = useState(1);
  const [prevKey, setPrevKey] = useState(filterKey);
  if (filterKey !== prevKey) {
    setPrevKey(filterKey);
    setPage(1);
  }
  return [page, setPage] as const;
}
