"use client";

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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CmsBlock } from "@/lib/cms/types";
import { getSectionEntry } from "@/lib/cms/sectionRegistry";
import { reorderCmsSections, updateCmsBlock } from "@/lib/adminStore";

type StructureTreeProps = {
  sections: CmsBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  widgetsById: Map<string, string>;
  pageId?: string;
};

function labelFor(block: CmsBlock, widgetsById: Map<string, string>) {
  if (block.type === "widget" && block.widgetId) {
    return widgetsById.get(block.widgetId) ?? "Widget";
  }
  return getSectionEntry(block.type)?.label ?? block.type;
}

function SortableNode({
  block,
  depth,
  selectedId,
  onSelect,
  widgetsById,
  pageId,
}: {
  block: CmsBlock;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  widgetsById: Map<string, string>;
  pageId?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: block.id });
  const selected = selectedId === block.id;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div
        style={{ paddingLeft: 8 + depth * 12 }}
        className={`flex w-full items-center gap-1 rounded-lg py-1 pr-2 text-[12px] transition ${
          selected
            ? "bg-[#1D1D1F] font-semibold text-white"
            : "text-[#3A3A3C] hover:bg-[#F0F0F2]"
        } ${!block.enabled ? "opacity-50" : ""}`}
      >
        <button
          type="button"
          className="cursor-grab px-1 opacity-60"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={() => onSelect(block.id)}
          className="min-w-0 flex-1 truncate text-left"
        >
          {labelFor(block, widgetsById)}
        </button>
        {pageId && block.type !== "column" ? (
          <button
            type="button"
            title={block.enabled ? "Hide" : "Show"}
            onClick={() =>
              updateCmsBlock(pageId, block.id, { enabled: !block.enabled })
            }
            className="px-1 text-[10px] opacity-70"
          >
            {block.enabled ? "◉" : "○"}
          </button>
        ) : null}
      </div>
      {block.children?.length ? (
        <ul>
          {block.children.map((child) => (
            <SortableNode
              key={child.id}
              block={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              widgetsById={widgetsById}
              pageId={pageId}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function StructureTree({
  sections,
  selectedId,
  onSelect,
  widgetsById,
  pageId,
}: StructureTreeProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    if (!pageId) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = sections.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    reorderCmsSections(pageId, arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <div className="border-t border-black/[0.06] px-2 py-3">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A1A1A6]">
        Structure
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="mt-1.5 space-y-0.5">
            {sections.map((block) => (
              <SortableNode
                key={block.id}
                block={block}
                depth={0}
                selectedId={selectedId}
                onSelect={onSelect}
                widgetsById={widgetsById}
                pageId={pageId}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
