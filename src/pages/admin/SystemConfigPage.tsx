import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Cpu, Thermometer, Zap, Pencil, Eye, MessageSquare, RotateCcw, FileText, ArrowRight, Database, Lock, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemConfigs, useLlmModels, useUpdateConfig, useRestoreDefault } from '../../hooks/useAdminConfig';

const INGEST_MODELS: Record<string, { label: string; description: string; icon: typeof Cpu }> = {
    'llm.classification': { label: 'Classification', description: 'Auto-classify papers vào categories', icon: Cpu },
    'llm.summarization': { label: 'Summarization', description: 'Tóm tắt tables/images khi ingest', icon: Cpu },
    'llm.vision': { label: 'Vision', description: 'Trích xuất nội dung hình ảnh (explain region)', icon: Eye },
};

const CHAT_MODELS: Record<string, { label: string; description: string; icon: typeof Cpu }> = {
    'llm.generation': { label: 'Generation', description: 'Trả lời câu hỏi user', icon: MessageSquare },
    'llm.hyde': { label: 'HyDE', description: 'Hypothetical Document Embeddings — cải thiện retrieval', icon: Zap },
    'llm.condense': { label: 'Condense', description: 'Rút gọn follow-up thành standalone query', icon: Zap },
};

const RAG_CONFIGS: Record<string, { label: string; description: string }> = {
    'rag.chat_history_limit': { label: 'Chat History Limit', description: 'Số tin nhắn gửi kèm làm context' },
    'rag.relevance_threshold': { label: 'Relevance Threshold', description: 'Ngưỡng similarity tối thiểu (0-1)' },
    'rag.retrieval_k': { label: 'Retrieval K', description: 'Số chunks retrieve mỗi query' },
};

const PROMPT_CONFIGS: Record<string, { label: string; description: string; pipelineStep: string }> = {
    'prompt.rag_instructions': {
        label: 'RAG Answer Generation',
        description: 'System prompt chính — hướng dẫn LLM trả lời dựa trên context',
        pipelineStep: 'Retrieval → LLM Generation',
    },
    'prompt.region_explain': {
        label: 'Region Explanation',
        description: 'Prompt cho Explain Region — phân tích crop ảnh từ PDF',
        pipelineStep: 'Image Crop → Vision LLM',
    },
    'prompt.condense_question': {
        label: 'Condense Question',
        description: 'Prompt cho rút gọn follow-up question thành standalone query',
        pipelineStep: 'Chat History → Condensed Query',
    },
};

// Pipeline flow visualization data
const PIPELINE_STEPS = [
    { id: 'input', label: 'User Input', color: 'bg-blue-100 border-blue-300 text-blue-700', type: 'start' },
    { id: 'condense', label: 'Condense', color: 'bg-purple-100 border-purple-300 text-purple-700', promptKey: 'prompt.condense_question' },
    { id: 'retrieve', label: 'Retrieve', color: 'bg-amber-100 border-amber-300 text-amber-700', type: 'system' },
    { id: 'generate', label: 'Generate', color: 'bg-emerald-100 border-emerald-300 text-emerald-700', promptKey: 'prompt.rag_instructions' },
    { id: 'output', label: 'Response', color: 'bg-blue-100 border-blue-300 text-blue-700', type: 'end' },
];

