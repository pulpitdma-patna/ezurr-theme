"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  addCmsSection,
  getDraftCmsSections,
  moveCmsBlock,
  publishCmsPage,
  pushCmsRevision,
  reorderCmsSections,
  hasStrandedVariantB,
  adoptVariantB,
  resetCmsPage,
  restoreCmsRevision,
  setAdminState,
  updateCmsPageCode,
} from "@/lib/adminStore";
import { snapshotsEqual } from "@/lib/cms/types";
import type {
  CmsBlock,
  PageRevisionSnapshot,
  SectionType,
} from "@/lib/cms/types";
import { getSectionEntry } from "@/lib/cms/sectionRegistry";
import { useCmsDraftDirty, useCmsPage, useCmsWidgets } from "@/hooks/useCmsStore";
import { PageRenderer } from "@/components/cms/PageRenderer";
import { ModulePalette } from "./ModulePalette";
import { StructureTree } from "./StructureTree";
import { SectionInspector } from "./SectionInspector";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useRouter } from "next/navigation";
import { useCmsAutosave } from "@/hooks/useCmsAutosave";
import { publishPage, loadPage } from "@/lib/cms/cmsApi";
import { isApiEnabled } from "@/lib/apiClient";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";

function findBlock(blocks: CmsBlock[], id: string): CmsBlock | undefined {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.children) {
      const nested = findBlock(b.children, id);
      if (nested) return nested;
    }
  }
  return undefined;
}

function findParentId(
  blocks: CmsBlock[],
  id: string,
  parent?: string,
): string | undefined {
  for (const b of blocks) {
    if (b.id === id) return parent;
    if (b.children) {
      if (b.children.some((c) => c.id === id)) return b.id;
      const found = findParentId(b.children, id, b.id);
      if (found) return found;
    }
  }
  return undefined;
}

type PageBuilderProps = {
  pageId: string;
};

