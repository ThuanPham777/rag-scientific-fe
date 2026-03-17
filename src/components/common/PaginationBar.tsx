import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
    page: number;
    totalPages: number;
    total?: number;
    label?: string;
    onPageChange: (page: number) => void;
}

function getPageNumbers(page: number, totalPages: number): (number | '...')[] {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push('...');
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
            pages.push(i);
        }
        if (page < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }
    return pages;
}

export default function PaginationBar({ page, totalPages, total, label, onPageChange }: PaginationBarProps) {
    if (totalPages <= 1) return null;

    return (
        <div className='px-6 py-3 border-t flex items-center justify-between text-sm text-gray-500'>
            <span>{total !== undefined ? `${total} ${label || 'items'}` : ''}</span>
            <div className='flex items-center gap-1'>
                <button
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className='p-1.5 hover:bg-gray-100 rounded disabled:opacity-30'
                >
                    <ChevronLeft size={16} />
                </button>
                {getPageNumbers(page, totalPages).map((pg, idx) =>
                    pg === '...' ? (
                        <span key={`dot-${idx}`} className='px-1.5 text-gray-400'>…</span>
                    ) : (
                        <button
                            key={pg}
                            onClick={() => onPageChange(pg)}
                            className={`min-w-[32px] h-8 rounded text-sm font-medium transition-all ${page === pg
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'hover:bg-gray-100 text-gray-600'
                                }`}
                        >
                            {pg}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className='p-1.5 hover:bg-gray-100 rounded disabled:opacity-30'
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
