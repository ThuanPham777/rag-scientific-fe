import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Plus, Trash2, Edit3, FolderTree, FileText, Tag, ChevronRight, ChevronDown, X,
} from 'lucide-react';
import {
    useKbCategories, useCreateKbCategory, useUpdateKbCategory, useDeleteKbCategory,
    useKbPapers, useRemovePaperFromKb,
} from '../../hooks/useAdminConfig';

function CategoryNode({ cat, depth = 0, onEdit, onDelete }: any) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = cat.children && cat.children.length > 0;

    return (
        <div>
            <div
                className='flex items-center gap-2 py-2 px-3 hover:bg-gray-50 rounded-lg group transition-colors'
                style={{ paddingLeft: `${depth * 20 + 12}px` }}
            >
                {hasChildren ? (
                    <button onClick={() => setExpanded(!expanded)} className='text-gray-400 hover:text-gray-600'>
                        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                ) : (
                    <span className='w-4' />
                )}
                <FolderTree size={16} className='text-indigo-500' />
                <span className='font-medium text-gray-900 text-sm flex-1'>{cat.name}</span>
                <span className='text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full'>
                    {cat.paperCount || cat._count?.papers || 0} papers
                </span>
                <div className='opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity'>
                    <button onClick={() => onEdit(cat)} className='p-1 hover:bg-gray-200 rounded'>
                        <Edit3 size={14} className='text-gray-500' />
                    </button>
                    <button onClick={() => onDelete(cat.id)} className='p-1 hover:bg-red-100 rounded'>
                        <Trash2 size={14} className='text-red-500' />
                    </button>
                </div>
            </div>
            {expanded && hasChildren && (
                <div>
                    {cat.children.map((child: any) => (
                        <CategoryNode key={child.id} cat={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function KBManagementPage() {
    const { data: catRes, isLoading: catLoading } = useKbCategories();
    const { data: papersRes, isLoading: papersLoading } = useKbPapers({ page: 1, limit: 50 });
    const createCategory = useCreateKbCategory();
    const updateCategory = useUpdateKbCategory();
    const deleteCategory = useDeleteKbCategory();
    const removePaper = useRemovePaperFromKb();

    const [showCreate, setShowCreate] = useState(false);
    const [editCat, setEditCat] = useState<any>(null);
    const [form, setForm] = useState({ name: '', slug: '', description: '', parentId: '' });
    const navigate = useNavigate();

    const categories = catRes?.data?.data || [];
    const papers = papersRes?.data?.papers || [];

    const handleCreate = async () => {
        try {
            await createCategory.mutateAsync({
                name: form.name,
                slug: form.slug || form.name.toLowerCase().replace(/\s+/g, '_'),
                description: form.description || undefined,
                parentId: form.parentId || undefined,
            });
            setShowCreate(false);
            setForm({ name: '', slug: '', description: '', parentId: '' });
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdate = async () => {
        if (!editCat) return;
        try {
            await updateCategory.mutateAsync({
                id: editCat.id,
                data: { name: form.name, slug: form.slug, description: form.description },
            });
            setEditCat(null);
            setForm({ name: '', slug: '', description: '', parentId: '' });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Xóa category này? Papers sẽ được chuyển về parent.')) return;
        try {
            await deleteCategory.mutateAsync(id);
        } catch (e) {
            console.error(e);
        }
    };

    const handleEditClick = (cat: any) => {
        setEditCat(cat);
        setForm({ name: cat.name, slug: cat.slug, description: cat.description || '', parentId: '' });
    };

    // Flatten categories for parent dropdown
    const flatCategories: any[] = [];
    const flatten = (cats: any[], depth = 0) => {
        for (const c of cats) {
            flatCategories.push({ ...c, depth });
            if (c.children) flatten(c.children, depth + 1);
        }
    };
    flatten(categories);

    return (
        <div className='max-w-7xl mx-auto p-8'>
            {/* Header */}
            <div className='mb-8 flex items-center justify-between'>
                <div>
                    <h1 className='text-3xl font-bold text-gray-900 flex items-center gap-3'>
                        <BookOpen className='text-indigo-600' size={32} />
                        Knowledge Base
                    </h1>
                    <p className='text-gray-500 mt-1'>Quản lý categories và papers trong System KB</p>
                </div>
                <div className='flex items-center gap-3'>
                    <button
                        onClick={() => navigate('/admin/kb/ingest')}
                        className='px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2'
                    >
                        <Plus size={16} />
                        Ingest Paper
                    </button>
                    <button
                        onClick={() => navigate('/admin/kb/batch-ingest')}
                        className='px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2'
                    >
                        <Plus size={16} />
                        📦 Batch Ingest
                    </button>
                    <button
                        onClick={() => { setShowCreate(true); setEditCat(null); setForm({ name: '', slug: '', description: '', parentId: '' }); }}
                        className='px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2'
                    >
                        <Plus size={16} />
                        Thêm Category
                    </button>
                </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                {/* Category Tree */}
                <div className='lg:col-span-1'>
                    <div className='bg-white rounded-2xl border shadow-sm'>
                        <div className='px-6 py-4 border-b flex items-center gap-2'>
                            <FolderTree size={18} className='text-indigo-600' />
                            <h3 className='font-semibold text-gray-900'>Categories</h3>
                        </div>
                        <div className='p-3'>
                            {catLoading ? (
                                <div className='p-8 text-center text-gray-500'>Đang tải...</div>
                            ) : categories.length === 0 ? (
                                <div className='p-8 text-center text-gray-500'>
                                    <FolderTree className='mx-auto mb-2 text-gray-300' size={32} />
                                    Chưa có categories
                                </div>
                            ) : (
                                categories.map((cat: any) => (
                                    <CategoryNode key={cat.id} cat={cat} onEdit={handleEditClick} onDelete={handleDelete} />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* KB Papers */}
                <div className='lg:col-span-2'>
                    <div className='bg-white rounded-2xl border shadow-sm'>
                        <div className='px-6 py-4 border-b flex items-center gap-2'>
                            <FileText size={18} className='text-indigo-600' />
                            <h3 className='font-semibold text-gray-900'>Papers trong KB</h3>
                            <span className='ml-auto text-sm text-gray-400'>{papers.length} papers</span>
                        </div>
                        {papersLoading ? (
                            <div className='p-12 text-center text-gray-500'>Đang tải...</div>
                        ) : papers.length === 0 ? (
                            <div className='p-12 text-center text-gray-500'>
                                <FileText className='mx-auto mb-2 text-gray-300' size={32} />
                                Chưa có papers trong System KB
                            </div>
                        ) : (
                            <div className='overflow-x-auto'>
                                <table className='w-full text-left'>
                                    <thead>
                                        <tr className='bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500'>
                                            <th className='px-6 py-3 font-medium'>Title</th>
                                            <th className='px-6 py-3 font-medium'>Categories</th>
                                            <th className='px-6 py-3 font-medium'>Tags</th>
                                            <th className='px-6 py-3 font-medium w-16'></th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-gray-100'>
                                        {papers.map((paper: any) => (
                                            <tr key={paper.id} className='hover:bg-gray-50/50 transition-colors'>
                                                <td className='px-6 py-3'>
                                                    <div className='text-sm font-medium text-gray-900'>{paper.title || paper.fileName}</div>
                                                    <div className='text-xs text-gray-400'>{paper.fileName}</div>
                                                </td>
                                                <td className='px-6 py-3'>
                                                    <div className='flex flex-wrap gap-1'>
                                                        {paper.kbPaperCategories?.map((pc: any) => (
                                                            <span key={pc.category.id} className='text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full'>
                                                                {pc.category.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className='px-6 py-3'>
                                                    <div className='flex flex-wrap gap-1'>
                                                        {(paper.kbTags || []).slice(0, 3).map((tag: string) => (
                                                            <span key={tag} className='text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full'>
                                                                <Tag size={10} className='inline mr-0.5' />{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className='px-6 py-3'>
                                                    <button
                                                        onClick={() => removePaper.mutate(paper.id)}
                                                        className='p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors'
                                                        title='Remove from KB'
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {(showCreate || editCat) && (
                <div className='fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4'>
                    <div className='bg-white rounded-2xl shadow-xl w-full max-w-md'>
                        <div className='px-6 py-4 border-b flex items-center justify-between'>
                            <h3 className='font-semibold text-gray-900'>
                                {editCat ? 'Sửa Category' : 'Tạo Category'}
                            </h3>
                            <button onClick={() => { setShowCreate(false); setEditCat(null); }} className='p-1 hover:bg-gray-100 rounded'>
                                <X size={18} />
                            </button>
                        </div>
                        <div className='p-6 space-y-4'>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>Tên</label>
                                <input
                                    className='w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder='Machine Learning'
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>Slug</label>
                                <input
                                    className='w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
                                    value={form.slug}
                                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                                    placeholder='machine_learning'
                                />
                            </div>
                            <div>
                                <label className='block text-sm font-medium text-gray-700 mb-1'>Mô tả</label>
                                <textarea
                                    className='w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                />
                            </div>
                            {!editCat && (
                                <div>
                                    <label className='block text-sm font-medium text-gray-700 mb-1'>Parent Category</label>
                                    <select
                                        className='w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
                                        value={form.parentId}
                                        onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                                    >
                                        <option value=''>-- Root level --</option>
                                        {flatCategories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {'—'.repeat(c.depth)} {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className='px-6 py-4 border-t flex justify-end gap-3'>
                            <button
                                onClick={() => { setShowCreate(false); setEditCat(null); }}
                                className='px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
                            >
                                Hủy
                            </button>
                            <button
                                onClick={editCat ? handleUpdate : handleCreate}
                                className='px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors'
                                disabled={!form.name}
                            >
                                {editCat ? 'Cập nhật' : 'Tạo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
