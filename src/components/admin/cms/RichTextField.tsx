"use client";

import { useRef } from "react";

type RichTextFieldProps = {
  value: string;
  onChange: (html: string) => void;
};

export function RichTextField({ value, onChange }: RichTextFieldProps) {
  const ref = useRef<HTMLDivElement>(null);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.1] bg-white">
      <div className="flex flex-wrap gap-1 border-b border-black/[0.06] bg-[#F8F8FA] px-2 py-1.5">
        {(
          [
            ["bold", "B", undefined],
            ["italic", "I", undefined],
            ["insertUnorderedList", "• List", undefined],
            ["createLink", "Link", "https://"],
          ] as const
        ).map(([cmd, label, arg]) => (
          <button
            key={cmd}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              if (cmd === "createLink") {
                const url = window.prompt("Link URL", arg);
                if (url) exec(cmd, url);
              } else {
                exec(cmd);
              }
            }}
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#3A3A3C] hover:bg-white"
          >
            {label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[120px] px-3 py-2 text-sm outline-none"
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={() => {
          if (ref.current) onChange(ref.current.innerHTML);
        }}
      />
    </div>
  );
}
