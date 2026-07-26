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
  reorderCmsSections,
  hasStrandedVariantB,
  adoptVariantB,
  revertCmsPageToPublished,
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
import { PageSettingsPanel } from "./PageSettingsPanel";
import { RevisionHistory } from "./RevisionHistory";
import { SchedulePublishDialog } from "./SchedulePublishDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
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

/** Block count across every variant — a change here is structural, not typing. */
function countBlocks(snap: PageRevisionSnapshot): number {
  let n = 0;
  const walk = (blocks: CmsBlock[]) => {
    for (const b of blocks) {
      n += 1;
      if (b.children) walk(b.children);
    }
  };
  for (const v of snap.variants ?? []) walk(v.sections ?? []);
  return n;
}

/** Ids in document order, so a reorder counts as structural too. */
function blockOrder(snap: PageRevisionSnapshot): string {
  const ids: string[] = [];
  const walk = (blocks: CmsBlock[]) => {
    for (const b of blocks) {
      ids.push(b.id);
      if (b.children) walk(b.children);
    }
  };
  for (const v of snap.variants ?? []) walk(v.sections ?? []);
  return ids.join(",");
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
  const [scheduling, setScheduling] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [leftTab, setLeftTab] = useState<"modules" | "tree">("modules");
  // The tab choice is remembered against the block it was made for, so
  // selecting a different section returns to Section on its own — no effect
  // writing state on every selection change.
  const [rightTabFor, setRightTabFor] = useState<{
    id: string | null;
    tab: "page" | "section";
  } | null>(null);
  const [showChrome, setShowChrome] = useState(false);
  const [pendingInsert, setPendingInsert] = useState<number | null>(null);
  const undoStack = useRef<PageRevisionSnapshot[]>([]);
  const redoStack = useRef<PageRevisionSnapshot[]>([]);
  const lastSnap = useRef<string>("");
  const lastEditAt = useRef<number>(0);
  const lastWasStructural = useRef<boolean>(true);

  const sections = page ? getDraftCmsSections(page) : [];
  const draft = page?.draft;

  const selected = selectedId ? findBlock(sections, selectedId) ?? null : null;
  const selectedEntry = selected ? getSectionEntry(selected.type) : undefined;
  const selectedParentId = selectedId ? findParentId(sections, selectedId) : undefined;
  const selectedParentType = selectedParentId
    ? findBlock(sections, selectedParentId)?.type ?? null
    : null;
  // With nothing selected, Section has nothing to say — Page is the useful
  // default, and that rail used to be 300px of "select a section".
  const activeRightTab: "page" | "section" = !selected
    ? "page"
    : rightTabFor?.id === selectedId
      ? rightTabFor.tab
      : "section";
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

  /**
   * Undo capture, coalesced.
   *
   * Every keystroke in a text field produces a new draft, so an uncoalesced
   * stack meant Cmd+Z removed one character and the 40-entry cap was spent
   * before you had finished a sentence — undo could not reach the edit you
   * actually wanted to take back. Rapid changes (< 700 ms apart) now fold into
   * the entry already at the top: one Cmd+Z steps back a phrase, not a letter.
   *
   * A structural change — adding, deleting or moving a block — always starts a
   * new entry, because that is exactly what people expect to undo as a unit.
   */
  useEffect(() => {
    if (!page) return;
    const serialized = JSON.stringify(page.draft);
    if (serialized === lastSnap.current) return;
    if (lastSnap.current) {
      const prev = JSON.parse(lastSnap.current) as PageRevisionSnapshot;
      const now = Date.now();
      const structural =
        countBlocks(prev) !== countBlocks(page.draft) ||
        blockOrder(prev) !== blockOrder(page.draft);
      const coalesce =
        !structural &&
        !lastWasStructural.current &&
        now - lastEditAt.current < 700 &&
        undoStack.current.length > 0;

      if (!coalesce) {
        undoStack.current = [prev, ...undoStack.current].slice(0, 40);
      }
      redoStack.current = [];
      lastEditAt.current = now;
      lastWasStructural.current = structural;
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

  const pullFromServer = useCallback(async () => {
    const res = await loadPage(pageId);
    if (!res.ok) return false;
    setAdminState((prev) => ({
      ...prev,
      cmsPages: prev.cmsPages.some((p) => p.id === res.data.id)
        ? prev.cmsPages.map((p) => (p.id === res.data.id ? res.data : p))
        : [...prev.cmsPages, res.data],
    }));
    autosave.markSynced(res.data);
    return true;
  }, [pageId, autosave]);

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

  /**
   * Publish, optionally at a future time.
   *
   * The draft is flushed first every time: publish copies what the SERVER has
   * stored, so publishing an unsaved edit would put the *previous* version live
   * and read as the edit having been lost.
   */
  const doPublish = useCallback(
    async (publishAt?: string) => {
      if (!isApiEnabled()) {
        publishCmsPage(pageId);
        toast.push("Published", "success");
        return;
      }
      setPublishing(true);
      await autosave.flush();
      const res = await publishPage(pageId, publishAt ? { publishAt } : {});
      if (res.ok) {
        publishCmsPage(pageId);
        // The server owns publishAt/publishedAt; re-read rather than guess.
        await pullFromServer();
      }
      setPublishing(false);
      setScheduling(false);
      toast.push(
        res.ok
          ? publishAt
            ? "Scheduled — this version will go live then"
            : "Published — your page is live"
          : res.error.message,
        res.ok ? "success" : "danger",
      );
    },
    [pageId, autosave, toast, pullFromServer],
  );

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
          {/* "Reset" used to replace the page with the demo layout — a button
              beside Publish that destroyed an owner's About page. It now means
              what everyone read it as: throw away the unpublished edits. */}
          <button
            type="button"
            onClick={() => setConfirmRevert(true)}
            disabled={!page.published}
            title={
              page.published
                ? "Throw away edits since the last publish"
                : "This page has never been published"
            }
            className="rounded-lg border border-black/[0.1] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#F5F5F7] disabled:opacity-40"
          >
            Discard edits
          </button>
          <a
            href={page.path}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-black/[0.1] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#F5F5F7]"
          >
            Open live
          </a>
          <div className="flex overflow-hidden rounded-lg bg-[#1D1D1F]">
            <button
              type="button"
              disabled={publishing}
              onClick={() => void doPublish()}
              className="px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-black disabled:opacity-50"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
            {isApiEnabled() ? (
              <button
                type="button"
                disabled={publishing}
                onClick={() => setScheduling(true)}
                title="Schedule for later"
                className="border-l border-white/20 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                ▾
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* A pending go-live is invisible everywhere else in the builder, and the
          page still reads "Draft" — which is true and unhelpful on its own. */}
      {page.publishAt ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 bg-sky-50 px-3 py-2 text-[12px] text-sky-900">
          <span>
            Scheduled to go live{" "}
            <strong>
              {new Date(page.publishAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              IST
            </strong>{" "}
            — the version you approved then, not any edits since.
          </span>
          <button
            type="button"
            onClick={() => void doPublish()}
            className="rounded-full border border-sky-300 bg-white px-3 py-1 font-semibold hover:bg-sky-100"
          >
            Publish now instead
          </button>
        </div>
      ) : null}

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

        {/* With nothing selected this rail used to be 300px of "Select a
            section", while the page's own title, address and Google fields had
            no UI anywhere. Page is the default when nothing is selected. */}
        <aside className="flex w-[300px] shrink-0 flex-col border-l border-black/[0.08] bg-white">
          <div className="flex border-b border-black/[0.06] p-1">
            {(
              [
                ["page", "Page"],
                ["section", "Section"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRightTabFor({ id: selectedId, tab: key })}
                className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold ${
                  activeRightTab === key
                    ? "bg-[#F0F0F2] text-[#1D1D1F]"
                    : "text-[#86868B]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {activeRightTab === "page" ? (
              <PageSettingsPanel page={page} />
            ) : (
              <SectionInspector
                pageId={pageId}
                block={selected}
                widgets={widgets}
                parentType={selectedParentType}
              />
            )}
          </div>
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
          <RevisionHistory
            pageId={pageId}
            onClose={() => setShowHistory(false)}
            onRestored={() => {
              setSelectedId(null);
              void pullFromServer().then(() =>
                toast.push("Restored — press Publish to make it live", "success"),
              );
            }}
          />
        ) : null}
      </div>

      <SchedulePublishDialog
        open={scheduling}
        busy={publishing}
        onCancel={() => setScheduling(false)}
        onConfirm={(iso) => void doPublish(iso)}
      />

      <ConfirmDialog
        open={confirmRevert}
        title="Discard your edits?"
        description="This page goes back to exactly what customers see right now. Anything you have changed since the last publish is lost."
        confirmLabel="Discard edits"
        danger
        onCancel={() => setConfirmRevert(false)}
        onConfirm={() => {
          setConfirmRevert(false);
          if (revertCmsPageToPublished(pageId)) {
            setSelectedId(null);
            toast.push("Back to the published version", "success");
          } else {
            toast.push("This page has never been published", "danger");
          }
        }}
      />
    </div>
  );
}
