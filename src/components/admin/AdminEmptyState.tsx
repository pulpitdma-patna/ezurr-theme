import type { ReactNode } from "react";

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/[0.1] bg-white px-6 py-14 text-center">
      <p className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-[#6E6E73]">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
