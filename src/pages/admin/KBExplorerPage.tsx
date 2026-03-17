import { useState, useEffect } from 'react';
import { Database, Search, FileText, Copy, RefreshCw } from 'lucide-react';
import { getKbExplorerStats, getKbExplorerDuplicates, getKbExplorerChunks } from '../../services/api/adminConfig.api';
import PaginationBar from '../../components/common/PaginationBar';

interface CollectionStats {
    total_chunks: number;
    total_papers: number;
    by_modality: Record<string, number>;
    by_category: Record<string, number>;
}

interface ChunkData {
    id: string;
    content: string;
    metadata: Record<string, any>;
}

const COLLECTIONS = [
    { key: 'content_store', label: 'Content Store' },
    { key: 'system_knowledge_base', label: 'System Knowledge Base' },
] as const;

const MODALITY_COLORS: Record<string, string> = {
    text: 'bg-blue-100 text-blue-700',
    table: 'bg-green-100 text-green-700',
    image: 'bg-purple-100 text-purple-700',
    abstract: 'bg-orange-100 text-orange-700',
    unknown: 'bg-gray-100 text-gray-600',
};

export default function KBExplorerPage() {
    const [stats, setStats] = useState<Record<string, CollectionStats>>({});
    const [chunks, setChunks] = useState<ChunkData[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [chunksLoading, setChunksLoading] = useState(false);
    const [filterPaperId, setFilterPaperId] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [collection, setCollection] = useState('content_store');
    const [duplicates, setDuplicates] = useState<any[]>([]);
    const limit = 20;

    // Load stats
    useEffect(() => {
        setLoading(true);
        setError(null);
        getKbExplorerStats()
            .then((res) => setStats(res.data))
            .catch((err) => {
                setStats({});
                setError(`Không thể tải stats: ${err?.response?.status === 404 ? 'Endpoint chưa có — hãy restart NestJS backend' : err?.message}`);
            })
            .finally(() => setLoading(false));

        getKbExplorerDuplicates()
            .then((res) => setDuplicates(res.data.duplicates || []))
            .catch(() => setDuplicates([]));
    }, []);

    // Load chunks
    useEffect(() => {
        setChunksLoading(true);
        const params: any = { page, limit, collection };
        if (filterPaperId) params.paper_id = filterPaperId;
        if (filterCategory) params.category = filterCategory;

        getKbExplorerChunks(params)
            .then((res) => {
                setChunks(res.data.chunks || []);
                setTotal(res.data.total || 0);
            })
            .catch(() => { setChunks([]); setTotal(0); })
            .finally(() => setChunksLoading(false));
    }, [page, collection, filterPaperId, filterCategory]);

    const totalPages = Math.ceil(total / limit);
    const contentStats = stats[collection] || { total_chunks: 0, total_papers: 0, by_modality: {}, by_category: {} };

    if (loading) {
        return (
            <div className='max-w-7xl mx-auto p-8'>
                <div className='flex items-center justify-center p-20 text-gray-500'>
                    <RefreshCw className='animate-spin mr-2' size={20} />
                    Đang tải thống kê...
                </div>
            </div>
        );
    }

    return (
        <div className='max-w-7xl mx-auto p-8'>
            {/* Header */}
            <div className='mb-8'>
                <h1 className='text-3xl font-bold text-gray-900 flex items-center gap-3'>
                    <Database className='text-indigo-600' size={32} />
                    KB Explorer
                </h1>
                <p className='text-gray-500 mt-1'>Khám phá vector store: chunks, statistics, và duplicates</p>
            </div>

            {/* Error banner */}
            {error && (
                <div className='mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800'>
                    ⚠️ {error}
                </div>
            )}

            {/* Collection Selector — always shows both tabs */}
            <div className='flex gap-3 mb-6'>
                {COLLECTIONS.map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => { setCollection(key); setPage(1); }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${collection === key
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border hover:bg-gray-50'
                            }`}
                    >
                        {label}
                        {stats[key] && (
                            <span className='ml-2 text-xs opacity-75'>
                                ({stats[key].total_chunks.toLocaleString()})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Stats Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
                <div className='bg-white rounded-2xl border shadow-sm p-5'>
                    <div className='text-sm text-gray-500 mb-1'>Tổng Chunks</div>
                    <div className='text-3xl font-bold text-gray-900'>{contentStats.total_chunks.toLocaleString()}</div>
                </div>
                <div className='bg-white rounded-2xl border shadow-sm p-5'>
                    <div className='text-sm text-gray-500 mb-1'>Tổng Papers</div>
                    <div className='text-3xl font-bold text-gray-900'>{contentStats.total_papers}</div>
                </div>
                <div className='bg-white rounded-2xl border shadow-sm p-5'>
                    <div className='text-sm text-gray-500 mb-2'>Theo Modality</div>
                    <div className='flex flex-wrap gap-1'>
                        {Object.entries(contentStats.by_modality).map(([mod, count]) => (
                            <span key={mod} className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODALITY_COLORS[mod] || MODALITY_COLORS.unknown}`}>
                                {mod}: {count}
                            </span>
                        ))}
                        {Object.keys(contentStats.by_modality).length === 0 && (
                            <span className='text-xs text-gray-400'>Chưa có data</span>
                        )}
                    </div>
                </div>
                <div className='bg-white rounded-2xl border shadow-sm p-5'>
                    <div className='text-sm text-gray-500 mb-2'>Theo Category</div>
                    <div className='flex flex-wrap gap-1'>
                        {Object.entries(contentStats.by_category).slice(0, 5).map(([cat, count]) => (
                            <span key={cat} className='text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700'>
                                {cat}: {count}
                            </span>
                        ))}
                        {Object.keys(contentStats.by_category).length === 0 && (
                            <span className='text-xs text-gray-400'>Chưa có data</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className='bg-white rounded-2xl border shadow-sm mb-6'>
                <div className='px-6 py-4 border-b flex items-center gap-4'>
                    <Search size={18} className='text-gray-400' />
                    <input
                        type='text'
                        placeholder='Filter by Paper ID...'
                        className='flex-1 text-sm outline-none bg-transparent'
                        value={filterPaperId}
                        onChange={(e) => { setFilterPaperId(e.target.value); setPage(1); }}
                    />
                    <input
                        type='text'
                        placeholder='Filter by Category...'
                        className='w-48 text-sm outline-none bg-transparent border-l pl-4'
                        value={filterCategory}
                        onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                    />
                </div>

                {/* Chunks Table */}
                {chunksLoading ? (
                    <div className='p-12 text-center text-gray-500'>
                        <RefreshCw className='animate-spin mx-auto mb-2' size={20} />
                        Đang tải chunks...
                    </div>
                ) : chunks.length === 0 ? (
                    <div className='p-12 text-center text-gray-500'>
                        <FileText className='mx-auto mb-2 text-gray-300' size={32} />
                        Không tìm thấy chunks
                    </div>
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-left'>
                            <thead>
                                <tr className='bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500'>
                                    <th className='px-6 py-3 font-medium w-48'>Chunk ID</th>
                                    <th className='px-6 py-3 font-medium'>Content</th>
                                    <th className='px-6 py-3 font-medium w-32'>Modality</th>
                                    <th className='px-6 py-3 font-medium w-32'>Paper</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-100'>
                                {chunks.map((chunk) => (
                                    <tr key={chunk.id} className='hover:bg-gray-50/50 transition-colors'>
                                        <td className='px-6 py-3'>
                                            <code className='text-xs text-gray-500 font-mono'>{chunk.id.slice(0, 16)}...</code>
                                        </td>
                                        <td className='px-6 py-3'>
                                            <div className='text-sm text-gray-700 line-clamp-2'>{chunk.content}</div>
                                        </td>
                                        <td className='px-6 py-3'>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODALITY_COLORS[chunk.metadata?.modality] || MODALITY_COLORS.unknown}`}>
                                                {chunk.metadata?.modality || 'unknown'}
                                            </span>
                                        </td>
                                        <td className='px-6 py-3'>
                                            <code className='text-xs text-gray-500'>{(chunk.metadata?.paper_id || '').slice(0, 8)}...</code>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    total={total}
                    label='chunks'
                    onPageChange={setPage}
                />
            </div>

            {/* Duplicates */}
            {duplicates.length > 0 && (
                <div className='bg-white rounded-2xl border shadow-sm'>
                    <div className='px-6 py-4 border-b flex items-center gap-2'>
                        <Copy size={18} className='text-amber-500' />
                        <h3 className='font-semibold text-gray-900'>Duplicates ({duplicates.length})</h3>
                    </div>
                    <div className='p-4 space-y-2'>
                        {duplicates.map((dup: any, i: number) => (
                            <div key={i} className='flex items-center gap-3 p-3 bg-amber-50 rounded-lg'>
                                <span className='text-xs text-amber-700 font-mono'>Hash: {dup.hash?.slice(0, 16)}...</span>
                                <span className='text-xs text-amber-600'>{dup.paper_ids?.length} papers trùng</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
