// src/utils/citation.ts
// Utility functions for parsing and handling citations

import type { Citation } from './types';

/**
 * Parse citations from RAG API response
 */
export function parseCitationsFromResponse(
  rawCitations: any[],
  activePaperId?: string,
): Citation[] {
  return rawCitations.map((t: any, i: number) => {
    // Get metadata from item or nested metadata object
    const meta = t.metadata ?? {};

    // Extract bounding box from various possible locations
    let parsedBBox: any = t.bbox ?? meta.bbox ?? null;
    if (typeof parsedBBox === 'string') {
      try {
        parsedBBox = JSON.parse(parsedBBox);
      } catch {
        parsedBBox = null;
      }
    }

    // Layout dimensions
    const layoutW =
      Number(
        t.layoutWidth ??
          t.layout_width ??
          meta.layout_width ??
          parsedBBox?.layout_width ??
          parsedBBox?.page_width ??
          612,
      ) || 612;
    const layoutH =
      Number(
        t.layoutHeight ??
          t.layout_height ??
          meta.layout_height ??
          parsedBBox?.layout_height ??
          parsedBBox?.page_height ??
          792,
      ) || 792;

    // Calculate rect if bbox exists
    let rect: Citation['rect'] | undefined;
    if (parsedBBox) {
      const x1 = Number(parsedBBox?.x1 ?? parsedBBox?.left ?? 0);
      const y1 = Number(parsedBBox?.y1 ?? parsedBBox?.top ?? 0);
      let x2 = Number(parsedBBox?.x2 ?? parsedBBox?.right ?? 0);
      let y2 = Number(parsedBBox?.y2 ?? parsedBBox?.bottom ?? 0);
      if (!x2 || x2 <= x1) x2 = x1 + (Number(parsedBBox?.width) || 1);
      if (!y2 || y2 <= y1) y2 = y1 + (Number(parsedBBox?.height) || 1);

      rect =
        layoutW > 0 && layoutH > 0
          ? {
              left: x1 / layoutW,
              top: y1 / layoutH,
              width: (x2 - x1) / layoutW,
              height: (y2 - y1) / layoutH,
            }
          : undefined;
    }

    // Extract page number from various possible fields
    const pageNum =
      t.pageNumber ?? t.page ?? meta.page_label ?? meta.page_start ?? null;

    return {
      paperId: activePaperId ?? '',
      page: pageNum,
      title:
        t.sectionTitle ??
        t.section_title ??
        meta.section_title ??
        t.type ??
        'Citation',
      snippet: t.snippet ?? t.text ?? '',
      sourceId: t.sourceId ?? t.source_id ?? `S${i + 1}`,
      rect,
      rawBBox: parsedBBox,
      layoutWidth: layoutW,
      layoutHeight: layoutH,
    };
  });
}

/**
 * Find a citation by its source ID or index
 */
export function findCitation(
  citations: Citation[] | undefined,
  citationId: string,
): Citation | undefined {
  if (!citations) return undefined;

  // Try to find by sourceId first
  let citation = citations.find((c) => c.sourceId === citationId);

  // Fallback: find by index
  if (!citation) {
    const numericId = parseInt(citationId.replace(/\D/g, ''), 10);
    if (!isNaN(numericId) && numericId > 0 && numericId <= citations.length) {
      citation = citations[numericId - 1];
    }
  }

  return citation;
}
