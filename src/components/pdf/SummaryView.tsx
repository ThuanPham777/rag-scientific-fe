import { Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { SummaryResult } from '../../utils/types';

type Props = {
  summaryData: SummaryResult;
  onJumpToSource?: (jump: {
    pageNumber: number;
    rect?: { top: number; left: number; width: number; height: number };
  }) => void;
};

export default function SummaryView({ summaryData }: Props) {
  const summaryText = summaryData.summary || '';

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
        <div>
          <article className='prose prose-slate max-w-none'>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {summaryText}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </div>
  );
}
