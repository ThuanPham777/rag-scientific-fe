import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle, RefreshCw, Trash2, UserCheck2, UserX2, X } from 'lucide-react';
import PaginationBar from '../../components/common/PaginationBar';
import {
    useAdminUsers,
    useActivateUser,
    useDeactivateUser,
    useDeleteAdminUser,
    useResetUserPassword,
    useCreateAdminUser,
} from '../../hooks/useAdmin';
import type { AdminUser } from '../../services/api/admin.api';

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    });
}

function CreateUserModal({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: () => void;
}) {
    const [form, setForm] = useState({ email: '', password: '', displayName: '' });
    const [error, setError] = useState('');
    const { mutate: create, isPending } = useCreateAdminUser();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.email || !form.password) {
            setError('Email và password là bắt buộc');
            return;
        }
        create(form, {
            onSuccess: () => {
                onCreated();
                onClose();
            },
            onError: (err: Error) => {
                setError((err as any)?.response?.data?.message ?? 'Tạo user thất bại');
            },
        });
    };

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm' onClick={onClose}>
            <div className='bg-white rounded-2xl shadow-xl w-full max-w-md p-6' onClick={(e) => e.stopPropagation()}>
                <div className='flex items-center justify-between mb-6'>
                    <h3 className='text-xl font-bold text-gray-900'>Tạo User Mới</h3>
                    <button onClick={onClose} className='p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100'>
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Email *</label>
                        <input
                            type='email'
                            placeholder='user@example.com'
                            className='w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all'
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Display Name</label>
                        <input
                            type='text'
                            placeholder='Nguyễn Văn A'
                            className='w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all'
                            value={form.displayName}
                            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className='block text-sm font-medium text-gray-700 mb-1'>Password *</label>
                        <input
                            type='password'
                            placeholder='Tối thiểu 8 ký tự'
                            className='w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all'
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </div>
                    {error && (
                        <div className='p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm'>
                            {error}
                        </div>
                    )}
                    <div className='flex gap-3 pt-4'>
                        <button
                            type='button'
                            className='flex-1 px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors'
                            onClick={onClose}
                        >
                            Huỷ
                        </button>
                        <button
                            type='submit'
                            className='flex-1 px-4 py-2 rounded-lg font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                            disabled={isPending}
                        >
                            {isPending ? 'Đang tạo...' : 'Tạo User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ResetPasswordResult({
    password,
    onClose,
}: {
    password: string;
    onClose: () => void;
}) {
    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm' onClick={onClose}>
            <div className='bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-100' onClick={(e) => e.stopPropagation()}>
                <div className='flex flex-col items-center mb-6 text-center'>
                    <div className='w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4'>
                        <UserCheck2 size={24} />
                    </div>
                    <h3 className='text-xl font-bold text-gray-900'>Mật khẩu đã được reset</h3>
                    <p className='text-gray-500 text-sm mt-2'>
                        Chia sẻ mật khẩu tạm này cho user. Họ nên đổi lại mật khẩu sau khi đăng nhập.
                    </p>
                </div>

                <div className='p-4 bg-green-50 border border-green-200 rounded-lg text-center mb-6'>
                    <span className='text-sm text-green-800 font-medium block mb-1'>Mật khẩu tạm thời:</span>
                    <code className='text-lg font-bold text-green-700 select-all'>{password}</code>
                </div>

                <button
                    className='w-full py-3 rounded-xl font-medium text-white bg-gray-900 hover:bg-gray-800 transition-all shadow-sm'
                    onClick={onClose}
                >
                    Đã hiểu & Đóng
                </button>
            </div>
        </div>
    );
}

