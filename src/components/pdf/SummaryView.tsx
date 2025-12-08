import React, { useMemo } from "react";

type BBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  layout_width?: number;
  layout_height?: number;
};

type TextContext = {
  source_id: string;
  metadata?: any;
  locator?: {
    paper_id?: string;
    section_title?: string;
    page_label?: number | null;
    page_start?: number | null;
    page_end?: number | null;
    bbox?: BBox | null;
  };
};

type SummaryData = {
  // new RAG shape
  answer?: string;
  context?: {
    texts?: TextContext[];
    images?: any[];
    tables?: any[];
  };
  // fallback (cũ)
  summary?: string;
};

type Props = {
  summaryData: SummaryData | null;
  onJumpToSource?: (params: {
    pageNumber: number;
    rect: { top: number; left: number; width: number; height: number };
  }) => void;
};

export default function SummaryView({ summaryData, onJumpToSource }: Props) {
  const answerText =
    summaryData?.answer ?? summaryData?.summary ?? "No summary yet.";

  const parseBBox = (raw: any): BBox | null => {
    if (!raw) return null;
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (typeof obj !== "object") return null;
      return obj as BBox;
    } catch {
      return null;
    }
  };

  const sourceMap = useMemo(() => {
    const map = new Map<string, { pageNumber?: number; bbox?: BBox | null }>();

    summaryData?.context?.texts?.forEach((t) => {
      const id = t.source_id;
      const loc = t.locator ?? (t as any).metadata?.locator;
      const meta = t.metadata ?? (t as any).metadata;

      const pageLabel =
        loc?.page_label ??
        loc?.page_start ??
        loc?.page_end ??
        meta?.page_label ??
        meta?.page_start ??
        meta?.page_end;

      const bbox = parseBBox(loc?.bbox ?? meta?.bbox);

      if (!id) return;
      const pageNumber =
        typeof pageLabel === "number"
          ? pageLabel
          : Number.isFinite(Number(pageLabel))
          ? Number(pageLabel)
          : undefined;

      map.set(id, {
        pageNumber,
        bbox,
      });
    });

    return map;
  }, [summaryData]);

  const handleClickCitation = (sourceId: string) => {
    if (!onJumpToSource) return;

    const entry = sourceMap.get(sourceId);
    if (!entry) return;

    const pageNumber = entry.pageNumber ?? 1;
    let rect = {
      top: 0.15,
      left: 0.08,
      width: 0.84,
      height: 0.12,
    };

    const bbox = entry.bbox;
    if (bbox && bbox.layout_width && bbox.layout_height) {
      const x1 = Number(bbox.x1);
      const y1 = Number(bbox.y1);
      const x2 = Number(bbox.x2);
      const y2 = Number(bbox.y2);
      const layout_width = Number(bbox.layout_width);
      const layout_height = Number(bbox.layout_height);

      if (
        layout_width > 0 &&
        layout_height > 0 &&
        x2 > x1 &&
        y2 > y1 &&
        Number.isFinite(layout_width) &&
        Number.isFinite(layout_height)
      ) {
        rect = {
          left: x1 / layout_width,
          top: y1 / layout_height,
          width: (x2 - x1) / layout_width,
          height: (y2 - y1) / layout_height,
        };
      }
    }

    onJumpToSource({ pageNumber, rect });
  };

  const renderWithCitations = (text: string) => {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\[(S\d+)\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }
      const id = match[1];
      nodes.push(
        <button
          key={`${id}-${match.index}`}
          type="button"
          className="text-blue-600 hover:underline font-medium"
          onClick={() => handleClickCitation(id)}
        >
          [{id}]
        </button>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  return (
    <div className="h-full overflow-auto p-4">
      <div className="prose prose-sm max-w-none">
        <h2 className="text-lg font-semibold mb-4">🧾 Paper Summary</h2>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {renderWithCitations(answerText)}
        </div>

        {summaryData?.context?.texts?.length ? (
          <div className="mt-4 border-t pt-3 text-xs text-gray-600">
            <div className="font-semibold mb-1">Sources:</div>
            <ul className="space-y-1">
              {summaryData.context.texts.map((t) => (
                <li key={t.source_id}>
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => handleClickCitation(t.source_id)}
                  >
                    [{t.source_id}]{" "}
                    {t.metadata?.section_title ?? t.metadata?.type ?? "Text"}
                    {t.metadata?.page_label
                      ? ` — p.${t.metadata.page_label}`
                      : ""}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
