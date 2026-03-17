import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    FileText,
    MessageSquare,
    Users,
    BookOpen,
    UserCheck2,
    UserX2,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import PaginationBar from '../../components/common/PaginationBar';
import {
    useAdminUserDetail,
    useAdminUserPapers,
    useActivateUser,
    useDeactivateUser,
    useResetUserPassword,
    useDeleteAdminUser,
} from '../../hooks/useAdmin';

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

function formatBytes(bytes?: number | null) {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminUserDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [paperPage, setPaperPage] = useState(1);
    const [tempPassword, setTempPassword] = useState<string | null>(null);

    const { data: userRes, isLoading } = useAdminUserDetail(id as string);
    const { data: papersRes, isLoading: papersLoading } = useAdminUserPapers(id as string, paperPage);

    const { mutate: activate } = useActivateUser();
    const { mutate: deactivate } = useDeactivateUser();
    const { mutate: resetPassword } = useResetUserPassword();
    const { mutate: deleteUser } = useDeleteAdminUser();

    const user = userRes?.data;
    const papers = papersRes?.papers ?? [];
    const pagination = papersRes?.pagination;

    if (isLoading) {
        return <div className='flex items-center justify-center min-h-[50vh] text-gray-500'>Đang tải thông tin user...</div>;
    }

    if (!user) {
        return (
            <div className='flex flex-col items-center justify-center min-h-[50vh]'>
                <p className='text-gray-500 mb-4'>Không tìm thấy user.</p>
                <Link to='/admin/users' className='text-brand-600 hover:text-brand-700 font-medium flex items-center gap-2'>
                    <ArrowLeft size={16} /> Quay lại
                </Link>
            </div>
        );
    }

    const initials = (user.displayName || user.email).charAt(0).toUpperCase();

    const handleResetPassword = () => {
        if (!confirm(`Reset mật khẩu của ${user.email}?`)) return;
        resetPassword(user.id, {
            onSuccess: (res: { data?: { temporaryPassword?: string } }) => {
                setTempPassword(res.data?.temporaryPassword ?? 'Reset@123456');
            },
        });
    };

    const handleDelete = () => {
        if (!confirm(`Xoá hoàn toàn user ${user.email}? Không thể hoàn tác!`)) return;
        deleteUser(user.id, {
            onSuccess: () => navigate('/admin/users'),
        });
    };

    const statSections = [
        { label: 'PDFs đã upload', value: user._count?.papers ?? 0, icon: FileText },
        { label: 'Cuộc chat', value: user._count?.conversations ?? 0, icon: MessageSquare },
        { label: 'Hợp tác (nhóm)', value: user._count?.sessionMembers ?? 0, icon: Users },
        { label: 'Notebooks', value: user._count?.notebooks ?? 0, icon: BookOpen },
        { label: 'Shared Sessions', value: user.sharedSessions ?? 0, icon: Users },
    ];

    return (
        <div className='max-w-7xl mx-auto p-8'>
            <Link to='/admin/users' className='inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6'>
                <ArrowLeft size={16} /> Quay lại danh sách users
            </Link>

            <div className='mb-8'>
                <h1 className='text-3xl font-bold text-gray-900'>Chi tiết User</h1>
                <p className='text-gray-500 mt-1 font-mono text-sm'>{user.email}</p>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8'>
                {/* Left: User profile card */}
                <div className='lg:col-span-1 bg-white rounded-2xl border shadow-sm p-6 flex flex-col items-center text-center'>
                    {user.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt=''
                            className='w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mb-4'
                        />
                    ) : (
                        <div className='w-24 h-24 rounded-full bg-indigo-100 text-indigo-700 font-bold text-3xl flex items-center justify-center border-4 border-white shadow-md mb-4'>
                            {initials}
                        </div>
                    )}

                    <h2 className='text-xl font-bold text-gray-900 mb-1'>
                        {user.displayName || 'Chưa đặt tên'}
                    </h2>
                    <p className='text-sm text-gray-500 mb-6'>{user.email}</p>

                    <div className='flex flex-wrap justify-center gap-2 mb-8'>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.provider === 'GOOGLE' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}>
                            {user.provider}
                        </span>
                        {user.role === 'SUPERADMIN' && (
                            <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200'>Admin</span>
                        )}
                    </div>

                    <div className='w-full space-y-3 pt-6 border-t'>
                        <div className='flex justify-between items-center text-sm'>
                            <span className='text-gray-500'>Ngày đăng ký</span>
                            <span className='font-medium text-gray-900'>
                                {formatDate(user.createdAt)}
                            </span>
                        </div>
                        <div className='flex justify-between items-center text-sm'>
                            <span className='text-gray-500'>Đăng nhập cuối</span>
                            <span className='font-medium text-gray-900'>
                                {formatDate(user.lastLoginAt)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                {user.role !== 'SUPERADMIN' && (
                    <div className='w-full pt-6 mt-6 border-t flex flex-col gap-3'>
                        {user.isActive ? (
                            <button
                                className='w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg font-medium transition-colors border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500'
                                onClick={() => deactivate(user.id)}
                            >
                                <UserX2 size={16} /> Vô hiệu hoá User
                            </button>
                        ) : (
                            <button
                                className='w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium transition-colors border border-green-200 focus:outline-none focus:ring-2 focus:ring-green-500'
                                onClick={() => activate(user.id)}
                            >
                                <UserCheck2 size={16} /> Kích hoạt User
                            </button>
                        )}
                        {user.provider === 'LOCAL' && (
                            <button
                                className='w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg font-medium transition-colors border border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-500'
                                onClick={handleResetPassword}
                            >
                                <RefreshCw size={16} /> Reset Password
                            </button>
                        )}
                        <button
                            className='w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500'
                            onClick={handleDelete}
                        >
                            <Trash2 size={16} /> Xoá User
                        </button>
                    </div>
                )}

                {/* Right: Stats List */}
                <div className='lg:col-span-2'>
                    <div className='bg-white rounded-2xl border shadow-sm p-6 lg:p-8 h-full'>
                        <h3 className='text-xl font-bold text-gray-900 mb-6'>
                            Thống kê hoạt động
                        </h3>
                        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'>
                            {statSections.map((s) => {
                                const Icon = s.icon;
                                return (
                                    <div key={s.label} className='bg-gray-50 p-5 rounded-2xl border flex flex-col'>
                                        <div className='flex items-center gap-3 mb-3'>
                                            <div className='p-2 bg-white rounded-lg border text-indigo-600 shadow-sm'>
                                                <Icon size={18} />
                                            </div>
                                            <div className='text-sm font-medium text-gray-500'>{s.label}</div>
                                        </div>
                                        <div className='text-3xl font-bold text-gray-900 mt-auto'>{s.value.toLocaleString()}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Papers table */}
            <div className='bg-white rounded-2xl border shadow-sm overflow-hidden mb-8'>
                <div className='px-6 py-5 border-b'>
                    <h3 className='text-lg font-semibold text-gray-900'>
                        PDFs đã upload ({user._count?.papers ?? 0})
                    </h3>
                </div>

                {papersLoading ? (
                    <div className='p-12 text-center text-gray-500'>Đang tải danh sách PDF...</div>
                ) : papers.length === 0 ? (
                    <div className='p-12 text-center text-gray-500'>User chưa upload PDF nào</div>
                ) : (
                    <div className='overflow-x-auto min-h-[300px]'>
                        <table className='w-full text-left border-collapse'>
                            <thead>
                                <tr className='bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500'>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Tên file</th>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap min-w-[200px]'>Tiêu đề</th>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Trạng thái</th>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Kích thước</th>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Số trang</th>
                                    <th className='px-6 py-4 font-medium whitespace-nowrap'>Ngày upload</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-100'>
                                {papers.map((p) => (
                                    <tr key={p.id} className='hover:bg-gray-50/50 transition-colors'>
                                        <td className='px-6 py-4'>
                                            <div className='max-w-[200px] font-medium text-sm text-gray-900 truncate' title={p.fileName}>
                                                {p.fileName}
                                            </div>
                                        </td>
                                        <td className='px-6 py-4'>
                                            <div className='max-w-[300px] text-sm text-gray-500 truncate' title={p.title || ''}>
                                                {p.title ?? '—'}
                                            </div>
                                        </td>
                                        <td className='px-6 py-4'>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${p.status === 'COMPLETED'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : p.status === 'FAILED'
                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className='px-6 py-4 text-sm text-gray-500 whitespace-nowrap font-mono'>{formatBytes(p.fileSize)}</td>
                                        <td className='px-6 py-4 text-sm text-gray-500 text-center'>{p.numPages ?? '—'}</td>
                                        <td className='px-6 py-4 text-sm text-gray-500 whitespace-nowrap'>
                                            <div title={`Upload: ${formatDate(p.createdAt)}\nProcessed: ${formatDate(p.processedAt)}`}>
                                                {formatDate(p.createdAt)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination && pagination.totalPages > 1 && (
                    <PaginationBar
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        total={pagination.total}
                        label='papers'
                        onPageChange={setPaperPage}
                    />
                )}
            </div>

            {/* Temp password modal */}
            {
                tempPassword && (
                    <div className='fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm' onClick={() => setTempPassword(null)}>
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
                                <code className='text-lg font-bold text-green-700 select-all'>{tempPassword}</code>
                            </div>

                            <button
                                className='w-full py-3 rounded-xl font-medium text-white bg-gray-900 hover:bg-gray-800 transition-all shadow-sm'
                                onClick={() => setTempPassword(null)}
                            >
                                Đã hiểu & Đóng
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