function LlmCard({ configKey, info, config, editing, models, onUpdate }: {
    configKey: string;
    info: { label: string; description: string; icon: typeof Cpu };
    config: any;
    editing: boolean;
    models: any;
    onUpdate: (key: string, value: any) => void;
}) {
    const Icon = info.icon;
    return (
        <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${editing ? 'ring-2 ring-indigo-100' : ''}`}>
            <div className='flex items-center gap-3 mb-4'>
                <div className='p-2 bg-indigo-50 rounded-lg text-indigo-600'>
                    <Icon size={18} />
                </div>
                <div>
                    <div className='font-semibold text-gray-900'>{info.label}</div>
                    <div className='text-xs text-gray-500'>{info.description}</div>
                </div>
            </div>

            <label className='block text-xs font-medium text-gray-600 mb-1'>Provider</label>
            <select
                disabled={!editing}
                className='w-full mb-3 px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed'
                value={config.provider || 'openai'}
                onChange={(e) => onUpdate(configKey, { ...config, provider: e.target.value })}
            >
                <option value='openai'>OpenAI</option>
                <option value='groq'>Groq</option>
                <option value='gemini'>Gemini</option>
            </select>

            <label className='block text-xs font-medium text-gray-600 mb-1'>Model</label>
            <select
                disabled={!editing}
                className='w-full mb-3 px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed'
                value={config.model || ''}
                onChange={(e) => onUpdate(configKey, { ...config, model: e.target.value })}
            >
                {(models[config.provider || 'openai'] || []).map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name || m.id}</option>
                ))}
                {!(models[config.provider || 'openai'] || []).some((m: any) => m.id === config.model) &&
                    config.model && <option value={config.model}>{config.model}</option>}
            </select>

            <label className='block text-xs font-medium text-gray-600 mb-1'>
                <Thermometer size={12} className='inline mr-1' />
                Temperature: {(config.temperature ?? 0.2).toFixed(1)}
            </label>
            <input
                type='range' min='0' max='1' step='0.1'
                disabled={!editing}
                className='w-full disabled:opacity-60 disabled:cursor-not-allowed'
                value={config.temperature ?? 0.2}
                onChange={(e) => onUpdate(configKey, { ...config, temperature: parseFloat(e.target.value) })}
            />
        </div>
    );
}

export default function SystemConfigPage() {
    const { data: configRes, isLoading } = useSystemConfigs();
    const { data: modelsRes } = useLlmModels();
    const updateConfig = useUpdateConfig();
    const restoreDefault = useRestoreDefault();

    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editState, setEditState] = useState<Record<string, any>>({});
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

    const configs: any[] = configRes?.data?.data || [];
    const models = modelsRes?.data?.data || {};

    useEffect(() => {
        if (configs.length) {
            const state: Record<string, any> = {};
            for (const c of configs) state[c.key] = c.value;
            setEditState(state);
        }
    }, [configRes]);

    const getConfig = (key: string) => editState[key] || {};

    const handleUpdate = (key: string, value: any) => {
        setEditState((s) => ({ ...s, [key]: value }));
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const allKeys = [
                ...Object.keys(INGEST_MODELS),
                ...Object.keys(CHAT_MODELS),
                ...Object.keys(RAG_CONFIGS),
                ...Object.keys(PROMPT_CONFIGS),
            ];
            const promises = allKeys
                .filter((key) => editState[key] !== undefined)
                .map((key) => updateConfig.mutateAsync({ key, value: editState[key] }));
            await Promise.all(promises);
            toast.success('Đã lưu tất cả cấu hình thành công!');
            setEditing(false);
        } catch {
            toast.error('Lưu cấu hình thất bại, vui lòng thử lại.');
        }
        setSaving(false);
    };

    const handleRestorePrompt = async (key: string) => {
        try {
            await restoreDefault.mutateAsync(key);
            toast.success(`Đã khôi phục "${PROMPT_CONFIGS[key]?.label}" về mặc định!`);
        } catch {
            toast.error('Khôi phục thất bại.');
        }
    };

    const handleCancel = () => {
        if (configs.length) {
            const state: Record<string, any> = {};
            for (const c of configs) state[c.key] = c.value;
            setEditState(state);
        }
        setEditing(false);
        setSelectedPrompt(null);
    };

    if (isLoading) {
        return (
            <div className='max-w-6xl mx-auto p-8'>
                <div className='flex items-center justify-center p-20 text-gray-500'>
                    <RefreshCw className='animate-spin mr-2' size={20} />
                    Đang tải cấu hình...
                </div>
            </div>
        );
    }

    return (
        <div className='max-w-6xl mx-auto p-8'>
            {/* Header */}
            <div className='mb-8 flex items-center justify-between'>
                <div>
                    <h1 className='text-3xl font-bold text-gray-900 flex items-center gap-3'>
                        <Settings className='text-indigo-600' size={32} />
                        System Configuration
                    </h1>
                    <p className='text-gray-500 mt-1'>Cấu hình LLM models, tham số RAG pipeline, và prompt templates</p>
                </div>
                {!editing ? (
                    <button
                        onClick={() => setEditing(true)}
                        className='px-5 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm'
                    >
                        <Pencil size={16} />
                        Chỉnh sửa
                    </button>
                ) : (
                    <div className='flex items-center gap-3'>
                        <button onClick={handleCancel} className='px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors'>
                            Hủy
                        </button>
                        <button
                            onClick={handleSaveAll}
                            disabled={saving}
                            className='px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50'
                        >
                            <Save size={16} />
                            {saving ? 'Đang lưu...' : 'Lưu tất cả'}
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Section 1: Ingest Pipeline ─── */}
            <div className='mb-10'>
                <div className='flex items-center gap-2 mb-4'>
                    <div className='w-1 h-6 bg-emerald-500 rounded-full' />
                    <h2 className='text-lg font-semibold text-gray-900'>🔬 Ingest Pipeline</h2>
                    <span className='text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full'>Khi upload & xử lý PDF</span>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {Object.entries(INGEST_MODELS).map(([key, info]) => (
                        <LlmCard
                            key={key}
                            configKey={key}
                            info={info}
                            config={getConfig(key)}
                            editing={editing}
                            models={models}
                            onUpdate={handleUpdate}
                        />
                    ))}
                </div>
            </div>

            {/* ─── Section 2: Chat Pipeline ─── */}
            <div className='mb-10'>
                <div className='flex items-center gap-2 mb-4'>
                    <div className='w-1 h-6 bg-blue-500 rounded-full' />
                    <h2 className='text-lg font-semibold text-gray-900'>💬 Chat Pipeline</h2>
                    <span className='text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full'>Khi user đặt câu hỏi</span>
                </div>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {Object.entries(CHAT_MODELS).map(([key, info]) => (
                        <LlmCard
                            key={key}
                            configKey={key}
                            info={info}
                            config={getConfig(key)}
                            editing={editing}
                            models={models}
                            onUpdate={handleUpdate}
                        />
                    ))}
                </div>
            </div>

            {/* ─── Section 3: RAG Parameters ─── */}
            <div className='mb-10'>
                <div className='flex items-center gap-2 mb-4'>
                    <div className='w-1 h-6 bg-amber-500 rounded-full' />
                    <h2 className='text-lg font-semibold text-gray-900'>⚙️ RAG Parameters</h2>
                </div>
                <div className='bg-white rounded-2xl border shadow-sm overflow-hidden'>
                    <table className='w-full text-left'>
                        <thead>
                            <tr className='bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500'>
                                <th className='px-6 py-4 font-medium'>Tham số</th>
                                <th className='px-6 py-4 font-medium'>Mô tả</th>
                                <th className='px-6 py-4 font-medium'>Giá trị</th>
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-100'>
                            {Object.entries(RAG_CONFIGS).map(([key, info]) => {
                                const config = getConfig(key);
                                return (
                                    <tr key={key} className='hover:bg-gray-50/50 transition-colors'>
                                        <td className='px-6 py-4 font-medium text-gray-900 text-sm'>{info.label}</td>
                                        <td className='px-6 py-4 text-gray-500 text-sm'>{info.description}</td>
                                        <td className='px-6 py-4'>
                                            <input
                                                type='number'
                                                step={key.includes('threshold') ? '0.05' : '1'}
                                                disabled={!editing}
                                                className='w-24 px-3 py-1.5 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed'
                                                value={config.value ?? ''}
                                                onChange={(e) => handleUpdate(key, { value: parseFloat(e.target.value) })}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Section 4: LLM Prompt Templates (Pipeline Flow) ─── */}
            <div className='mb-10'>
                <div className='flex items-center gap-2 mb-4'>
                    <div className='w-1 h-6 bg-violet-500 rounded-full' />
                    <h2 className='text-lg font-semibold text-gray-900'>📝 LLM Prompt Templates</h2>
                    <span className='text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full'>Click vào node để chỉnh prompt</span>
                </div>

                {/* Pipeline Flow Diagram */}
                <div className='bg-white rounded-2xl border shadow-sm p-6 mb-4'>
                    <div className='text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider'>Chat Pipeline Flow</div>
                    <div className='flex items-center gap-2 overflow-x-auto pb-2'>
                        {PIPELINE_STEPS.map((step, idx) => (
                            <div key={step.id} className='flex items-center gap-2'>
                                <button
                                    onClick={() => step.promptKey ? setSelectedPrompt(step.promptKey) : null}
                                    className={`
                                        px-4 py-2.5 rounded-xl border-2 text-sm font-medium whitespace-nowrap transition-all
                                        ${step.color}
                                        ${step.promptKey ? 'cursor-pointer hover:shadow-md hover:scale-105' : 'cursor-default opacity-70'}
                                        ${selectedPrompt === step.promptKey ? 'ring-2 ring-indigo-500 ring-offset-2 shadow-lg scale-105' : ''}
                                    `}
                                >
                                    {step.promptKey && <FileText size={14} className='inline mr-1.5 -mt-0.5' />}
                                    {step.label}
                                </button>
                                {idx < PIPELINE_STEPS.length - 1 && (
                                    <ArrowRight size={16} className='text-gray-300 flex-shrink-0' />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className='mt-3 flex items-center gap-3 text-xs text-gray-400'>
                        <span className='flex items-center gap-1'><FileText size={12} /> = Editable prompt</span>
                        <span>|</span>
                        <span>Nhấn vào node có icon 📝 để chỉnh sửa prompt</span>
                    </div>
                </div>

                {/* Prompt Cards */}
                <div className='space-y-4'>
                    {Object.entries(PROMPT_CONFIGS).map(([key, info]) => {
                        const config = getConfig(key);
                        const isSelected = selectedPrompt === key;

                        return (
                            <div
                                key={key}
                                className={`bg-white rounded-2xl border shadow-sm transition-all ${isSelected ? 'ring-2 ring-indigo-200 border-indigo-300' : ''}`}
                            >
                                <button
                                    onClick={() => setSelectedPrompt(isSelected ? null : key)}
                                    className='w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 rounded-t-2xl transition-colors'
                                >
                                    <div className='flex items-center gap-3'>
                                        <div className='p-2 bg-violet-50 rounded-lg text-violet-600'>
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <div className='font-semibold text-gray-900'>{info.label}</div>
                                            <div className='text-xs text-gray-500'>{info.description}</div>
                                        </div>
                                    </div>
                                    <div className='flex items-center gap-2'>
                                        <span className='text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full'>{info.pipelineStep}</span>
                                        <span className={`text-gray-400 transition-transform ${isSelected ? 'rotate-180' : ''}`}>▼</span>
                                    </div>
                                </button>

                                {isSelected && (
                                    <div className='px-6 pb-5 border-t border-gray-100'>
                                        <div className='mt-4'>
                                            <div className='flex items-center justify-between mb-2'>
                                                <label className='text-xs font-medium text-gray-600'>Prompt Text</label>
                                                {editing && (
                                                    <button
                                                        onClick={() => handleRestorePrompt(key)}
                                                        disabled={restoreDefault.isPending}
                                                        className='text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors'
                                                    >
                                                        <RotateCcw size={12} />
                                                        {restoreDefault.isPending ? 'Đang khôi phục...' : 'Restore Default'}
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                disabled={!editing}
                                                rows={8}
                                                className='w-full px-4 py-3 border rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed font-mono leading-relaxed resize-y'
                                                value={config.text || ''}
                                                onChange={(e) => handleUpdate(key, { ...config, text: e.target.value })}
                                                placeholder='Nhập prompt template...'
                                            />
                                            <div className='mt-2 text-xs text-gray-400'>
                                                {(config.text || '').length} ký tự
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Section 5: Embedding & Chunking (Read-only) ─── */}
            <div className='mb-10'>
                <div className='flex items-center gap-2 mb-4'>
                    <div className='w-1 h-6 bg-teal-500 rounded-full' />
                    <h2 className='text-lg font-semibold text-gray-900'>🧬 Embedding & Chunking</h2>
                    <span className='text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1'>
                        <Lock size={10} />
                        Read-only
                    </span>
                </div>

                <div className='bg-white rounded-2xl border shadow-sm overflow-hidden'>
                    {/* Info banner */}
                    <div className='px-5 py-3 bg-teal-50 border-b border-teal-100 flex items-start gap-2'>
                        <Info size={14} className='text-teal-600 mt-0.5 flex-shrink-0' />
                        <p className='text-xs text-teal-700'>
                            Các tham số này được cấu hình qua <code className='bg-teal-100 px-1 rounded'>.env</code> trên server RAG.
                            Thay đổi embedding model yêu cầu re-ingest toàn bộ papers.
                        </p>
                    </div>

                    <div className='divide-y divide-gray-100'>
                        {/* Embedding Model */}
                        <div className='px-5 py-4 flex items-center gap-4'>
                            <div className='p-2 bg-teal-50 rounded-lg text-teal-600'>
                                <Database size={18} />
                            </div>
                            <div className='flex-1'>
                                <div className='font-medium text-gray-900 text-sm'>Embedding Model</div>
                                <div className='text-xs text-gray-500'>Model vector hóa text → ChromaDB</div>
                            </div>
                            <code className='px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 font-mono'>text-embedding-3-small</code>
                        </div>

                        {/* Vector Store */}
                        <div className='px-5 py-4 flex items-center gap-4'>
                            <div className='p-2 bg-teal-50 rounded-lg text-teal-600'>
                                <Database size={18} />
                            </div>
                            <div className='flex-1'>
                                <div className='font-medium text-gray-900 text-sm'>Vector Store</div>
                                <div className='text-xs text-gray-500'>Nơi lưu trữ embeddings</div>
                            </div>
                            <code className='px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 font-mono'>ChromaDB (persistent)</code>
                        </div>

                        {/* Chunking Strategy */}
                        <div className='px-5 py-4'>
                            <div className='flex items-center gap-4 mb-3'>
                                <div className='p-2 bg-teal-50 rounded-lg text-teal-600'>
                                    <Cpu size={18} />
                                </div>
                                <div>
                                    <div className='font-medium text-gray-900 text-sm'>Semantic Chunking</div>
                                    <div className='text-xs text-gray-500'>GROBID → sections → paragraphs → semantic split by sentence similarity</div>
                                </div>
                            </div>
                            <div className='ml-12 grid grid-cols-3 gap-3'>
                                <div className='bg-gray-50 rounded-lg px-3 py-2'>
                                    <div className='text-xs text-gray-500'>Max Tokens</div>
                                    <div className='font-semibold text-gray-800'>400</div>
                                </div>
                                <div className='bg-gray-50 rounded-lg px-3 py-2'>
                                    <div className='text-xs text-gray-500'>Para Max</div>
                                    <div className='font-semibold text-gray-800'>280</div>
                                </div>
                                <div className='bg-gray-50 rounded-lg px-3 py-2'>
                                    <div className='text-xs text-gray-500'>Para Min</div>
                                    <div className='font-semibold text-gray-800'>40</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
