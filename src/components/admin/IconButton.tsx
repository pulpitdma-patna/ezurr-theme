"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

const tones = {
  ghost:
    "border-black/[0.08] bg-white text-[#424245] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]",
  solid: "border-transparent bg-[#1D1D1F] text-white hover:bg-[#2C2C2E]",
  soft: "border-transparent bg-[#F0F0F2] text-[#1D1D1F] hover:bg-[#E8E8ED]",
} as const;

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  tone?: keyof typeof tones;
  size?: "sm" | "md";
  children: ReactNode;
};

export function IconButton({
  label,
  tone = "ghost",
  size = "sm",
  className = "",
  children,
  ...props
}: IconButtonProps) {
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:opacity-40 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path
        d="M1.5 7.5S3.5 3.5 7.5 3.5 13.5 7.5 13.5 7.5 11.5 11.5 7.5 11.5 1.5 7.5 1.5 7.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M8.5 2.5l3 3L4.75 12H1.75v-3L8.5 2.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7 1.5v7M4.5 4.5L7 1.5l2.5 3M2.5 9.5v2h9v-2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
