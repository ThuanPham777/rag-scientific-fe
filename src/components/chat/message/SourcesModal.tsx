// src/components/chat/message/SourcesModal.tsx
// Modal for viewing citation details

import { memo } from 'react';
import ReactDOM from 'react-dom';
import { X, FileText, MapPin, ExternalLink } from 'lucide-react';
import type { Citation } from '../../../utils/types';

interface SourcesModalProps {
  citations: Citation[];
  activeIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onJumpToPage: (citation: Citation) => void;
  /** Whether this is a multi-paper chat context */
  isMultiPaper?: boolean;
}

/**
 * Modal for viewing detailed citation information
 */
function SourcesModalBase({
  citations,
  activeIndex,
  isOpen,
  onClose,
  onSelectIndex,
  onJumpToPage,
  isMultiPaper = false,
}: SourcesModalProps) {
  if (!isOpen || !citations?.length) return null;

  const citation = citations[activeIndex] ?? citations[0];
  const portalRoot = document.getElementById('chat-dock-overlay');

  // Check if this citation opens in a new tab
  const opensInNewTab = isMultiPaper && citation.sourceFileUrl;

  const modal = (
    <div className='absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity'
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className='relative bg-white rounded-t-xl shadow-2xl border-t border-gray-200 h-[70%] max-h-[500px] flex flex-col animate-in slide-in-from-bottom-5 duration-200 w-full'>
        {/* Header */}
        <div className='flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-gray-50/50 rounded-t-xl'>
          <div className='flex items-center gap-2 text-sm font-semibold text-gray-800'>
            <FileText
              size={16}
              className='text-orange-500'
            />
            Citation Details
          </div>
          <button
            className='p-1.5 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors'
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className='p-4 overflow-y-auto min-h-0 flex-1 bg-white'>
          {/* Citation Index Tabs */}
          <div className='flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide w-full'>
            {citations.map((_, index) => (
              <button
                key={index}
                className={`flex-shrink-0 w-8 h-8 rounded-lg border text-xs font-medium transition-all ${
                  index === activeIndex
                    ? 'bg-orange-500 text-white border-orange-500 shadow-md transform scale-105'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => onSelectIndex(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {/* Citation Content */}
          <div className='space-y-4'>
            {/* Paper Title (for multi-paper mode) */}
            {isMultiPaper && citation.sourcePaperTitle && (
              <div>
                <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5'>
                  From Paper
                </h4>
                <div className='flex items-center gap-2 text-sm font-medium text-orange-600'>
                  <FileText size={14} />
                  <span className='break-words'>
                    {citation.sourcePaperTitle}
                  </span>
                </div>
              </div>
            )}

            {/* Section Title */}
            <div>
              <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5'>
                Source Title
              </h4>
              <p className='text-sm font-semibold text-gray-900 leading-snug break-words'>
                {citation.title ?? 'Unknown Section'}
              </p>
            </div>

            {/* Excerpt */}
            <div>
              <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5'>
                Excerpt
              </h4>
              <div className='bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed border border-gray-100 whitespace-pre-wrap font-serif break-words'>
                "{citation.snippet || 'No text content available.'}"
              </div>
            </div>

            {/* Jump to Page Button */}
            {citation.page && (
              <div className='sticky bottom-0 pt-4 bg-white border-t border-gray-50 mt-4'>
                <button
                  className='w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-700 text-sm font-semibold rounded-lg hover:bg-orange-100 transition-colors border border-orange-200'
                  onClick={() => onJumpToPage(citation)}
                  title={opensInNewTab ? 'Opens in new tab' : 'Jump to page'}
                >
                  <MapPin size={16} />
                  {opensInNewTab ? 'Open' : 'Jump to'} Page {citation.page}
                  {opensInNewTab && <ExternalLink size={14} />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (portalRoot) {
    return ReactDOM.createPortal(modal, portalRoot);
  }
  return modal;
}

export const SourcesModal = memo(SourcesModalBase);
