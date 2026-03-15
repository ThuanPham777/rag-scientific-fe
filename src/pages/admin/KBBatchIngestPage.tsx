import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Upload, Tags, Layers, CheckCircle,
    RefreshCw, X, Sparkles, FileUp, Download,
    ChevronDown, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../config/axios';
import { useKbCategories, useChunksPreview, useClassifyPaper } from '../../hooks/useAdminConfig';

const STEPS = [
    { label: 'Upload PDFs', icon: Upload },
    { label: 'Mapping', icon: Tags },
    { label: 'Chunks', icon: Layers },
    { label: 'Ingest', icon: CheckCircle },
];

interface FileEntry {
    file: File;
    fileUrl?: string;
    paperId?: string;
    uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
    ingestStatus: 'pending' | 'processing' | 'completed' | 'failed';
    categorySlugs: string[];
    tags: string[];
    error?: string;
}

export default function KBBatchIngestPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    // State
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [classifyingAll, setClassifyingAll] = useState(false);
    const [ingesting, setIngesting] = useState(false);
    const [expandedChunk, setExpandedChunk] = useState<string | null>(null);

    // Data
    const { data: catRes } = useKbCategories();
    const categories = catRes?.data?.data || [];
    const flatCategories: any[] = [];
    const flattenTree = (nodes: any[], depth = 0) => {
        for (const n of nodes) {
            flatCategories.push({ ...n, depth });
            if (n.children?.length) flattenTree(n.children, depth + 1);
        }
    };
    flattenTree(categories);

    // ─── Step 1: Upload PDFs ──────────────────────────────
    const handleAddFiles = useCallback((newFiles: File[]) => {
        const pdfFiles = newFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
        if (pdfFiles.length === 0) { toast.error('Chỉ chấp nhận file PDF'); return; }
        setFiles(prev => [
            ...prev,
            ...pdfFiles.map(f => ({
                file: f,
                uploadStatus: 'pending' as const,
                ingestStatus: 'pending' as const,
                categorySlugs: [],
                tags: [],
            })),
        ]);
    }, []);

    const handleRemoveFile = (idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        handleAddFiles(droppedFiles);
    }, [handleAddFiles]);

    const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) return;
            // Parse CSV (skip header)
            const mappings: Record<string, { categories: string[]; tags: string[] }> = {};
            for (let i = 1; i < lines.length; i++) {
                const parsed = parseCsvLine(lines[i]);
                if (parsed.length >= 1) {
                    mappings[parsed[0]] = {
                        categories: parsed[1] ? parsed[1].split(',').map(s => s.trim()) : [],
                        tags: parsed[2] ? parsed[2].split(',').map(s => s.trim()) : [],
                    };
                }
            }
            // Apply mappings to files
            setFiles(prev => prev.map(f => {
                const m = mappings[f.file.name];
                if (m) return { ...f, categorySlugs: m.categories, tags: m.tags };
                return f;
            }));
            toast.success(`Loaded mapping for ${Object.keys(mappings).length} files`);
        };
        reader.readAsText(file);
    }, []);

    const handleDownloadTemplate = () => {
        const csv = 'fileName,categories,tags\nexample.pdf,"artificial_intelligence,machine_learning","transformer,attention"';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'kb_mapping_template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    const handleUploadAll = async () => {
        setUploading(true);
        const updated = [...files];
        for (let i = 0; i < updated.length; i++) {
            if (updated[i].uploadStatus !== 'pending') continue;
            updated[i] = { ...updated[i], uploadStatus: 'uploading' };
            setFiles([...updated]);
            try {
                const formData = new FormData();
                formData.append('file', updated[i].file);
                const uploadRes = await api.post('/upload/pdf', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                const { url } = uploadRes.data.data;
                // Ingest to system KB
                const ingestRes = await api.post('/admin/kb/ingest', {
                    fileName: updated[i].file.name,
                    fileUrl: url,
                    fileSize: updated[i].file.size,
                });
                const paper = ingestRes.data.data;
                updated[i] = { ...updated[i], fileUrl: url, paperId: paper.id, uploadStatus: 'uploaded', ingestStatus: 'processing' };
                setFiles([...updated]);
                // Start polling for this paper
                pollStatus(paper.id, i);
            } catch {
                updated[i] = { ...updated[i], uploadStatus: 'failed', error: 'Upload failed' };
                setFiles([...updated]);
            }
        }
        setUploading(false);
    };

    const pollStatus = async (paperId: string, fileIdx: number) => {
        for (let attempt = 0; attempt < 60; attempt++) {
            await new Promise(r => setTimeout(r, 5000));
            try {
                const res = await api.get(`/admin/kb/papers/${paperId}/status`);
                const status = res.data.data?.status || res.data.status;
                if (status === 'COMPLETED') {
                    setFiles(prev => prev.map((f, i) => i === fileIdx ? { ...f, ingestStatus: 'completed' } : f));
                    return;
                }
                if (status === 'FAILED') {
                    setFiles(prev => prev.map((f, i) => i === fileIdx ? { ...f, ingestStatus: 'failed', error: 'RAG failed' } : f));
                    return;
                }
            } catch { /* ignore */ }
        }
    };

    // ─── Step 2: Auto-classify ──────────────────────────────
    const classify = useClassifyPaper();

    const handleClassifyAll = async () => {
        setClassifyingAll(true);
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (!f.paperId || f.ingestStatus !== 'completed') continue;
            try {
                const res = await classify.mutateAsync(f.paperId);
                const data = res?.data?.data;
                if (data?.categories) {
                    // Map RAG classifier slugs to actual DB category slugs
                    const ragSlugs: string[] = data.categories.map((c: any) => c.slug);
                    const matchedDbSlugs = flatCategories
                        .filter((dbCat: any) => {
                            const dbSlug = dbCat.slug?.toLowerCase();
                            const dbName = dbCat.name?.toLowerCase();
                            return ragSlugs.some(rs => {
                                const ragLower = rs.toLowerCase().replace(/_/g, ' ');
                                return dbSlug === rs || dbSlug?.includes(rs) || rs.includes(dbSlug) ||
                                    dbName?.includes(ragLower) || ragLower.includes(dbName);
                            });
                        })
                        .map((c: any) => c.slug);
                    setFiles(prev => prev.map((pf, pi) =>
                        pi === i ? { ...pf, categorySlugs: matchedDbSlugs, tags: data.tags || pf.tags } : pf
                    ));
                }
            } catch { /* skip failed */ }
        }
        setClassifyingAll(false);
        toast.success('Auto-classify hoàn tất');
    };

    const updateFileCategories = (idx: number, slugs: string[]) => {
        setFiles(prev => prev.map((f, i) => i === idx ? { ...f, categorySlugs: slugs } : f));
    };

    const updateFileTags = (idx: number, tags: string[]) => {
        setFiles(prev => prev.map((f, i) => i === idx ? { ...f, tags } : f));
    };

    // ─── Step 4: Final Ingest ──────────────────────────────
    const handleFinalIngest = async () => {
        setIngesting(true);
        const filesToIngest = files.filter(f => f.paperId && f.categorySlugs.length > 0);
        for (const f of filesToIngest) {
            if (!f.paperId) continue;
            try {
                const catIds = flatCategories
                    .filter(c => f.categorySlugs.includes(c.slug))
                    .map(c => c.id);
                await api.post(`/admin/kb/papers/${f.paperId}/add`, { categoryIds: catIds });
                if (f.tags.length) {
                    await api.patch(`/admin/kb/papers/${f.paperId}/tags`, { tags: f.tags });
                }
            } catch { /* continue */ }
        }
        setIngesting(false);
        toast.success(`Đã ingest ${filesToIngest.length} papers vào System KB!`);
        navigate('/admin/kb');
    };

    const completedCount = files.filter(f => f.ingestStatus === 'completed').length;
    const allUploaded = files.length > 0 && files.every(f => f.uploadStatus === 'uploaded');
    const allCompleted = files.length > 0 && files.every(f => f.ingestStatus === 'completed');

    const canNext = () => {
        if (step === 0) return allUploaded;
        if (step === 1) return files.some(f => f.categorySlugs.length > 0);
        if (step === 2) return allCompleted;
        return true;
    };

    return (
        <div className='max-w-6xl mx-auto p-8'>
            {/* Header */}
            <div className='mb-8'>
                <button onClick={() => navigate('/admin/kb')} className='text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3'>
                    <ArrowLeft size={14} /> Quay lại Knowledge Base
                </button>
                <h1 className='text-3xl font-bold text-gray-900'>📦 Batch Ingest Papers</h1>
                <p className='text-gray-500 mt-1'>Upload nhiều PDF cùng lúc + CSV mapping cho categories/tags</p>
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

            {/* Content */}
            <div className='bg-white rounded-2xl border shadow-sm p-6 min-h-[400px]'>
                {/* ─── Step 0: Upload ─── */}
                {step === 0 && (
                    <div>
                        <div className='flex items-center justify-between mb-4'>
                            <div>
                                <h2 className='text-lg font-semibold'>Upload PDFs</h2>
                                <p className='text-sm text-gray-500'>Kéo thả nhiều file PDF. Có thể upload CSV mapping.</p>
                            </div>
                            <div className='flex items-center gap-2'>
                                <button onClick={handleDownloadTemplate} className='px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1.5'>
                                    <Download size={14} /> Template CSV
                                </button>
                                <button onClick={() => csvInputRef.current?.click()} className='px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1.5'>
                                    <Upload size={14} /> Upload CSV
                                </button>
                                <input ref={csvInputRef} type='file' accept='.csv' className='hidden' onChange={handleCsvUpload} />
                            </div>
                        </div>

                        {/* Drop zone */}
                        <div
                            onDrop={onDrop}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer mb-4
                ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
                        >
                            <FileUp className='mx-auto text-gray-400 mb-2' size={40} />
                            <div className='text-gray-600 font-medium'>Kéo thả PDF vào đây</div>
                            <div className='text-sm text-gray-400'>hoặc click để chọn files</div>
                            <input ref={fileInputRef} type='file' accept='.pdf' multiple className='hidden'
                                onChange={(e) => handleAddFiles(Array.from(e.target.files || []))} />
                        </div>

                        {/* File list */}
                        {files.length > 0 && (
                            <div className='space-y-2'>
                                <div className='flex items-center justify-between'>
                                    <span className='text-sm font-medium text-gray-700'>{files.length} files</span>
                                    <button onClick={handleUploadAll} disabled={uploading || files.every(f => f.uploadStatus !== 'pending')}
                                        className='px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2'>
                                        {uploading ? <><RefreshCw size={14} className='animate-spin' /> Uploading...</> : <><Upload size={14} /> Upload All</>}
                                    </button>
                                </div>
                                {files.map((f, i) => (
                                    <div key={i} className='flex items-center gap-3 p-3 bg-gray-50 rounded-xl'>
                                        <div className='flex-1 text-sm font-medium truncate'>{f.file.name}</div>
                                        <div className='text-xs text-gray-400'>{(f.file.size / 1024 / 1024).toFixed(1)} MB</div>
                                        <StatusBadge upload={f.uploadStatus} ingest={f.ingestStatus} />
                                        {f.uploadStatus === 'pending' && (
                                            <button onClick={() => handleRemoveFile(i)} className='p-1 hover:bg-gray-200 rounded'><X size={14} /></button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Step 1: Mapping ─── */}
                {step === 1 && (
                    <div>
                        <div className='flex items-center justify-between mb-4'>
                            <div>
                                <h2 className='text-lg font-semibold'>Categories & Tags Mapping</h2>
                                <p className='text-sm text-gray-500'>Gán categories/tags cho từng file. CSV hoặc Auto-classify.</p>
                            </div>
                            <button onClick={handleClassifyAll} disabled={classifyingAll || !allCompleted}
                                className='px-4 py-2 bg-purple-600 text-white text-sm rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2'>
                                <Sparkles size={14} /> {classifyingAll ? 'Đang phân loại...' : '🤖 Auto-classify All'}
                            </button>
                        </div>

                        <div className='space-y-3 max-h-[500px] overflow-y-auto'>
                            {files.map((f, i) => (
                                <div key={i} className='p-4 border rounded-xl space-y-3'>
                                    <div className='flex items-center gap-2'>
                                        <span className='font-medium text-sm'>{f.file.name}</span>
                                        <StatusBadge upload={f.uploadStatus} ingest={f.ingestStatus} />
                                    </div>
                                    {/* Categories multi-select */}
                                    <div>
                                        <label className='text-xs font-medium text-gray-500'>Categories</label>
                                        <div className='flex flex-wrap gap-1 mt-1'>
                                            {flatCategories.map(cat => {
                                                const selected = f.categorySlugs.includes(cat.slug);
                                                return (
                                                    <button key={cat.id}
                                                        onClick={() => updateFileCategories(i, selected
                                                            ? f.categorySlugs.filter(s => s !== cat.slug)
                                                            : [...f.categorySlugs, cat.slug]
                                                        )}
                                                        className={`px-2 py-0.5 rounded-full text-xs transition-colors ${selected
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >{cat.name}</button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {/* Tags */}
                                    <div>
                                        <label className='text-xs font-medium text-gray-500'>Tags</label>
                                        <div className='flex flex-wrap gap-1 mt-1'>
                                            {f.tags.map((t, ti) => (
                                                <span key={ti} className='inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs'>
                                                    {t}
                                                    <button onClick={() => updateFileTags(i, f.tags.filter((_, j) => j !== ti))} className='hover:text-red-500'><X size={10} /></button>
                                                </span>
                                            ))}
                                            <TagInput onAdd={(tag) => updateFileTags(i, [...f.tags, tag])} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── Step 2: Chunks Review ─── */}
                {step === 2 && (
                    <div>
                        <h2 className='text-lg font-semibold mb-2'>Review Chunking</h2>
                        <p className='text-sm text-gray-500 mb-4'>Xem trước chunks cho từng file.</p>
                        <div className='space-y-2'>
                            {files.map((f, i) => (
                                <div key={i} className='border rounded-xl overflow-hidden'>
                                    <button
                                        onClick={() => setExpandedChunk(expandedChunk === f.paperId ? null : f.paperId || null)}
                                        className='w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left'
                                    >
                                        {expandedChunk === f.paperId ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        <span className='font-medium text-sm flex-1'>{f.file.name}</span>
                                        <StatusBadge upload={f.uploadStatus} ingest={f.ingestStatus} />
                                    </button>
                                    {expandedChunk === f.paperId && f.paperId && (
                                        <div className='border-t px-3 py-2'>
                                            <ChunksPreview paperId={f.paperId} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── Step 3: Ingest ─── */}
                {step === 3 && (
                    <div>
                        <h2 className='text-lg font-semibold mb-4'>Xác nhận Batch Ingest</h2>
                        <div className='space-y-3 mb-6'>
                            {files.map((f, i) => (
                                <div key={i} className='p-3 bg-gray-50 rounded-xl flex items-center gap-3'>
                                    <div className='flex-1'>
                                        <div className='font-medium text-sm'>{f.file.name}</div>
                                        <div className='flex flex-wrap gap-1 mt-1'>
                                            {f.categorySlugs.map(s => {
                                                const cat = flatCategories.find((c: any) => c.slug === s);
                                                return (
                                                    <span key={s} className='px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs'>{cat?.name || s}</span>
                                                );
                                            })}
                                            {f.tags.map(t => (
                                                <span key={t} className='px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs'>{t}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <StatusBadge upload={f.uploadStatus} ingest={f.ingestStatus} />
                                </div>
                            ))}
                        </div>
                        <div className='p-4 bg-indigo-50 rounded-xl text-sm text-indigo-700'>
                            Sẽ gán categories/tags cho <strong>{files.filter(f => f.categorySlugs.length > 0).length}</strong> papers vào System KB.
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
                    <button onClick={handleFinalIngest} disabled={ingesting}
                        className='px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50'>
                        <CheckCircle size={16} /> {ingesting ? 'Đang xử lý...' : `Ingest ${files.filter(f => f.categorySlugs.length > 0).length} papers`}
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Helper Components ──────────────────────────────────────────

function StatusBadge({ upload, ingest }: { upload: string; ingest: string }) {
    if (upload === 'pending') return <span className='px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs'>Chờ upload</span>;
    if (upload === 'uploading') return <span className='px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-xs flex items-center gap-1'><RefreshCw size={10} className='animate-spin' /> Uploading</span>;
    if (upload === 'failed') return <span className='px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs'>Upload lỗi</span>;
    if (ingest === 'processing') return <span className='px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-xs flex items-center gap-1'><RefreshCw size={10} className='animate-spin' /> Processing</span>;
    if (ingest === 'completed') return <span className='px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-xs'>✅ Done</span>;
    if (ingest === 'failed') return <span className='px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs'>❌ Failed</span>;
    return null;
}

function TagInput({ onAdd }: { onAdd: (tag: string) => void }) {
    const [value, setValue] = useState('');
    return (
        <input
            type='text' placeholder='+ tag' value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && value.trim()) {
                    e.preventDefault(); onAdd(value.trim()); setValue('');
                }
            }}
            className='w-20 px-2 py-0.5 text-xs border rounded-lg outline-none focus:ring-1 focus:ring-indigo-400'
        />
    );
}

function ChunksPreview({ paperId }: { paperId: string }) {
    const { data, isLoading } = useChunksPreview(paperId, 1);
    const chunks = data?.data?.chunks || data?.data?.data?.chunks || [];
    const total = data?.data?.total || data?.data?.data?.total || 0;

    if (isLoading) return <div className='text-sm text-gray-400 py-3 flex items-center gap-2'><RefreshCw size={12} className='animate-spin' /> Loading...</div>;
    if (chunks.length === 0) return <div className='text-sm text-gray-400 py-3'>Chưa có chunks (RAG đang xử lý...)</div>;

    return (
        <div>
            <div className='text-xs text-gray-500 mb-2'>Tổng: <strong>{total}</strong> chunks</div>
            <div className='space-y-1.5 max-h-[200px] overflow-y-auto'>
                {chunks.slice(0, 5).map((c: any, i: number) => (
                    <div key={i} className='p-2 bg-gray-50 rounded text-xs'>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium mr-2
              ${c.modality === 'text' ? 'bg-blue-100 text-blue-700' : c.modality === 'table' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                            {c.modality || 'text'}
                        </span>
                        <span className='text-gray-600 line-clamp-2'>{c.content || c.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
        current += char;
    }
    result.push(current.trim());
    return result;
}
