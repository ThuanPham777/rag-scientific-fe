import { useState, Fragment } from 'react';
import { FileText, Search, RefreshCw, User, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAllPapers, useChunksPreview, useDeletePaper } from '../../hooks/useAdminConfig';
import PaginationBar from '../../components/common/PaginationBar';

function ChunksPanel({ paperId }: { paperId: string }) {
    const [page, setPage] = useState(1);
    const { data: chunksRes, isLoading } = useChunksPreview(paperId, page);
    const chunks = chunksRes?.data?.chunks || chunksRes?.data?.data?.chunks || [];
    const total = chunksRes?.data?.total || chunksRes?.data?.data?.total || 0;

    if (isLoading) {
        return (
            <div className='p-4 flex items-center gap-2 text-gray-400 text-sm'>
                <RefreshCw className='animate-spin' size={14} /> Đang tải chunks...
            </div>
        );
    }

    return (
        <div className='p-4 bg-gray-50 border-t'>
            <div className='text-xs text-gray-500 mb-2'>
                Tổng: <strong>{total}</strong> chunks
            </div>
            <div className='space-y-2 max-h-[300px] overflow-y-auto'>
                {chunks.map((chunk: any, i: number) => (
                    <div key={i} className='p-2 bg-white border rounded-lg text-xs'>
                        <div className='flex items-center gap-1.5 mb-1'>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium
                                ${chunk.modality === 'text' ? 'bg-blue-100 text-blue-700' :
                                    chunk.modality === 'table' ? 'bg-amber-100 text-amber-700' :
                                        'bg-purple-100 text-purple-700'}`}>
                                {chunk.modality || 'text'}
                            </span>
                            {chunk.page && <span className='text-gray-400'>p.{chunk.page}</span>}
                        </div>
                        <div className='text-gray-600 line-clamp-2'>{chunk.content || chunk.text}</div>
                    </div>
                ))}
                {chunks.length === 0 && <div className='text-center py-4 text-gray-400 text-xs'>Không có chunks</div>}
            </div>
            {total > 20 && (
                <PaginationBar
                    page={page}
                    totalPages={Math.ceil(total / 20)}
                    total={total}
                    label='chunks'
                    onPageChange={setPage}
                />
            )}
        </div>
    );
}

export default function AdminDocumentsPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const deleteMutation = useDeletePaper();

    const { data: res, isLoading } = useAllPapers({ page, limit: 20, search });
    const papers = res?.data?.papers || res?.data?.data?.papers || [];
    const total = res?.data?.total || res?.data?.data?.total || 0;
    const totalPages = res?.data?.totalPages || res?.data?.data?.totalPages || 1;

    const formatSize = (bytes: number | null) => {
        if (!bytes) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const statusColor = (s: string) => {
        switch (s) {
            case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
            case 'PROCESSING': return 'bg-amber-100 text-amber-700';
            case 'FAILED': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className='max-w-7xl mx-auto p-8'>
            <div className='mb-8'>
                <h1 className='text-3xl font-bold text-gray-900 flex items-center gap-3'>
                    <FileText className='text-indigo-600' size={32} />
                    Documents
                </h1>
                <p className='text-gray-500 mt-1'>Quản lý tất cả documents trong hệ thống ({total} tổng)</p>
            </div>

            {/* Search */}
            <div className='relative mb-6'>
                <Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
                <input
                    type='text'
                    placeholder='Tìm theo tên file hoặc title...'
                    className='w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none'
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
            </div>

            {/* Table */}
            <div className='bg-white rounded-2xl border shadow-sm overflow-hidden'>
                {isLoading ? (
                    <div className='flex items-center justify-center py-16 text-gray-400'>
                        <RefreshCw className='animate-spin mr-2' size={16} /> Đang tải...
                    </div>
                ) : papers.length === 0 ? (
                    <div className='text-center py-16 text-gray-400'>
                        <FileText className='mx-auto mb-2 text-gray-300' size={32} />
                        Không tìm thấy documents
                    </div>
                ) : (
                    <table className='w-full text-left'>
                        <thead>
                            <tr className='bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500'>
                                <th className='px-4 py-3 font-medium w-8'></th>
                                <th className='px-4 py-3 font-medium'>Title / File</th>
                                <th className='px-4 py-3 font-medium'>Author</th>
                                <th className='px-4 py-3 font-medium'>Status</th>
                                <th className='px-4 py-3 font-medium'>Pages</th>
                                <th className='px-4 py-3 font-medium'>Size</th>
                                <th className='px-4 py-3 font-medium'>KB</th>
                                <th className='px-4 py-3 font-medium'>Uploaded</th>
                                <th className='px-4 py-3 font-medium w-20'></th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-100'>
                            {papers.map((paper: any) => (
                                <Fragment key={paper.id}>
                                    <tr
                                        className='hover:bg-gray-50/50 transition-colors cursor-pointer'
                                        onClick={() => setExpandedId(expandedId === paper.id ? null : paper.id)}
                                    >
                                        <td className='px-4 py-3'>
                                            {expandedId === paper.id
                                                ? <ChevronDown size={14} className='text-gray-400' />
                                                : <ChevronRight size={14} className='text-gray-400' />}
                                        </td>
                                        <td className='px-4 py-3'>
                                            <div className='text-sm font-medium text-gray-900 truncate max-w-[300px]'>
                                                {paper.title || paper.fileName}
                                            </div>
                                            {paper.title && (
                                                <div className='text-xs text-gray-400 truncate max-w-[300px]'>{paper.fileName}</div>
                                            )}
                                        </td>
                                        <td className='px-4 py-3'>
                                            <div className='flex items-center gap-1.5 text-sm text-gray-700'>
                                                <User size={12} className='text-gray-400' />
                                                {paper.user?.displayName || paper.user?.email || '—'}
                                            </div>
                                        </td>
                                        <td className='px-4 py-3'>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(paper.status)}`}>
                                                {paper.status}
                                            </span>
                                        </td>
                                        <td className='px-4 py-3 text-sm text-gray-600'>{paper.numPages ?? '—'}</td>
                                        <td className='px-4 py-3 text-sm text-gray-600'>{formatSize(paper.fileSize)}</td>
                                        <td className='px-4 py-3'>
                                            {paper.isSystemKb ? (
                                                <span className='text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full'>System</span>
                                            ) : (
                                                <span className='text-xs text-gray-400'>—</span>
                                            )}
                                        </td>
                                        <td className='px-4 py-3 text-xs text-gray-400'>
                                            {new Date(paper.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className='px-4 py-3'>
                                            {deleteConfirm === paper.id ? (
                                                <div className='flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => {
                                                            deleteMutation.mutate(paper.id, {
                                                                onSuccess: () => {
                                                                    toast.success('Đã xóa document và chunks');
                                                                    setDeleteConfirm(null);
                                                                },
                                                                onError: () => toast.error('Xóa thất bại'),
                                                            });
                                                        }}
                                                        disabled={deleteMutation.isPending}
                                                        className='px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50'
                                                    >
                                                        {deleteMutation.isPending ? '...' : 'Xác nhận'}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className='px-2 py-1 bg-gray-200 text-xs rounded hover:bg-gray-300'
                                                    >
                                                        Hủy
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(paper.id); }}
                                                    className='p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors'
                                                    title='Xóa document'
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                    {expandedId === paper.id && (
                                        <tr>
                                            <td colSpan={9}>
                                                <ChunksPanel paperId={paper.id} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className='mt-6 bg-white rounded-2xl border shadow-sm overflow-hidden'>
                    <PaginationBar
                        page={page}
                        totalPages={totalPages}
                        total={total}
                        label='documents'
                        onPageChange={setPage}
                    />
                </div>
            )}
        </div>
    );
}

