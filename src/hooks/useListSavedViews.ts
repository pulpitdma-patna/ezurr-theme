"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "ezurr_admin_list_views";

export type SavedListView = {
  id: string;
  name: string;
  listId: "orders" | "products";
  query: string;
  filters: Record<string, string>;
  createdAt: string;
};

function readViews(): SavedListView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedListView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useListSavedViews(listId: SavedListView["listId"]) {
  const [views, setViews] = useState<SavedListView[]>(() =>
    readViews().filter((view) => view.listId === listId),
  );

  const persist = useCallback(
    (next: SavedListView[]) => {
      const others = readViews().filter((view) => view.listId !== listId);
      const all = [...next, ...others].slice(0, 40);
      setViews(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      } catch {
        /* ignore */
      }
    },
    [listId],
  );

  function saveView(input: { name: string; query: string; filters: Record<string, string> }) {
    const view: SavedListView = {
      id: `lv-${Date.now()}`,
      listId,
      name: input.name.trim() || "Saved view",
      query: input.query,
      filters: input.filters,
      createdAt: new Date().toISOString(),
    };
    persist([view, ...views].slice(0, 12));
    return view;
  }

  function removeView(id: string) {
    persist(views.filter((view) => view.id !== id));
  }

  return { views, saveView, removeView };
}
