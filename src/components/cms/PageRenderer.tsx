"use client";

import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CmsBlock, CmsWidgetDefinition } from "@/lib/cms/types";
import {
  interpolateTemplate,
  resolveAssuranceItems,
  resolveHeroSlides,
  scopeBlockCss,
} from "@/lib/cms/resolveSectionProps";
import { sanitizeHtml } from "@/lib/cms/sanitizeHtml";
import { buildLegalDocument } from "@/lib/cms/legalDoc";
import { getSectionEntry } from "@/lib/cms/sectionRegistry";
import { HeroSlider } from "@/components/home/HeroSlider";
import { AssuranceStrip } from "@/components/home/AssuranceStrip";
import { ApiProductRail } from "@/components/home/ApiProductRail";
import { EditorialBanner } from "@/components/home/EditorialBanner";
import { OfferBannerGate } from "@/components/home/OfferBannerGate";
import { BrandExplorer } from "@/components/home/BrandExplorer";
import { DigitalCardFeature } from "@/components/home/DigitalCardFeature";
import { CategoryShowcase } from "@/components/home/CategoryShowcase";
import { CmsCodeInjector } from "./CmsCodeInjector";
import { CmsSandboxFrame } from "./CmsSandboxFrame";
import {
  duplicateCmsBlock,
  removeCmsBlock,
  updateCmsBlock,
} from "@/lib/adminStore";

export type PageRendererProps = {
  sections: CmsBlock[];
  widgets?: CmsWidgetDefinition[];
  pageCss?: string;
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  pageId?: string;
  /** Published page public_id — when set, code blocks carrying a `sandboxRef`
   *  render inside an isolated sandbox iframe served by the API. */
  sandboxPageId?: string;
  onAddBetween?: (index: number) => void;
  showDisabled?: boolean;
};

function BlockChrome({
  block,
  selected,
  pageId,
  onSelect,
}: {
  block: CmsBlock;
  selected: boolean;
  pageId?: string;
  onSelect?: (id: string) => void;
}) {
  if (!selected || !pageId) return null;
  const label = getSectionEntry(block.type)?.label ?? block.type;
  return (
    <div className="absolute left-2 top-2 z-50 flex items-center gap-1 rounded-lg bg-[#1D1D1F] px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
      <span className="cursor-grab" title="Drag">⠿</span>
      <span>{label}</span>
      <button
        type="button"
        className="ml-1 rounded px-1 hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          updateCmsBlock(pageId, block.id, { enabled: !block.enabled });
        }}
      >
        {block.enabled ? "Hide" : "Show"}
      </button>
      <button
        type="button"
        className="rounded px-1 hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          duplicateCmsBlock(pageId, block.id);
        }}
      >
        Dup
      </button>
      {block.type !== "column" ? (
        <button
          type="button"
          className="rounded px-1 text-red-300 hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation();
            removeCmsBlock(pageId, block.id);
          }}
        >
          Del
        </button>
      ) : null}
      <button
        type="button"
        className="rounded px-1 hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(block.id);
        }}
      >
        Edit
      </button>
    </div>
  );
}

function BlockShell({
  block,
  interactive,
  selected,
  onSelect,
  pageId,
  children,
}: {
  block: CmsBlock;
  interactive?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  pageId?: string;
  children: React.ReactNode;
}) {
  const css = block.customCss ? scopeBlockCss(block.id, block.customCss) : "";
  return (
    <div
      data-cms-block={block.id}
      data-cms-type={block.type}
      className={
        interactive
          ? `relative outline-offset-2 transition ${
              !block.enabled ? "opacity-40" : ""
            } ${
              selected
                ? "outline outline-2 outline-[#1D1D1F]"
                : "hover:outline hover:outline-1 hover:outline-[#1D1D1F]/35"
            }`
          : undefined
      }
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onSelect?.(block.id);
            }
          : undefined
      }
    >
      {interactive ? (
        <BlockChrome
          block={block}
          selected={Boolean(selected)}
          pageId={pageId}
          onSelect={onSelect}
        />
      ) : null}
      {css ? <style>{css}</style> : null}
      {children}
    </div>
  );
}