export function PageBuilder({ pageId }: PageBuilderProps) {
  const page = useCmsPage(pageId);
  const widgets = useCmsWidgets();
  const localDirty = useCmsDraftDirty(pageId);
  const autosave = useCmsAutosave(page);
  const toast = useAdminToast();
  const router = useRouter();
  const [loaded, setLoaded] = useState(!isApiEnabled());
  const [publishing, setPublishing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<"desktop" | "mobile">("desktop");
  const [dismissedB, setDismissedB] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [leftTab, setLeftTab] = useState<"modules" | "tree">("modules");
  const [showChrome, setShowChrome] = useState(false);
  const [pendingInsert, setPendingInsert] = useState<number | null>(null);
  const undoStack = useRef<PageRevisionSnapshot[]>([]);
  const redoStack = useRef<PageRevisionSnapshot[]>([]);
  const lastSnap = useRef<string>("");

  const sections = page ? getDraftCmsSections(page) : [];
  const draft = page?.draft;

  const selected = selectedId ? findBlock(sections, selectedId) ?? null : null;
  const selectedEntry = selected ? getSectionEntry(selected.type) : undefined;
  const nestParentId =
    selected &&
    (selectedEntry?.acceptsChildren || selected.type === "column")
      ? selected.id
      : null;

  const widgetsById = useMemo(
    () => new Map(widgets.map((w) => [w.id, w.name])),
    [widgets],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Undo capture
  useEffect(() => {
    if (!page) return;
    const serialized = JSON.stringify(page.draft);
    if (serialized === lastSnap.current) return;
    if (lastSnap.current) {
      undoStack.current = [
        JSON.parse(lastSnap.current) as PageRevisionSnapshot,
        ...undoStack.current,
      ].slice(0, 40);
      redoStack.current = [];
    }
    lastSnap.current = serialized;
  }, [page?.draft, page]);

  const undo = useCallback(() => {
    if (!page || undoStack.current.length === 0) return;
    const prev = undoStack.current[0];
    undoStack.current = undoStack.current.slice(1);
    redoStack.current = [structuredClone(page.draft), ...redoStack.current].slice(
      0,
      40,
    );
    lastSnap.current = JSON.stringify(prev);
    setAdminState((s) => ({
      ...s,
      cmsPages: s.cmsPages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              draft: structuredClone(prev),
              status:
                p.published && snapshotsEqual(prev, p.published)
                  ? "published"
                  : "draft",
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
    toast.push("Undo", "neutral");
  }, [page, pageId, toast]);

  const redo = useCallback(() => {
    if (!page || redoStack.current.length === 0) return;
    const next = redoStack.current[0];
    redoStack.current = redoStack.current.slice(1);
    lastSnap.current = JSON.stringify(next);
    setAdminState((s) => ({
      ...s,
      cmsPages: s.cmsPages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              draft: structuredClone(next),
              updatedAt: new Date().toISOString(),
              status:
                p.published && snapshotsEqual(next, p.published)
                  ? "published"
                  : "draft",
            }
          : p,
      ),
    }));
    toast.push("Redo", "neutral");
  }, [page, pageId, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setPendingInsert(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Pull the stored page in before the first edit, so the builder is never
  // editing a stale local copy that a later save would push over the server's.
  useEffect(() => {
    if (!isApiEnabled() || loaded) return;
    let cancelled = false;
    void loadPage(pageId).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setAdminState((prev) => ({
          ...prev,
          cmsPages: prev.cmsPages.some((p) => p.id === res.data.id)
            ? prev.cmsPages.map((p) => (p.id === res.data.id ? res.data : p))
            : [...prev.cmsPages, res.data],
        }));
        autosave.markSynced(res.data);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [pageId, loaded, autosave]);

  // Unsaved work must survive a reload or a mis-click on the browser's back
  // button. Autosave should make this almost never fire, which is precisely
  // what makes it meaningful when it does.
  useEffect(() => {
    if (!autosave.dirty && autosave.state !== "error") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [autosave.dirty, autosave.state]);

  // Fullscreen builder class on body
  useEffect(() => {
    document.documentElement.classList.add("ezurr-cms-builder");
    return () => document.documentElement.classList.remove("ezurr-cms-builder");
  }, []);

  if (!page || !draft) {
    return (
      <div className="rounded-2xl border border-black/[0.08] bg-white p-10 text-center text-sm text-[#6E6E73]">
        Page not found.{" "}
        <Link href="/admin/cms" className="font-semibold text-[#1D1D1F] underline">
          Back to pages
        </Link>
      </div>
    );
  }

  const onAdd = (type: SectionType, widgetId?: string) => {
    const id = addCmsSection(
      pageId,
      type,
      nestParentId ?? undefined,
      widgetId,
      pendingInsert ?? undefined,
    );
    setPendingInsert(null);
    if (!id) {
      toast.push("Cannot nest that module here", "danger");
      return;
    }
    setSelectedId(id);
    toast.push("Module added", "success");
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sections.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    reorderCmsSections(pageId, next);
  };

  const saveChip: { label: string; tone: "ok" | "busy" | "error" } = !isApiEnabled()
    ? { label: localDirty ? "Editing draft" : "Draft saved on this device", tone: "ok" }
    : autosave.state === "saving"
      ? { label: "Saving…", tone: "busy" }
      : autosave.state === "error"
        ? { label: "Not saved", tone: "error" }
        : autosave.dirty
          ? { label: "Unsaved changes", tone: "busy" }
          : autosave.savedAt
            ? {
                label: `Saved ${autosave.savedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`,
                tone: "ok",
              }
            : { label: localDirty ? "Draft" : "Published matches draft", tone: "ok" };

  // A page left mid-A/B-test would otherwise have B's layout silently orphaned
  // once the switcher is gone, since the editor and the storefront both use A.
  const strandedB = !dismissedB && page ? hasStrandedVariantB(page) : false;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#EFEFF2]">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.08] bg-white px-3 py-2.5">
        {/* A Next <Link> never triggers beforeunload, and "go back to Pages"
            is exactly when the old build threw the edit away. Flush first. */}
        <button
          type="button"
          onClick={async () => {
            await autosave.flush();
            router.push("/admin/cms");
          }}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
        >
          ← Pages
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1D1D1F]">{page.title}</p>
          <p className="ez-mono text-[10px] text-[#A1A1A6]">{page.path}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
            saveChip.tone === "error"
              ? "bg-red-50 text-red-800"
              : saveChip.tone === "busy"
                ? "bg-amber-50 text-amber-900"
                : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {saveChip.label}
        </span>
        {autosave.state === "error" ? (
          <button
            type="button"
            onClick={() => void autosave.flush()}
            className="rounded-full border border-red-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-red-800 hover:bg-red-50"
          >
            Retry
          </button>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={undo}
            className="rounded-lg border border-black/[0.1] px-2 py-1.5 text-[11px] font-semibold"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            className="rounded-lg border border-black/[0.1] px-2 py-1.5 text-[11px] font-semibold"
          >
            Redo
          </button>
          <div className="flex rounded-lg border border-black/[0.1] p-0.5">
            <button
              type="button"
              onClick={() => setPreview("desktop")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                preview === "desktop" ? "bg-[#1D1D1F] text-white" : "text-[#6E6E73]"
              }`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreview("mobile")}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                preview === "mobile" ? "bg-[#1D1D1F] text-white" : "text-[#6E6E73]"
              }`}
            >
              Mobile
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowChrome((v) => !v)}
            className="rounded-lg border border-black/[0.1] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#F5F5F7]"
          >
            {showChrome ? "Hide chrome" : "Store chrome"}
          </button>
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className="rounded-lg border border-black/[0.1] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#F5F5F7]"
          >
            Page code
          </button>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="rounded-lg border border-black/[0.1] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#F5F5F7]"
          >
            History
          </button>
          <button
            type="button"
            onClick={() => {
              pushCmsRevision(pageId, "Checkpoint");
              toast.push("Checkpoint saved", "success");
            }}
            className="rounded-lg border border-black/[0.1] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#F5F5F7]"
          >
            Checkpoint
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset this page draft to the default layout?")) {
                resetCmsPage(pageId);
                setSelectedId(null);
                toast.push("Reset to default", "success");
              }
            }}
            className="rounded-lg border border-black/[0.1] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#F5F5F7]"
          >
            Reset
          </button>
          <a
            href={page.path}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-black/[0.1] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#F5F5F7]"
          >
            Open live
          </a>
          <button
            type="button"
            disabled={publishing}
            onClick={async () => {
              // Local first so mock mode still works, then the server — which is
              // what actually reaches customers. The old button did only the
              // former and reported success regardless.
              publishCmsPage(pageId);
              if (!isApiEnabled()) {
                toast.push("Published", "success");
                return;
              }
              setPublishing(true);
              // Flush the draft first: publish copies what the SERVER has
              // stored, so publishing an unsaved edit would put the previous
              // version live and look like the edit was lost.
              await autosave.flush();
              const res = await publishPage(pageId);
              setPublishing(false);
              toast.push(
                res.ok ? "Published — your page is live" : res.error.message,
                res.ok ? "success" : "danger",
              );
            }}
            className="rounded-lg bg-[#1D1D1F] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-black disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {strandedB ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <span>
            This page had an A/B test. <strong>Variant A</strong> is what
            customers see, so that is what you are editing now.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                adoptVariantB(pageId);
                setDismissedB(true);
              }}
              className="rounded-full border border-amber-300 bg-white px-3 py-1 font-semibold hover:bg-amber-100"
            >
              Use variant B&apos;s layout instead
            </button>
            <button
              type="button"
              onClick={() => setDismissedB(true)}
              className="rounded-full px-3 py-1 font-semibold underline"
            >
              Keep A
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative flex min-h-0 flex-1">
        <aside className="flex w-[260px] shrink-0 flex-col border-r border-black/[0.08] bg-white">
          <div className="flex border-b border-black/[0.06] p-1">
            <button
              type="button"
              onClick={() => setLeftTab("modules")}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold ${
                leftTab === "modules" ? "bg-[#F0F0F2] text-[#1D1D1F]" : "text-[#86868B]"
              }`}
            >
              Palette
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("tree")}
              className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold ${
                leftTab === "tree" ? "bg-[#F0F0F2] text-[#1D1D1F]" : "text-[#86868B]"
              }`}
            >
              Structure
            </button>
          </div>
          {nestParentId ? (
            <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50 px-3 py-2 text-[11px] text-violet-900">
              <span>Nesting into selection</span>
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => setSelectedId(null)}
              >
                Exit (Esc)
              </button>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-hidden">
            {leftTab === "modules" ? (
              <ModulePalette
                onAdd={onAdd}
                nestParentId={nestParentId}
              />
            ) : (
              <StructureTree
                sections={sections}
                selectedId={selectedId}
                onSelect={setSelectedId}
                widgetsById={widgetsById}
                pageId={pageId}
              />
            )}
          </div>
        </aside>

        <div className="relative min-w-0 flex-1 overflow-auto p-4">
          {selectedId ? (
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  moveCmsBlock(
                    pageId,
                    selectedId,
                    "up",
                    findParentId(sections, selectedId),
                  )
                }
                className="rounded-lg border border-black/[0.1] bg-white px-2.5 py-1 text-[11px] font-semibold"
              >
                Move up
              </button>
              <button
                type="button"
                onClick={() =>
                  moveCmsBlock(
                    pageId,
                    selectedId,
                    "down",
                    findParentId(sections, selectedId),
                  )
                }
                className="rounded-lg border border-black/[0.1] bg-white px-2.5 py-1 text-[11px] font-semibold"
              >
                Move down
              </button>
            </div>
          ) : null}
          <div
            className={`mx-auto overflow-hidden rounded-[20px] border border-black/[0.08] bg-white shadow-[0_20px_60px_rgba(17,17,19,0.12)] ${
              preview === "mobile" ? "max-w-[390px]" : "max-w-[1200px]"
            }`}
          >
            {showChrome ? <MicroBar /> : null}
            {showChrome ? <Header showSearch /> : null}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <PageRenderer
                  sections={sections}
                  widgets={widgets}
                  pageCss={draft.customCss}
                  interactive
                  selectedId={selectedId}
                  onSelect={(id) => setSelectedId(id || null)}
                  pageId={pageId}
                  showDisabled
                  onAddBetween={(index) => {
                    setPendingInsert(index);
                    setLeftTab("modules");
                    toast.push("Pick a module to insert", "neutral");
                  }}
                />
              </SortableContext>
            </DndContext>
            {showChrome ? <FooterFull /> : null}
          </div>
        </div>

        <aside className="w-[300px] shrink-0 border-l border-black/[0.08] bg-white">
          <SectionInspector pageId={pageId} block={selected} widgets={widgets} />
        </aside>

        {showCode ? (
          <div className="absolute inset-y-0 right-[300px] z-20 flex w-[360px] flex-col border-l border-black/[0.08] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2.5">
              <p className="text-sm font-semibold">Page CSS / JS</p>
              <button
                type="button"
                onClick={() => setShowCode(false)}
                className="text-xs font-semibold text-[#6E6E73]"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto p-3">
              {/* The old warning said this runs "unsandboxed after publish +
                  hydrate", which is the opposite of what happens: page-level JS
                  never executes in the storefront document at all, and a Custom
                  HTML block's code runs in an isolated cross-origin frame. */}
              <p className="rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] px-3 py-2 text-[11px] text-[#6E6E73]">
                CSS here styles this page. JavaScript on a page is not run on the
                live site — put it in a Custom HTML section instead, where it
                runs inside an isolated frame that cannot read customer data.
              </p>
              <label className="block">
                <span className="text-[11px] font-semibold text-[#6E6E73]">CSS</span>
                <textarea
                  className="mt-1 w-full min-h-[160px] rounded-lg border border-black/[0.1] px-2.5 py-2 font-mono text-xs"
                  value={draft.customCss}
                  onChange={(e) =>
                    updateCmsPageCode(pageId, { customCss: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[#6E6E73]">JS</span>
                <textarea
                  className="mt-1 w-full min-h-[160px] rounded-lg border border-black/[0.1] px-2.5 py-2 font-mono text-xs"
                  value={draft.customJs}
                  onChange={(e) =>
                    updateCmsPageCode(pageId, { customJs: e.target.value })
                  }
                />
              </label>
            </div>
          </div>
        ) : null}

        {showHistory ? (
          <div className="absolute inset-y-0 left-[260px] z-20 flex w-[320px] flex-col border-r border-black/[0.08] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2.5">
              <p className="text-sm font-semibold">Version history</p>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="text-xs font-semibold text-[#6E6E73]"
              >
                Close
              </button>
            </div>
            <ul className="flex-1 space-y-1 overflow-y-auto p-2">
              {page.revisions.length === 0 ? (
                <li className="px-2 py-6 text-center text-xs text-[#A1A1A6]">
                  No checkpoints yet.
                </li>
              ) : (
                page.revisions.map((rev) => (
                  <li key={rev.id}>
                    <button
                      type="button"
                      onClick={() => {
                        restoreCmsRevision(pageId, rev.id);
                        toast.push("Revision restored", "success");
                        setShowHistory(false);
                      }}
                      className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#F5F5F7]"
                    >
                      <span className="block text-xs font-semibold text-[#1D1D1F]">
                        {rev.label}
                      </span>
                      <span className="ez-mono text-[10px] text-[#A1A1A6]">
                        {new Date(rev.at).toLocaleString("en-IN")}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
