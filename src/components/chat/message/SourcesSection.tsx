// src/components/chat/message/SourcesSection.tsx
// Collapsible sources list for chat messages

import { memo } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  FileText,
} from 'lucide-react';
import type { Citation } from '../../../utils/types';

interface SourcesSectionProps {
  citations: Citation[];
  isOpen: boolean;
  onToggle: () => void;
  onViewDetails: (index: number) => void;
  onJumpToPage: (citation: Citation) => void;
  /** Whether this is a multi-paper chat context */
  isMultiPaper?: boolean;
}

/**
 * Collapsible section showing citation sources
 */
function SourcesSectionBase({
  citations,
  isOpen,
  onToggle,
  onViewDetails,
  onJumpToPage,
  isMultiPaper = false,
}: SourcesSectionProps) {
  if (!citations?.length) return null;

  return (
    <div className='mt-3 pt-3 border-t border-gray-100/50 w-full min-w-0 max-w-full'>
      {/* Toggle Button */}
      <button
        className={`group flex items-center gap-2 text-xs font-medium transition-all px-3 py-1.5 rounded-full border ${
          isOpen
            ? 'bg-orange-50 text-orange-700 border-orange-200'
            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
        }`}
        onClick={onToggle}
      >
        <BookOpen
          size={14}
          className={
            isOpen
              ? 'text-orange-600'
              : 'text-gray-400 group-hover:text-gray-600'
          }
        />
        <span>{citations.length} Sources</span>
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {/* Sources List */}
      {isOpen && (
        <div className='mt-3 flex flex-col gap-2 w-full min-w-0'>
          {citations.map((citation, index) => (
            <SourceItem
              key={index}
              citation={citation}
              index={index}
              onViewDetails={() => onViewDetails(index)}
              onJumpToPage={() => onJumpToPage(citation)}
              isMultiPaper={isMultiPaper}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SourceItemProps {
  citation: Citation;
  index: number;
  onViewDetails: () => void;
  onJumpToPage: () => void;
  isMultiPaper?: boolean;
}

function SourceItem({
  citation,
  index,
  onViewDetails,
  onJumpToPage,
  isMultiPaper = false,
}: SourceItemProps) {
  // Check if this citation has multi-paper info
  const hasMultiPaperInfo = isMultiPaper && citation.sourcePaperTitle;

  return (
    <div className='group relative flex flex-col bg-white border border-gray-200 rounded-lg p-2.5 hover:border-orange-300 hover:shadow-sm transition-all w-full min-w-0'>
      <div className='flex items-start gap-3 min-w-0'>
        {/* Index Badge */}
        <div className='flex-shrink-0 flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold mt-0.5 group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors'>
          {index + 1}
        </div>

        <div className='flex-1 min-w-0 overflow-hidden'>
          {/* Paper Title (only in multi-paper mode with paper info) */}
          {hasMultiPaperInfo && (
            <div className='flex items-center gap-1 text-[10px] text-orange-600 font-medium mb-1'>
              <FileText size={10} />
              <span
                className='truncate'
                title={citation.sourcePaperTitle}
              >
                {citation.sourcePaperTitle}
              </span>
            </div>
          )}

          {/* Section Title */}
          <div
            className='text-xs font-semibold text-gray-800 truncate mb-0.5 pr-2'
            title={citation.title}
          >
            {citation.title || 'Unknown Source'}
          </div>

          {/* Snippet Preview */}
          <div className='text-[11px] text-gray-500 line-clamp-1 mb-2 break-all'>
            {citation.snippet
              ? citation.snippet.replace(/\s+/g, ' ').trim()
              : 'No preview'}
          </div>

          {/* Actions */}
          <div className='flex items-center gap-3'>
            <button
              className='flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors'
              onClick={onViewDetails}
            >
              <ExternalLink size={10} />
              Details
            </button>

            {citation.page && (
              <button
                className='flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-gray-800 transition-colors hover:bg-gray-100 px-1.5 py-0.5 rounded'
                onClick={onJumpToPage}
                title={
                  isMultiPaper && citation.sourceFileUrl
                    ? 'Opens in new tab'
                    : 'Jump to page'
                }
              >
                <MapPin size={10} />
                Page {citation.page}
                {isMultiPaper && citation.sourceFileUrl && (
                  <ExternalLink
                    size={8}
                    className='ml-0.5'
                  />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const SourcesSection = memo(SourcesSectionBase);
