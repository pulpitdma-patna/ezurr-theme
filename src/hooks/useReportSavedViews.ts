"use client";

import { useCallback, useState } from "react";
import type { DatePreset } from "@/lib/reports/dateRange";
import type { ReportId } from "@/lib/reports/types";

const STORAGE_KEY = "ezurr_admin_report_views";

export type SavedReportView = {
  id: string;
  name: string;
  reportId: ReportId;
  preset: DatePreset;
  customStart?: string;
  customEnd?: string;
  createdAt: string;
};

function readViews(): SavedReportView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedReportView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useReportSavedViews(reportId?: ReportId) {
  const [views, setViews] = useState<SavedReportView[]>(() => readViews());

  const persist = useCallback((next: SavedReportView[]) => {
    setViews(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const filtered = reportId ? views.filter((view) => view.reportId === reportId) : views;

  function saveView(input: Omit<SavedReportView, "id" | "createdAt">) {
    const view: SavedReportView = {
      ...input,
      id: `view-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    persist([view, ...views].slice(0, 40));
    return view;
  }

  function removeView(id: string) {
    persist(views.filter((view) => view.id !== id));
  }

  return { views: filtered, allViews: views, saveView, removeView };
}
