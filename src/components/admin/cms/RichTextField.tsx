"use client";

import { useRef, useState } from "react";
import { sanitizeHtml } from "@/lib/cms/sanitizeHtml";
import { MediaLibraryPicker } from "@/components/admin/MediaLibraryPicker";

type RichTextFieldProps = {
  value: string;
  onChange: (html: string) => void;
};

export function RichTextField({ value, onChange }: RichTextFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inserting, setInserting] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");
  const [pendingAlt, setPendingAlt] = useState("");

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  /**
   * Appended rather than inserted at the caret: opening the picker moves focus
   * out of the contentEditable, and a restored-Range dance across a portalled
   * modal is a well-known source of images landing in the wrong paragraph.
   * The author can drag it where they want afterwards.
   */
  const insertImage = () => {
    if (!pendingUrl.trim()) return;
    const alt = pendingAlt.replace(/"/g, "&quot;");
    const html = `${value}<p><img src="${pendingUrl.trim()}" alt="${alt}" loading="lazy" /></p>`;
    onChange(sanitizeHtml(html));
    setPendingUrl("");
    setPendingAlt("");
    setInserting(false);
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
        <button
          type="button"
          onClick={() => setInserting((v) => !v)}
          className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#3A3A3C] hover:bg-white"
        >
          Image
        </button>
      </div>

      {inserting ? (
        <div className="space-y-2 border-b border-black/[0.06] bg-[#F8F8FA] p-2.5">
          <MediaLibraryPicker
            value={pendingUrl}
            onChange={setPendingUrl}
            alt={pendingAlt}
            onAltChange={setPendingAlt}
            altHint="What the picture shows, for someone who can't see it."
          />
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={insertImage}
              disabled={!pendingUrl.trim()}
              className="rounded-lg bg-[#1D1D1F] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
            >
              Add to the end
            </button>
            <button
              type="button"
              onClick={() => setInserting(false)}
              className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#6E6E73]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[120px] px-3 py-2 text-sm outline-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
        onInput={() => {
          if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML));
        }}
      />
    </div>
  );
}