export default function AdminUsersPage() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    const { data, isLoading, refetch } = useAdminUsers({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
    });

    const { mutate: activate } = useActivateUser();
    const { mutate: deactivate } = useDeactivateUser();
    const { mutate: deleteUser } = useDeleteAdminUser();
    const { mutate: resetPassword } = useResetUserPassword();

    const handleSearch = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearch(e.target.value);
            setPage(1);
            // Simple debounce via timeout
            const v = e.target.value;
            setTimeout(() => setDebouncedSearch(v), 400);
        },
        [],
    );

    const handleDelete = (u: AdminUser) => {
        if (!confirm(`Xoá user ${u.email}? Hành động này không thể hoàn tác!`)) return;
        deleteUser(u.id);
    };

    const handleReset = (u: AdminUser) => {
        if (!confirm(`Reset mật khẩu của ${u.email}?`)) return;
        resetPassword(u.id, {
            onSuccess: (res: { data?: { temporaryPassword?: string } }) => {
                setTempPassword(res.data?.temporaryPassword ?? 'Reset@123456');
            },
        });
    };

    const users = data?.users ?? [];
    const pagination = data?.pagination;

    return (
        <div className='max-w-[1400px] mx-auto p-8'>
            <div className='mb-8'>
                <h1 className='text-3xl font-bold text-gray-900'>Quản lý Users</h1>
                <p className='text-gray-500 mt-1'>
                    Quản lý tài khoản người dùng trong hệ thống
                </p>
            </div>

            {/* Toolbar */}
            <div className='flex items-center gap-4 mb-8 bg-white p-4 rounded-xl border shadow-sm'>
                <div className='relative flex-1 max-w-md'>
                    <Search size={18} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
                    <input
                        className='w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all'
                        placeholder='Tìm theo email hoặc tên...'
                        value={search}
                        onChange={handleSearch}
                    />
                </div>
                <button
                    className='ml-auto bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center justify-center gap-2'
                    onClick={() => setShowCreate(true)}
                >
                    <PlusCircle size={18} /> Tạo User
                </button>
            </div>

            <div className='bg-white rounded-2xl border shadow-sm overflow-hidden mb-8'>
                <div className='px-6 py-5 border-b'>
                    <h3 className='text-lg font-semibold text-gray-900'>
                        {pagination ? `Danh sách users (${pagination.total})` : 'Danh sách users'}
                    </h3>
                </div>

                {isLoading ? (
                    <div className='p-12 text-center text-gray-500'>Đang tải danh sách users...</div>
                ) : users.length === 0 ? (
                    <div className='p-12 text-center text-gray-500'>Không tìm thấy user nào</div>
                ) : (
                    <div className='overflow-x-auto min-h-[400px]'>
                        <table className='w-full text-left border-collapse'>
                            <thead>
                                <tr className='bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500'>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Người dùng</th>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Provider</th>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Role</th>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Trạng thái</th>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Thống kê</th>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Hoạt động</th>
                                    <th className='px-6 py-4 font-medium right-0 bg-gray-50 sticky shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)]'>Hành động</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-100'>
                                {users.map((u) => (
                                    <tr key={u.id} className='hover:bg-gray-50/50 transition-colors group'>
                                        <td className='px-6 py-4'>
                                            <div
                                                className='flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity'
                                                onClick={() => navigate(`/admin/users/${u.id}`)}
                                            >
                                                {u.avatarUrl ? (
                                                    <img src={u.avatarUrl} alt='' className='w-10 h-10 rounded-full object-cover border' />
                                                ) : (
                                                    <div className='w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-medium flex items-center justify-center border border-indigo-200'>
                                                        {(u.displayName || u.email).charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className='text-sm font-medium text-gray-900 truncate max-w-[180px]' title={u.displayName || u.email}>
                                                        {u.displayName || '—'}
                                                    </div>
                                                    <div className='text-xs text-gray-500 truncate max-w-[180px]' title={u.email}>
                                                        {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className='px-6 py-4'>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.provider === 'GOOGLE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                                                }`}>
                                                {u.provider}
                                            </span>
                                        </td>
                                        <td className='px-6 py-4'>
                                            {u.role === 'SUPERADMIN' ? (
                                                <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200'>Admin</span>
                                            ) : (
                                                <span className='text-sm text-gray-500'>User</span>
                                            )}
                                        </td>
                                        <td className='px-6 py-4'>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                }`}>
                                                {u.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className='px-6 py-4'>
                                            <div className='text-xs text-gray-600 space-y-1'>
                                                <div className='flex justify-between w-16'>
                                                    <span className='text-gray-400'>PDFs:</span>
                                                    <span className='font-medium'>{u._count?.papers ?? 0}</span>
                                                </div>
                                                <div className='flex justify-between w-16'>
                                                    <span className='text-gray-400'>Chats:</span>
                                                    <span className='font-medium'>{u._count?.conversations ?? 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className='px-6 py-4 text-xs text-gray-500 whitespace-nowrap space-y-1'>
                                            <div>Tạo: {formatDate(u.createdAt)}</div>
                                            <div>Login: {formatDate(u.lastLoginAt)}</div>
                                        </td>
                                        <td className='px-6 py-4 right-0 group-hover:bg-gray-50/50 bg-white sticky shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] transition-colors'>
                                            <div className='flex items-center gap-2'>
                                                {u.role !== 'SUPERADMIN' ? (
                                                    <>
                                                        {u.isActive ? (
                                                            <button
                                                                className='p-2 rounded-lg text-orange-600 hover:bg-orange-50 bg-white border border-gray-200 shadow-sm transition-all focus:ring-2 focus:ring-orange-500 focus:outline-none'
                                                                title='Deactivate'
                                                                onClick={() => deactivate(u.id)}
                                                            >
                                                                <UserX2 size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className='p-2 rounded-lg text-green-600 hover:bg-green-50 bg-white border border-gray-200 shadow-sm transition-all focus:ring-2 focus:ring-green-500 focus:outline-none'
                                                                title='Activate'
                                                                onClick={() => activate(u.id)}
                                                            >
                                                                <UserCheck2 size={16} />
                                                            </button>
                                                        )}
                                                        {u.provider === 'LOCAL' && (
                                                            <button
                                                                className='p-2 rounded-lg text-brand-600 hover:bg-brand-50 bg-white border border-gray-200 shadow-sm transition-all focus:ring-2 focus:ring-brand-500 focus:outline-none'
                                                                title='Reset Password'
                                                                onClick={() => handleReset(u)}
                                                            >
                                                                <RefreshCw size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            className='p-2 rounded-lg text-red-600 hover:bg-red-50 bg-white border border-gray-200 shadow-sm transition-all focus:ring-2 focus:ring-red-500 focus:outline-none'
                                                            title='Delete'
                                                            onClick={() => handleDelete(u)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className='text-xs text-gray-400 italic px-2 py-1'>Protected</div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <PaginationBar
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        total={pagination.total}
                        label='users'
                        onPageChange={setPage}
                    />
                )}
            </div>

            {/* Modals */}
            {showCreate && (
                <CreateUserModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => refetch()}
                />
            )}
            {tempPassword && (
                <ResetPasswordResult
                    password={tempPassword}
                    onClose={() => setTempPassword(null)}
                />
            )}
        </div>
    );
}
