"use client";

import { useId, useState } from "react";

type AdminChartProps = {
  values: number[];
  labels?: string[];
  variant?: "bar" | "line";
  height?: number;
  className?: string;
  color?: string;
  ariaLabel?: string;
  formatValue?: (value: number) => string;
};

export function AdminChart({
  values,
  labels = [],
  variant = "bar",
  height = 140,
  className = "",
  color = "#1D1D1F",
  ariaLabel = "Chart",
  formatValue = (v) => v.toLocaleString("en-IN"),
}: AdminChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId().replace(/:/g, "");
  const max = Math.max(...values, 1);
  const width = 320;
  const padX = 8;
  const padY = 12;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = values.map((value, index) => {
    const x =
      variant === "bar"
        ? padX + (index + 0.5) * (chartW / values.length)
        : padX + index * (values.length > 1 ? chartW / (values.length - 1) : 0);
    const y = padY + chartH - (value / max) * chartH;
    return { x, y, value, label: labels[index] ?? String(index + 1) };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const barWidth = Math.max(8, (chartW / values.length) * 0.55);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={ariaLabel}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {variant === "line" ? (
          <>
            <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
            {points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={hover === index ? 4.5 : 3}
                fill={color}
                onMouseEnter={() => setHover(index)}
              />
            ))}
          </>
        ) : (
          points.map((point, index) => {
            const barH = (point.value / max) * chartH;
            return (
              <rect
                key={index}
                x={point.x - barWidth / 2}
                y={padY + chartH - barH}
                width={barWidth}
                height={Math.max(barH, 1)}
                rx={2}
                fill={hover === index ? color : `url(#${gradId})`}
                stroke={color}
                strokeWidth={hover === index ? 1.5 : 0}
                onMouseEnter={() => setHover(index)}
              />
            );
          })
        )}
      </svg>

      {hover !== null && points[hover] ? (
        <div
          className="pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-md border border-black/[0.08] bg-white px-2 py-1 text-[11px] shadow-sm"
          role="tooltip"
        >
          <span className="ez-mono text-[9px] uppercase tracking-[0.1em] text-[#86868B]">
            {points[hover].label}
          </span>
          <div className="font-semibold text-[#1D1D1F]">{formatValue(points[hover].value)}</div>
        </div>
      ) : null}

      {labels.length > 0 ? (
        <div className="mt-1 flex justify-between px-1">
          {labels.map((label) => (
            <span
              key={label}
              className="ez-mono text-[8px] uppercase tracking-[0.08em] text-[#AEAEB2]"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
