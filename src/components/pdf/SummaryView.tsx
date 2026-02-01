import React, { useMemo } from 'react';
import { Sparkles, Quote, ArrowRight } from 'lucide-react';

// --- Types (giữ nguyên để tránh lỗi TS) ---
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
  text?: string;
  snippet?: string;
  metadata?: any;
  locator?: {
    bbox?: BBox | null;
    page_label?: number | null;
    [key: string]: any;
  };
};

type SummaryData = {
  answer?: string;
  context?: { texts?: TextContext[] };
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
    summaryData?.answer ?? summaryData?.summary ?? 'No summary available yet.';

  // --- Logic Parse BBox (Giữ nguyên logic cũ của bạn) ---
  const parseBBox = (raw: any): BBox | null => {
    if (!raw) return null;
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (typeof obj !== 'object') return null;
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
      const pageLabel = loc?.page_label ?? meta?.page_label;
      const bbox = parseBBox(loc?.bbox ?? meta?.bbox);
      if (!id) return;
      const pageNumber =
        typeof pageLabel === 'number'
          ? pageLabel
          : Number(pageLabel) || undefined;
      map.set(id, { pageNumber, bbox });
    });
    return map;
  }, [summaryData]);

  const handleClickCitation = (sourceId: string) => {
    if (!onJumpToSource) return;
    const entry = sourceMap.get(sourceId);
    if (!entry) return;
    const pageNumber = entry.pageNumber ?? 1;
    let rect = { top: 0.15, left: 0.08, width: 0.84, height: 0.12 };
    const bbox = entry.bbox;
    if (bbox && bbox.layout_width && bbox.layout_height) {
      const { x1, y1, x2, y2, layout_width, layout_height } = bbox;
      if (layout_width > 0 && layout_height > 0) {
        rect = {
          left: Number(x1) / layout_width,
          top: Number(y1) / layout_height,
          width: (Number(x2) - Number(x1)) / layout_width,
          height: (Number(y2) - Number(y1)) / layout_height,
        };
      }
    }
    onJumpToSource({ pageNumber, rect });
  };

  // --- Renderers ---
  const renderFormattedText = (fullText: string) => {
    const paragraphs = fullText.split(/\n\s*\n/);
    return paragraphs.map((para, i) => {
      // Logic parse citation buttons
      const nodes: React.ReactNode[] = [];
      let lastIndex = 0;
      const regex = /\[(S\d+)\]/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(para)) !== null) {
        if (match.index > lastIndex)
          nodes.push(para.slice(lastIndex, match.index));
        const id = match[1];
        nodes.push(
          <button
            key={`${id}-${match.index}`}
            type='button'
            className='inline-flex items-center justify-center ml-1 mr-0.5 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200 transition-colors align-middle -translate-y-0.5 cursor-pointer border border-orange-200/60'
            onClick={() => handleClickCitation(id)}
          >
            {id}
          </button>,
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < para.length) nodes.push(para.slice(lastIndex));

      return (
        <p
          key={i}
          className='mb-4 text-gray-800 leading-7 text-[15px] text-justify'
        >
          {nodes}
        </p>
      );
    });
  };

  return (
    <div className='h-full overflow-y-auto bg-gray-50/50'>
      <div className='max-w-4xl mx-auto p-6 space-y-8'>
        {/* === Header === */}
        <div className='flex items-center gap-4'>
          <div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white'>
            <Sparkles
              size={24}
              fill='currentColor'
              className='text-white'
            />
          </div>
          <div>
            <h2 className='text-2xl font-bold text-gray-900 tracking-tight'>
              Executive Summary
            </h2>
            <div className='flex items-center gap-2 mt-1'>
              <span className='text-sm font-medium text-gray-500'>
                AI-Generated Analysis
              </span>
              <span className='w-1 h-1 rounded-full bg-gray-300'></span>
              <span className='text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full'>
                High Confidence
              </span>
            </div>
          </div>
        </div>

        {/* === Content Card === */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 md:p-8'>
          <article className='prose prose-slate max-w-none'>
            {renderFormattedText(answerText)}
          </article>
        </div>

        {/* === Sources List === */}
        {summaryData?.context?.texts?.length ? (
          <div className='space-y-4'>
            <div className='flex items-center gap-2 mb-2 px-1'>
              <Quote
                size={18}
                className='text-orange-500'
              />
              <h3 className='text-sm font-bold uppercase tracking-wider text-gray-500'>
                Referenced Sources ({summaryData.context.texts.length})
              </h3>
            </div>

            <div className='grid grid-cols-1 gap-3'>
              {summaryData.context.texts.map((t) => {
                const pageInfo = t.metadata?.page_label
                  ? `Page ${t.metadata.page_label}`
                  : 'Unknown Page';
                const title =
                  t.metadata?.section_title ??
                  t.metadata?.type ??
                  'Section text';
                const displaySnippet = t.text ?? t.snippet ?? '...';

                return (
                  <button
                    key={t.source_id}
                    onClick={() => handleClickCitation(t.source_id)}
                    className='group relative flex items-start gap-4 p-4 w-full text-left bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all duration-200'
                  >
                    {/* ID Badge */}
                    <span className='flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 text-sm font-bold text-gray-600 group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors border border-gray-100'>
                      {t.source_id}
                    </span>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='font-semibold text-gray-900 truncate pr-2 group-hover:text-orange-700 transition-colors'>
                          {title}
                        </span>
                        <span className='flex-shrink-0 text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded uppercase tracking-wide'>
                          {pageInfo}
                        </span>
                      </div>
                      <p className='text-sm text-gray-500 line-clamp-2 leading-relaxed'>
                        "{displaySnippet}"
                      </p>
                      <div className='mt-2 flex items-center gap-1 text-xs font-medium text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-200'>
                        View in PDF <ArrowRight size={12} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
