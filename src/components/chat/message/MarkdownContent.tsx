// src/components/chat/message/MarkdownContent.tsx
// Markdown content renderer with citation support

import { memo, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CitationLink } from './CitationLink';
import type { Citation } from '../../../utils/types';

interface MarkdownContentProps {
  content: string;
  citations?: Citation[];
  onJumpToCitation: (citationId: string) => void;
}

/**
 * Renders markdown content with inline citation links
 */
function MarkdownContentBase({
  content,
  onJumpToCitation,
}: MarkdownContentProps) {
  /**
   * Render text with inline citation links
   */
  const renderTextWithCitations = useCallback(
    (text: string): ReactNode[] => {
      const regex = /\[((?:S|cite:\s*)?\d+)\]/g;
      const nodes: ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          nodes.push(text.slice(lastIndex, match.index));
        }

        const fullMatch = match[0];
        const id = match[1].replace('cite:', '').trim();

        nodes.push(
          <CitationLink
            key={`${id}-${match.index}`}
            citationId={id}
            fullMatch={fullMatch}
            onJump={onJumpToCitation}
          />,
        );

        lastIndex = match.index + fullMatch.length;
      }

      if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
      }

      return nodes;
    },
    [onJumpToCitation],
  );

  /**
   * Process children to add citation links to text
   */
  const processChildren = useCallback(
    (children: ReactNode): ReactNode => {
      if (Array.isArray(children)) {
        return children.map((child, i) => {
          if (typeof child === 'string') {
            return <span key={i}>{renderTextWithCitations(child)}</span>;
          }
          return child;
        });
      }
      if (typeof children === 'string') {
        return renderTextWithCitations(children);
      }
      return children;
    },
    [renderTextWithCitations],
  );

  /**
   * Markdown component overrides
   */
  const markdownComponents = useMemo(
    () => ({
      p: ({ children, ...props }: any) => (
        <p
          className='mb-3 last:mb-0 leading-7 text-gray-800 break-words min-w-0'
          {...props}
        >
          {processChildren(children)}
        </p>
      ),
      li: ({ children, ...props }: any) => (
        <li
          className='pl-1 break-words'
          {...props}
        >
          {processChildren(children)}
        </li>
      ),
      a: ({ ...props }: any) => (
        <a
          className='text-blue-600 hover:underline break-all'
          target='_blank'
          rel='noreferrer'
          {...props}
        />
      ),
      ul: ({ ...props }: any) => (
        <ul
          className='list-disc list-outside ml-5 mb-3 space-y-1 text-gray-800'
          {...props}
        />
      ),
      ol: ({ ...props }: any) => (
        <ol
          className='list-decimal list-outside ml-5 mb-3 space-y-1 text-gray-800'
          {...props}
        />
      ),
      table: ({ ...props }: any) => (
        <div className='overflow-x-auto my-4 border border-gray-200 rounded-lg bg-white max-w-full'>
          <table
            className='min-w-full divide-y divide-gray-200 text-sm'
            {...props}
          />
        </div>
      ),
      thead: ({ ...props }: any) => (
        <thead
          className='bg-gray-50 text-gray-700'
          {...props}
        />
      ),
      th: ({ ...props }: any) => (
        <th
          className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap'
          {...props}
        />
      ),
      td: ({ ...props }: any) => (
        <td
          className='px-3 py-2 text-gray-600 align-top'
          {...props}
        />
      ),
      code: ({ inline, children, ...props }: any) => {
        return inline ? (
          <code
            className='bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-red-500 break-all whitespace-pre-wrap'
            {...props}
          >
            {children}
          </code>
        ) : (
          <pre
            className='bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm my-3 font-mono max-w-full'
            {...props}
          >
            <code>{children}</code>
          </pre>
        );
      },
    }),
    [processChildren],
  );

  return (
    <div className='text-sm leading-relaxed markdown-content w-full min-w-0'>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownContent = memo(MarkdownContentBase);