function WidgetBlock({
  block,
  widgets,
}: {
  block: CmsBlock;
  widgets: CmsWidgetDefinition[];
}) {
  const widget = widgets.find((w) => w.id === block.widgetId);

  // NOTE: admin-authored widget JS is NEVER executed in the storefront document.
  // A widget's templateJs must run in the CMS sandbox iframe (see CmsSandboxFrame),
  // not via a parent-context <script> injection. Only sanitized HTML/CSS renders here.

  if (!widget || !widget.enabled) {
    return (
      <div className="ez-page py-8 text-center text-sm text-[#86868B]">
        Widget unavailable
      </div>
    );
  }
  const html = sanitizeHtml(interpolateTemplate(widget.templateHtml, block.props));
  const css = widget.templateCss
    ? scopeBlockCss(block.id, interpolateTemplate(widget.templateCss, block.props))
    : "";
  return (
    <div>
      {css ? <style>{css}</style> : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function OverlayChild({
  child,
  widgets,
  interactive,
  selectedId,
  onSelect,
  pageId,
  sandboxPageId,
  showDisabled,
}: {
  child: CmsBlock;
  widgets: CmsWidgetDefinition[];
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  pageId?: string;
  sandboxPageId?: string;
  showDisabled?: boolean;
}) {
  const layout = child.layout ?? { xPct: 10, yPct: 20, wPct: 40, zIndex: 1 };
  const dragging = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || !pageId) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const parent = (e.currentTarget as HTMLElement).offsetParent as HTMLElement | null;
    if (!parent) return;
    dragging.current = {
      startX: e.clientX,
      startY: e.clientY,
      x: layout.xPct ?? 10,
      y: layout.yPct ?? 20,
    };
    onSelect?.(child.id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !pageId) return;
    const parent = (e.currentTarget as HTMLElement).offsetParent as HTMLElement | null;
    if (!parent) return;
    const dx = ((e.clientX - dragging.current.startX) / parent.clientWidth) * 100;
    const dy = ((e.clientY - dragging.current.startY) / parent.clientHeight) * 100;
    updateCmsBlock(pageId, child.id, {
      layout: {
        xPct: Math.min(90, Math.max(0, dragging.current.x + dx)),
        yPct: Math.min(90, Math.max(0, dragging.current.y + dy)),
      },
    });
  };

  const onPointerUp = () => {
    dragging.current = null;
  };

  return (
    <div
      className={`absolute ${interactive ? "cursor-move" : ""}`}
      style={{
        left: `${layout.xPct ?? 8}%`,
        top: `${layout.yPct ?? 20}%`,
        width: `${layout.wPct ?? 40}%`,
        zIndex: layout.zIndex ?? 1,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <RenderBlock
        block={child}
        widgets={widgets}
        interactive={interactive}
        selectedId={selectedId}
        onSelect={onSelect}
        pageId={pageId}
        sandboxPageId={sandboxPageId}
        showDisabled={showDisabled}
      />
      {interactive && pageId && selectedId === child.id ? (
        <input
          type="range"
          min={10}
          max={90}
          value={layout.wPct ?? 40}
          className="absolute -bottom-6 left-0 w-full"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) =>
            updateCmsBlock(pageId, child.id, {
              layout: { wPct: Number(e.target.value) },
            })
          }
        />
      ) : null}
    </div>
  );
}

function RenderBlock({
  block,
  widgets,
  interactive,
  selectedId,
  onSelect,
  pageId,
  sandboxPageId,
  showDisabled,
}: {
  block: CmsBlock;
  widgets: CmsWidgetDefinition[];
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  pageId?: string;
  sandboxPageId?: string;
  showDisabled?: boolean;
}) {
  if (!block.enabled && !showDisabled) return null;

  const selected = selectedId === block.id;
  const shell = (children: React.ReactNode) => (
    <BlockShell
      block={block}
      interactive={interactive}
      selected={selected}
      onSelect={onSelect}
      pageId={pageId}
    >
      {children}
    </BlockShell>
  );

  switch (block.type) {
    case "hero_slider":
      return shell(<HeroSlider slides={resolveHeroSlides(block.props)} />);
    case "assurance_strip":
      return shell(<AssuranceStrip items={resolveAssuranceItems(block.props)} />);
    case "product_rail":
      return shell(
        <ApiProductRail
          eyebrow={String(block.props.eyebrow ?? "")}
          title={String(block.props.title ?? "")}
          description={
            block.props.description ? String(block.props.description) : undefined
          }
          railProps={block.props}
          href={block.props.href ? String(block.props.href) : undefined}
          linkLabel={
            block.props.linkLabel ? String(block.props.linkLabel) : undefined
          }
          variant={
            (block.props.variant as "product" | "preorder" | "square") || "product"
          }
        />,
      );
    case "offer_banner":
      return shell(<OfferBannerGate />);
    case "brand_explorer":
      return shell(<BrandExplorer />);
    case "editorial_banner":
      return shell(
        <EditorialBanner
          eyebrow={String(block.props.eyebrow ?? "")}
          title={String(block.props.title ?? "")}
          description={String(block.props.description ?? "")}
          href={String(block.props.href ?? "/")}
          cta={String(block.props.cta ?? "Shop")}
          image={String(block.props.image ?? "/images/banner-racing-gear.png")}
          imageAlt={String(block.props.imageAlt ?? "")}
          theme={(block.props.theme as "dark" | "light" | "violet") || "dark"}
          fullWidth={Boolean(block.props.fullWidth)}
          imagePosition={
            block.props.imagePosition
              ? String(block.props.imagePosition)
              : undefined
          }
        />,
      );
    case "digital_cards":
      return shell(
        <DigitalCardFeature
          eyebrow={String(block.props.eyebrow ?? "Instant delivery")}
          title={String(block.props.title ?? "More play.\nZero waiting.")}
          description={String(block.props.description ?? "")}
          cta={String(block.props.cta ?? "Explore game cards")}
          href={String(block.props.href ?? "/game-cards")}
        />,
      );
    case "category_showcase":
      return shell(
        <CategoryShowcase
          eyebrow={String(block.props.eyebrow ?? "Start exploring")}
          title={String(block.props.title ?? "Shop by category.")}
          description={String(block.props.description ?? "")}
        />,
      );
    case "rich_text":
      return shell(
        <section className="ez-page ez-section">
          <div
            className="ez-prose"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(String(block.props.html ?? "")),
            }}
          />
        </section>,
      );
    case "legal_doc": {
      const doc = buildLegalDocument(String(block.props.html ?? ""));
      const eyebrow = String(block.props.eyebrow ?? "");
      const title = String(block.props.title ?? "");
      const lastUpdated = String(block.props.lastUpdated ?? "");
      const notice = String(block.props.notice ?? "");
      const showToc = block.props.showToc !== false && doc.headings.length > 1;
      return shell(
        <section className="ez-page ez-legal">
          <div className="ez-legal-inner">
            <header className="ez-legal-head">
              {eyebrow ? <p className="ez-section-kicker">{eyebrow}</p> : null}
              {title ? <h1 className="ez-legal-title">{title}</h1> : null}
              {lastUpdated ? (
                <p className="ez-legal-chip ez-mono">Last updated {lastUpdated}</p>
              ) : null}
            </header>

            {notice ? (
              <div className="ez-legal-notice" role="note">
                <span className="ez-legal-notice-tag">Notice</span>
                <p>{notice}</p>
              </div>
            ) : null}

            <div className={`ez-legal-body${showToc ? " has-toc" : ""}`}>
              {showToc ? (
                <nav className="ez-legal-toc" aria-label="On this page">
                  <p className="ez-section-kicker">On this page</p>
                  <ol>
                    {doc.headings.map((heading) => (
                      <li key={heading.id}>
                        <a href={`#${heading.id}`}>{heading.text}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}
              <div
                className={`ez-prose${showToc ? "" : " ez-measure"}`}
                dangerouslySetInnerHTML={{ __html: doc.html }}
              />
            </div>
          </div>
        </section>,
      );
    }
    case "custom_html":
      // A published block that carried code ships no raw HTML/JS — only a
      // sandboxRef. Render it in the cross-origin, opaque-origin sandbox iframe
      // so nothing executes in the storefront document. Editor/preview (no
      // sandboxRef) still shows sanitized inline HTML.
      if (block.sandboxRef && sandboxPageId) {
        return shell(
          <CmsSandboxFrame
            pageId={sandboxPageId}
            variant="A"
            blockId={block.sandboxRef}
          />,
        );
      }
      return shell(
        <div
          dangerouslySetInnerHTML={{
            __html: sanitizeHtml(String(block.props.html ?? "")),
          }}
        />,
      );
    case "widget":
      if (block.sandboxRef && sandboxPageId) {
        return shell(
          <CmsSandboxFrame
            pageId={sandboxPageId}
            variant="A"
            blockId={block.sandboxRef}
          />,
        );
      }
      return shell(<WidgetBlock block={block} widgets={widgets} />);
    case "column": {
      const children = (block.children ?? []).filter(
        (c) => c.enabled || showDisabled,
      );
      return shell(
        <div className="min-h-[80px] rounded-xl border border-dashed border-black/10 p-2">
          {children.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-[#A1A1A6]">
              Empty column — select it and add a module
            </p>
          ) : (
            children.map((child) => (
              <RenderBlock
                key={child.id}
                block={child}
                widgets={widgets}
                interactive={interactive}
                selectedId={selectedId}
                onSelect={onSelect}
                pageId={pageId}
                sandboxPageId={sandboxPageId}
                showDisabled={showDisabled}
              />
            ))
          )}
        </div>,
      );
    }
    case "row": {
      const cols = Number(block.props.columns) === 3 ? 3 : 2;
      const gap =
        block.props.gap === "sm"
          ? "gap-3"
          : block.props.gap === "lg"
            ? "gap-8"
            : "gap-5";
      let children = (block.children ?? []).filter(
        (c) => c.enabled || showDisabled,
      );
      // migrate legacy flat children on the fly for display
      if (children.some((c) => c.type !== "column")) {
        children = children.map((c, i) =>
          c.type === "column"
            ? c
            : {
                id: `legacy-col-${block.id}-${i}`,
                type: "column" as const,
                enabled: true,
                props: { index: i },
                children: [c],
              },
        );
      }
      while (children.length < cols) {
        children = [
          ...children,
          {
            id: `pad-col-${block.id}-${children.length}`,
            type: "column",
            enabled: true,
            props: { index: children.length },
            children: [],
          },
        ];
      }
      return shell(
        <section
          className={`ez-page ez-section grid ${gap} ${
            cols === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          {children.slice(0, cols).map((child) => (
            <RenderBlock
              key={child.id}
              block={child}
              widgets={widgets}
              interactive={interactive}
              selectedId={selectedId}
              onSelect={onSelect}
              pageId={pageId}
              sandboxPageId={sandboxPageId}
              showDisabled={showDisabled}
            />
          ))}
        </section>,
      );
    }
    case "overlay_stage": {
      const minHeight = Number(block.props.minHeight) || 420;
      const background = String(block.props.background ?? "#101012");
      const image = String(block.props.image ?? "");
      const children = (block.children ?? []).filter(
        (c) => c.enabled || showDisabled,
      );
      return shell(
        <section
          className="relative w-full overflow-hidden"
          style={{
            minHeight,
            backgroundColor: background,
            backgroundImage: image ? `url(${image})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {children.map((child) => (
            <OverlayChild
              key={child.id}
              child={child}
              widgets={widgets}
              interactive={interactive}
              selectedId={selectedId}
              onSelect={onSelect}
              pageId={pageId}
              sandboxPageId={sandboxPageId}
              showDisabled={showDisabled}
            />
          ))}
          {children.length === 0 ? (
            <div className="flex h-full min-h-[420px] items-center justify-center text-sm text-white/50">
              Overlay stage — add positioned modules
            </div>
          ) : null}
        </section>,
      );
    }
    default:
      return null;
  }
}

function SortableSectionWrapper({
  id,
  children,
  interactive,
}: {
  id: string;
  children: React.ReactNode;
  interactive?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !interactive });
  if (!interactive) return <>{children}</>;
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : undefined,
      }}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export function PageRenderer({
  sections,
  widgets = [],
  pageCss = "",
  interactive,
  selectedId,
  onSelect,
  pageId,
  sandboxPageId,
  onAddBetween,
  showDisabled,
}: PageRendererProps) {
  const blockCss = sections
    .map((s) => (s.customCss ? scopeBlockCss(s.id, s.customCss) : ""))
    .filter(Boolean)
    .join("\n");

  return (
    <>
      <CmsCodeInjector pageCss={pageCss} blockCss={blockCss} />
      <div
        className={interactive ? "min-h-[480px] bg-white" : undefined}
        onClick={interactive ? () => onSelect?.("") : undefined}
      >
        {sections.map((block, index) => (
          <SortableSectionWrapper key={block.id} id={block.id} interactive={interactive}>
            {interactive && onAddBetween ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddBetween(index);
                }}
                className="group relative z-10 flex h-6 w-full items-center justify-center"
              >
                <span className="h-px w-full bg-transparent group-hover:bg-[#1D1D1F]/20" />
                <span className="absolute rounded-full bg-[#1D1D1F] px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 group-hover:opacity-100">
                  + Add section
                </span>
              </button>
            ) : null}
            <RenderBlock
              block={block}
              widgets={widgets}
              interactive={interactive}
              selectedId={selectedId}
              onSelect={onSelect}
              pageId={pageId}
              sandboxPageId={sandboxPageId}
              showDisabled={showDisabled}
            />
          </SortableSectionWrapper>
        ))}
        {interactive && onAddBetween ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddBetween(sections.length);
            }}
            className="mx-auto my-4 block rounded-full border border-dashed border-black/20 px-4 py-2 text-xs font-semibold text-[#6E6E73] hover:border-[#1D1D1F] hover:text-[#1D1D1F]"
          >
            + Add section at end
          </button>
        ) : null}
      </div>
    </>
  );
}
