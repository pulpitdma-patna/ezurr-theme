"use client";

import { useMemo, useState } from "react";
import type { AdminOrder } from "@/data/admin";
import {
  DATE_PRESET_OPTIONS,
  latestOrderAnchor,
  resolveDateRange,
  type DatePreset,
  type DateRange,
} from "@/lib/reports/dateRange";

export function useReportFilters(orders: AdminOrder[], defaultPreset: DatePreset = "30d") {
  const anchor = useMemo(() => latestOrderAnchor(orders), [orders]);
  const [preset, setPreset] = useState<DatePreset>(defaultPreset);
  const [customStart, setCustomStart] = useState(anchor);
  const [customEnd, setCustomEnd] = useState(anchor);

  const range: DateRange = useMemo(
    () =>
      resolveDateRange(preset, anchor, {
        start: customStart,
        end: customEnd,
      }),
    [preset, anchor, customStart, customEnd],
  );

  return {
    preset,
    setPreset,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    range,
    anchor,
    presetOptions: DATE_PRESET_OPTIONS,
  };
}
