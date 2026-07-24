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
  emptyMessage?: string;
};

function buildTicks(max: number, count = 4) {
  if (max <= 0) return [0];
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(max - step * i));
}

export function AdminChart({
  values,
  labels = [],
  variant = "bar",
  height = 168,
  className = "",
  color = "#1D1D1F",
  ariaLabel = "Chart",
  formatValue = (v) => v.toLocaleString("en-IN"),
  emptyMessage = "No activity in this period",
}: AdminChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId().replace(/:/g, "");
  const isEmpty = values.length === 0 || values.every((value) => value === 0);
  const max = Math.max(...values, 1);
  const width = 320;
  const padLeft = 36;
  const padRight = 8;
  const padY = 10;
  const chartW = width - padLeft - padRight;
  const chartH = height - padY * 2 - 18;
  const ticks = buildTicks(isEmpty ? 0 : max);

  const points = values.map((value, index) => {
    const x =
      variant === "bar"
        ? padLeft + (index + 0.5) * (chartW / Math.max(values.length, 1))
        : padLeft +
          index * (values.length > 1 ? chartW / (values.length - 1) : 0);
    const y = padY + chartH - (value / max) * chartH;
    return { x, y, value, label: labels[index] ?? String(index + 1) };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const barWidth = Math.max(8, (chartW / Math.max(values.length, 1)) * 0.52);

  if (isEmpty) {
    return (
      <div className={`relative ${className}`}>
        <div
          className="flex flex-col items-center justify-center rounded-lg border border-dashed border-black/[0.08] bg-[#FAFAFB]"
          style={{ minHeight: height }}
          role="img"
          aria-label={ariaLabel}
        >
          <span className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#AEAEB2]">
            {emptyMessage}
          </span>
        </div>
        {labels.length > 0 ? (
          <div className="mt-2 flex justify-between px-1">
            {labels.map((label) => (
              <span
                key={label}
                className="ez-mono text-[8px] uppercase tracking-[0.08em] text-[#C7C7CC]"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

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
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {ticks.map((tick, index) => {
          const y = padY + (index / Math.max(ticks.length - 1, 1)) * chartH;
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#E8E8ED"
                strokeWidth="1"
                strokeDasharray={index === ticks.length - 1 ? undefined : "3 4"}
              />
              <text
                x={padLeft - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-[#AEAEB2] text-[7px]"
                style={{ fontFamily: "var(--font-space-mono), monospace" }}
              >
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={padLeft}
          y1={padY + chartH}
          x2={width - padRight}
          y2={padY + chartH}
          stroke="#D1D1D6"
          strokeWidth="1"
        />

        {variant === "line" ? (
          <>
            <path
              d={`${linePath} L ${points[points.length - 1]?.x ?? padLeft} ${padY + chartH} L ${points[0]?.x ?? padLeft} ${padY + chartH} Z`}
              fill={`url(#${gradId})`}
              stroke="none"
            />
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={hover === index ? 4.5 : 3}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth="2"
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
                height={Math.max(barH, 2)}
                rx={3}
                fill={hover === index ? color : `url(#${gradId})`}
                stroke={hover === index ? color : "transparent"}
                strokeWidth={hover === index ? 1.5 : 0}
                onMouseEnter={() => setHover(index)}
              />
            );
          })
        )}
      </svg>

      {hover !== null && points[hover] ? (
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-md border border-black/[0.08] bg-white px-2.5 py-1.5 text-[11px] shadow-[0_4px_16px_rgba(17,17,19,0.08)]"
          role="tooltip"
        >
          <span className="ez-mono text-[9px] uppercase tracking-[0.1em] text-[#86868B]">
            {points[hover].label}
          </span>
          <div className="mt-0.5 font-semibold tabular-nums text-[#1D1D1F]">
            {formatValue(points[hover].value)}
          </div>
        </div>
      ) : null}

      {labels.length > 0 ? (
        <div className="mt-1 flex justify-between px-1 pl-9">
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
