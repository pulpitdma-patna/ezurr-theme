import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const labelClass =
  "ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]";

const controlClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none transition hover:border-black/[0.12] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:opacity-60";

export function AdminField({
  label,
  hint,
  error,
  htmlFor,
  prefix,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  prefix?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className={labelClass}>{label}</span>
      <div className={`relative mt-1.5 ${prefix ? "flex items-center" : ""}`}>
        {prefix ? (
          <span className="absolute left-3 z-10 text-sm text-[#86868B]">{prefix}</span>
        ) : null}
        <div className={prefix ? "w-full [&_input]:pl-8 [&_select]:pl-8" : "w-full"}>
          {children}
        </div>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-[#B42318]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[#86868B]">{hint}</p>
      ) : null}
    </label>
  );
}

export function AdminInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function AdminTextarea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${controlClass} min-h-[88px] resize-y ${className}`} {...props} />;
}

export function AdminNativeSelect({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${controlClass} ${className}`} {...props}>
      {children}
    </select>
  );
}

export { controlClass as adminControlClass, labelClass as adminLabelClass };
