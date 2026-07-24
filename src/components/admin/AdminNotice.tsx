type Tone = "info" | "demo" | "error";

const TONES: Record<Tone, string> = {
  info: "border-black/[0.08] bg-[#F7F7F8] text-[#6E6E73]",
  demo: "border-[#F4D8A8] bg-[#FEF6E7] text-[#8A5A00]",
  error: "border-[#F5C2C0] bg-[#FDECEC] text-[#B42318]",
};

/**
 * Small inline banner for admin pages. `demo` warns that a surface runs on
 * local seed data (not persisted to the API); `error` surfaces a failure.
 */
export function AdminNotice({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={`mb-3 rounded-xl border px-3 py-2 text-[11px] font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </div>
  );
}
