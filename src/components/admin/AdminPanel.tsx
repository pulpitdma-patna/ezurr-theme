import type { ReactNode } from "react";

type AdminPanelProps = {
  title?: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
};

export function AdminPanel({
  title,
  meta,
  action,
  children,
  className = "",
  bodyClassName = "",
  flush = false,
}: AdminPanelProps) {
  const hasHeader = title || meta || action;

  return (
    <section
      className={`overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)] ${className}`}
    >
      {hasHeader ? (
        <div className="flex items-center justify-between gap-3 border-b border-black/[0.05] bg-[#FAFAFB] px-3.5 py-2.5 sm:px-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[13px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
                {title}
              </h2>
            ) : null}
            {meta ? <div className="mt-0.5">{meta}</div> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={flush ? bodyClassName : `p-3.5 sm:p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
