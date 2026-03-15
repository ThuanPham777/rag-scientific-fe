import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Upload, Tags, Layers, CheckCircle,
    RefreshCw, X, Plus, Sparkles, FileUp,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../config/axios';
import {
    useKbCategories, useClassifyPaper,
    useAddPaperToKb, useChunksPreview,
} from '../../hooks/useAdminConfig';

const STEPS = [
    { label: 'Upload PDF', icon: Upload },
    { label: 'Categories & Tags', icon: Tags },
    { label: 'Xem Chunks', icon: Layers },
    { label: 'Hoàn tất', icon: CheckCircle },
];

export default function KBIngestWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    // Step 1 — Upload
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [paperData, setPaperData] = useState<any>(null);
    const [dragOver, setDragOver] = useState(false);

    // Step 2 — Categories & Tags
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [classifyResult, setClassifyResult] = useState<any>(null);

    // Step 3 — Chunks
    const [chunksPage, setChunksPage] = useState(1);

    const { data: catRes } = useKbCategories();
    const classify = useClassifyPaper();
    const addToKb = useAddPaperToKb();
    const chunksId = step >= 2 ? (paperData?.id || '') : '';
    const { data: chunksRes, isLoading: loadingChunks } = useChunksPreview(
        chunksId, chunksPage,
    );

    const categories = catRes?.data?.data || [];

    // Flatten category tree for checkboxes
    const flatCategories: any[] = [];
    const flattenTree = (nodes: any[], depth = 0) => {
        for (const n of nodes) {
            flatCategories.push({ ...n, depth });
            if (n.children?.length) flattenTree(n.children, depth + 1);
        }
    };
    flattenTree(categories);

    const chunks = chunksRes?.data?.chunks || chunksRes?.data?.data?.chunks || [];
    const totalChunks = chunksRes?.data?.total || chunksRes?.data?.data?.total || 0;

    // ─── Upload handler ──────────────────────────────
    const handleUpload = useCallback(async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            toast.error('Chỉ chấp nhận file PDF');
            return;
        }
        setUploading(true);
        setUploadProgress(0);
        try {
            // 1. Upload to S3
            const formData = new FormData();
            formData.append('file', file);
            const uploadRes = await api.post('/upload/pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
                },
            });
            const { url } = uploadRes.data.data;

            // 2. Create paper + trigger RAG ingest via admin KB endpoint
            const ingestRes = await api.post('/admin/kb/ingest', {
                fileName: file.name,
                fileUrl: url,
                fileSize: file.size,
            });
            const paper = ingestRes.data.data;
            setPaperData(paper);
            toast.success(`Uploaded "${file.name}" — RAG đang xử lý...`);

            // 3. Poll for COMPLETED status
            pollPaperStatus(paper.id);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Upload thất bại');
        }
        setUploading(false);
    }, []);

    const pollPaperStatus = useCallback(async (paperId: string) => {
        const maxAttempts = 60; // 5 min
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise((r) => setTimeout(r, 5000));
            try {
                const res = await api.get(`/admin/kb/papers/${paperId}/status`);
                const status = res.data.data?.status || res.data.status;
                if (status === 'COMPLETED') {
                    setPaperData((prev: any) => ({ ...prev, status: 'COMPLETED', ...res.data.data }));
                    toast.success('RAG ingest hoàn tất! Chuyển sang step tiếp.');
                    return;
                }
                if (status === 'FAILED') {
                    toast.error('RAG ingest thất bại.');
                    return;
                }
            } catch { /* ignore polling errors */ }
        }
    }, []);

    // Drag-drop handlers
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    }, [handleUpload]);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    // ─── Classification ──────────────────────────────
    const handleClassify = async () => {
        if (!paperData) return;
        try {
            const res = await classify.mutateAsync(paperData.id);
            const data = res?.data?.data;
            setClassifyResult(data);
            if (data?.categories) {
                const slugs = data.categories.map((c: any) => c.slug);
                const matchIds = flatCategories
                    .filter((fc) => slugs.includes(fc.slug))
                    .map((fc) => fc.id);
                setSelectedCategories(matchIds);
            }
            if (data?.tags) setTags(data.tags);
            toast.success('Phân loại thành công!');
        } catch {
            toast.error('Phân loại thất bại. Hãy chọn categories thủ công.');
        }
    };

    const handleAddTag = () => {
        const t = tagInput.trim();
        if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(''); }
    };

    const handleFinish = async () => {
        if (!paperData) return;
        try {
            await addToKb.mutateAsync({ paperId: paperData.id, categoryIds: selectedCategories });
            toast.success('Đã ingest paper vào System Knowledge Base!');
            navigate('/admin/kb');
        } catch {
            toast.error('Ingest thất bại, vui lòng thử lại.');
        }
    };

    const canNext = () => {
        if (step === 0) return paperData && paperData.status === 'COMPLETED';
        if (step === 1) return selectedCategories.length > 0;
        return true;
    };

    return (
        <div className='max-w-5xl mx-auto p-8'>
            {/* Header */}
            <div className='mb-8'>
                <button onClick={() => navigate('/admin/kb')} className='text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3'>
                    <ArrowLeft size={14} /> Quay lại Knowledge Base
                </button>
                <h1 className='text-3xl font-bold text-gray-900'>📥 Ingest Paper vào System KB</h1>
            </div>

            {/* Step indicator */}
            <div className='flex items-center gap-2 mb-8'>
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const active = i === step;
                    const done = i < step;
                    return (
                        <div key={i} className='flex items-center gap-2'>
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${active ? 'bg-indigo-600 text-white shadow-md' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                                <Icon size={16} /> {s.label}
                            </div>
                            {i < STEPS.length - 1 && <div className='w-6 h-px bg-gray-300' />}
                        </div>
                    );
                })}
            </div>

            {/* Step content */}
            <div className='bg-white rounded-2xl border shadow-sm p-6 min-h-[400px]'>
                {/* ─── Step 0: Upload PDF ─── */}
                {step === 0 && (
                    <div>
                        <h2 className='text-lg font-semibold mb-2'>Upload PDF cho System KB</h2>
                        <p className='text-sm text-gray-500 mb-6'>
                            Upload một file PDF mới. File sẽ được upload lên S3 và xử lý qua RAG pipeline.
                        </p>

                        {!paperData ? (
                            <div
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onDragLeave={() => setDragOver(false)}
                                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
                  ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.pdf';
                                    input.onchange = (e) => {
                                        const f = (e.target as HTMLInputElement).files?.[0];
                                        if (f) handleUpload(f);
                                    };
                                    input.click();
                                }}
                            >
                                {uploading ? (
                                    <div className='space-y-3'>
                                        <RefreshCw className='mx-auto animate-spin text-indigo-500' size={32} />
                                        <div className='text-sm text-gray-500'>Đang upload... {uploadProgress}%</div>
                                        <div className='w-64 mx-auto bg-gray-200 rounded-full h-2'>
                                            <div className='bg-indigo-500 h-2 rounded-full transition-all' style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className='space-y-3'>
                                        <FileUp className='mx-auto text-gray-400' size={48} />
                                        <div className='text-gray-600 font-medium'>Kéo thả PDF vào đây</div>
                                        <div className='text-sm text-gray-400'>hoặc click để chọn file</div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className='space-y-4'>
                                <div className='p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3'>
                                    <CheckCircle className='text-emerald-600 shrink-0' size={24} />
                                    <div className='flex-1'>
                                        <div className='font-medium text-emerald-800'>{paperData.title || paperData.fileName}</div>
                                        <div className='text-xs text-emerald-600'>
                                            {paperData.status === 'COMPLETED' ? '✅ RAG ingest hoàn tất' :
                                                paperData.status === 'PROCESSING' ? '⏳ Đang xử lý...' :
                                                    paperData.status === 'FAILED' ? '❌ Xử lý thất bại' :
                                                        '⏳ Đang chờ...'}
                                            {paperData.numPages && ` • ${paperData.numPages} trang`}
                                        </div>
                                    </div>
                                    <button onClick={() => setPaperData(null)} className='p-1 hover:bg-emerald-100 rounded'>
                                        <X size={16} className='text-emerald-600' />
                                    </button>
                                </div>
                                {paperData.status === 'PROCESSING' && (
                                    <div className='flex items-center gap-2 text-sm text-amber-600'>
                                        <RefreshCw className='animate-spin' size={14} />
                                        RAG đang xử lý file. Bạn có thể chờ hoặc chuyển sang step tiếp...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Step 1: Categories & Tags ─── */}
                {step === 1 && (
                    <div>
                        <div className='flex items-center justify-between mb-4'>
                            <div>
                                <h2 className='text-lg font-semibold'>Categories & Metadata</h2>
                                <p className='text-sm text-gray-500'>Gán categories và tags cho: <strong>{paperData?.title || paperData?.fileName}</strong></p>
                            </div>
                            <button onClick={handleClassify} disabled={classify.isPending || paperData?.status !== 'COMPLETED'}
                                className='px-4 py-2 bg-purple-600 text-white text-sm rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50'>
                                <Sparkles size={14} />
                                {classify.isPending ? 'Đang phân loại...' : 'Auto-classify'}
                            </button>
                        </div>

                        {classifyResult && (
                            <div className='mb-4 p-3 bg-purple-50 rounded-xl border border-purple-200 text-sm'>
                                <div className='font-medium text-purple-700 mb-1'>🤖 Kết quả AI Classification:</div>
                                {classifyResult.categories?.map((c: any) => (
                                    <span key={c.slug} className='inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs mr-2'>
                                        {c.slug} ({(c.confidence * 100).toFixed(0)}%)
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className='mb-6'>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Categories (chọn ít nhất 1)</label>
                            <div className='max-h-[200px] overflow-y-auto border rounded-xl p-3 space-y-1'>
                                {flatCategories.map((cat) => (
                                    <label key={cat.id} className='flex items-center gap-2 py-1 hover:bg-gray-50 rounded px-2 cursor-pointer' style={{ paddingLeft: `${cat.depth * 20 + 8}px` }}>
                                        <input type='checkbox' checked={selectedCategories.includes(cat.id)}
                                            onChange={() => setSelectedCategories((prev) =>
                                                prev.includes(cat.id) ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                                            )}
                                            className='rounded border-gray-300 text-indigo-600 focus:ring-indigo-500' />
                                        <span className='text-sm text-gray-800'>{cat.name}</span>
                                        <span className='text-xs text-gray-400'>{cat.slug}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-2'>Tags</label>
                            <div className='flex flex-wrap gap-2 mb-2'>
                                {tags.map((t) => (
                                    <span key={t} className='inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs'>
                                        {t}
                                        <button onClick={() => setTags(tags.filter((x) => x !== t))} className='hover:text-red-500'><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                            <div className='flex gap-2'>
                                <input type='text' placeholder='Thêm tag...'
                                    className='flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none'
                                    value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} />
                                <button onClick={handleAddTag} className='px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors'><Plus size={16} /></button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 2: Chunks Preview ─── */}
                {step === 2 && (
                    <div>
                        <h2 className='text-lg font-semibold mb-2'>Xem trước Chunks</h2>
                        <p className='text-sm text-gray-500 mb-4'>Tổng: <strong>{totalChunks}</strong> chunks.</p>
                        {loadingChunks ? (
                            <div className='flex items-center justify-center py-10 text-gray-400'>
                                <RefreshCw className='animate-spin mr-2' size={16} /> Đang tải chunks...
                            </div>
                        ) : (
                            <>
                                <div className='space-y-3 max-h-[400px] overflow-y-auto'>
                                    {chunks.map((chunk: any, i: number) => (
                                        <div key={i} className='p-3 border rounded-xl text-sm'>
                                            <div className='flex items-center gap-2 mb-1'>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                          ${chunk.modality === 'text' ? 'bg-blue-100 text-blue-700' :
                                                        chunk.modality === 'table' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {chunk.modality || 'text'}
                                                </span>
                                                {chunk.page && <span className='text-xs text-gray-400'>Trang {chunk.page}</span>}
                                            </div>
                                            <div className='text-gray-700 line-clamp-3'>{chunk.content || chunk.text}</div>
                                        </div>
                                    ))}
                                    {chunks.length === 0 && <div className='text-center py-10 text-gray-400 text-sm'>Chưa có chunks.</div>}
                                </div>
                                {totalChunks > 20 && (
                                    <div className='flex justify-center gap-2 mt-4'>
                                        <button onClick={() => setChunksPage(Math.max(1, chunksPage - 1))} disabled={chunksPage === 1} className='px-3 py-1.5 bg-gray-100 rounded-lg text-sm disabled:opacity-40'>Trước</button>
                                        <span className='px-3 py-1.5 text-sm text-gray-500'>Trang {chunksPage} / {Math.ceil(totalChunks / 20)}</span>
                                        <button onClick={() => setChunksPage(chunksPage + 1)} disabled={chunksPage >= Math.ceil(totalChunks / 20)} className='px-3 py-1.5 bg-gray-100 rounded-lg text-sm disabled:opacity-40'>Sau</button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ─── Step 3: Finish ─── */}
                {step === 3 && (
                    <div>
                        <h2 className='text-lg font-semibold mb-4'>Xác nhận Ingest</h2>
                        <div className='space-y-4'>
                            <div className='p-4 bg-gray-50 rounded-xl'>
                                <div className='text-sm text-gray-500'>Paper</div>
                                <div className='font-medium'>{paperData?.title || paperData?.fileName}</div>
                            </div>
                            <div className='p-4 bg-gray-50 rounded-xl'>
                                <div className='text-sm text-gray-500'>Categories ({selectedCategories.length})</div>
                                <div className='flex flex-wrap gap-1 mt-1'>
                                    {flatCategories.filter((c) => selectedCategories.includes(c.id)).map((c) => (
                                        <span key={c.id} className='px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs'>{c.slug} — {c.name}</span>
                                    ))}
                                </div>
                            </div>
                            <div className='p-4 bg-gray-50 rounded-xl'>
                                <div className='text-sm text-gray-500'>Tags ({tags.length})</div>
                                <div className='flex flex-wrap gap-1 mt-1'>
                                    {tags.map((t) => <span key={t} className='px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs'>{t}</span>)}
                                    {tags.length === 0 && <span className='text-xs text-gray-400'>Không có tags</span>}
                                </div>
                            </div>
                            <div className='p-4 bg-gray-50 rounded-xl'>
                                <div className='text-sm text-gray-500'>Chunks</div>
                                <div className='font-medium'>{totalChunks} chunks</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className='flex justify-between mt-6'>
                <button onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}
                    className='px-5 py-2.5 text-sm text-gray-600 bg-white border rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-40'>
                    <ArrowLeft size={16} /> Quay lại
                </button>
                {step < 3 ? (
                    <button onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()}
                        className='px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-40'>
                        Tiếp tục <ArrowRight size={16} />
                    </button>
                ) : (
                    <button onClick={handleFinish} disabled={addToKb.isPending}
                        className='px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50'>
                        <CheckCircle size={16} /> {addToKb.isPending ? 'Đang xử lý...' : 'Ingest vào System KB'}
                    </button>
                )}
            </div>
        </div>
    );
}
