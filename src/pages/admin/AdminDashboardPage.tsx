import { useState } from 'react';
import { FileText, Users, MessageSquare, UserCheck, TrendingUp } from 'lucide-react';
import { useAdminStats, useAdminRecentUsers } from '../../hooks/useAdmin';

const RANGES = [
    { label: '7 ngày', days: 7 },
    { label: '30 ngày', days: 30 },
    { label: '90 ngày', days: 90 },
];

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export default function AdminDashboardPage() {
    const [days, setDays] = useState(7);
    const { data: statsRes, isLoading: statsLoading } = useAdminStats(days);
    const { data: recentRes, isLoading: recentLoading } = useAdminRecentUsers(8);

    const stats = statsRes?.data;
    const recentUsers = recentRes?.data ?? [];

    const statCards = stats
        ? [
            {
                label: 'Tổng Users',
                value: stats.totalUsers,
                sub: `${stats.activeUsers} đang hoạt động`,
                icon: Users,
            },
            {
                label: 'Users Active',
                value: stats.activeUsers,
                sub: `${stats.inactiveUsers} bị vô hiệu`,
                icon: UserCheck,
            },
            {
                label: 'Tổng PDFs',
                value: stats.totalPapers,
                sub: 'đã upload vào hệ thống',
                icon: FileText,
            },
            {
                label: `Sessions (${days}d)`,
                value: stats.conversationsInRange,
                sub: `Tổng: ${stats.totalConversations}`,
                icon: MessageSquare,
            },
            {
                label: `Users mới (${days}d)`,
                value: stats.newUsersInRange,
                sub: 'đăng ký trong khoảng',
                icon: TrendingUp,
            },
        ]
        : [];

    return (
        <div className='max-w-7xl mx-auto p-8'>
            <div className='mb-8'>
                <h1 className='text-3xl font-bold text-gray-900'>Dashboard</h1>
                <p className='text-gray-500 mt-1'>
                    Tổng quan hệ thống RAG Scientific
                </p>
            </div>

            {/* Range selector */}
            <div className='flex items-center gap-2 mb-8 bg-gray-100 p-1 rounded-xl w-fit'>
                {RANGES.map((r) => (
                    <button
                        key={r.days}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${days === r.days
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        onClick={() => setDays(r.days)}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            {/* Stat cards */}
            {statsLoading ? (
                <div className='flex items-center justify-center p-12 text-gray-500'>Đang tải thống kê...</div>
            ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12'>
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className='bg-white p-6 rounded-2xl border shadow-sm flex flex-col'>
                                <div className='flex items-center justify-between mb-4'>
                                    <div className='text-sm font-medium text-gray-500'>{card.label}</div>
                                    <div className='p-2 bg-indigo-50 rounded-lg text-indigo-600'>
                                        <Icon size={20} />
                                    </div>
                                </div>
                                <div className='text-3xl font-bold text-gray-900 mb-1'>{card.value.toLocaleString()}</div>
                                <div className='text-sm text-gray-500 mt-auto'>{card.sub}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Recent users table */}
            <div className='bg-white rounded-2xl border shadow-sm overflow-hidden'>
                <div className='px-6 py-5 border-b'>
                    <h3 className='text-lg font-semibold text-gray-900'>Người dùng mới nhất</h3>
                </div>
                {recentLoading ? (
                    <div className='p-12 text-center text-gray-500'>Đang tải...</div>
                ) : recentUsers.length === 0 ? (
                    <div className='p-12 text-center text-gray-500'>Chưa có user nào</div>
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-left border-collapse'>
                            <thead>
                                <tr className='bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500'>
                                    <th className='px-6 py-4 font-medium'>Người dùng</th>
                                    <th className='px-6 py-4 font-medium'>Provider</th>
                                    <th className='px-6 py-4 font-medium'>Trạng thái</th>
                                    <th className='px-6 py-4 font-medium'>PDFs</th>
                                    <th className='px-6 py-4 font-medium'>Chats</th>
                                    <th className='px-6 py-4 font-medium'>Ngày đăng ký</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-gray-100'>
                                {recentUsers.map((u) => (
                                    <tr key={u.id} className='hover:bg-gray-50/50 transition-colors'>
                                        <td className='px-6 py-4'>
                                            <div className='flex items-center gap-3'>
                                                {u.avatarUrl ? (
                                                    <img src={u.avatarUrl} alt='' className='w-10 h-10 rounded-full object-cover border' />
                                                ) : (
                                                    <div className='w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-medium flex items-center justify-center border border-indigo-200'>
                                                        {(u.displayName || u.email).charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className='text-sm font-medium text-gray-900'>
                                                        {u.displayName || '—'}
                                                    </div>
                                                    <div className='text-xs text-gray-500'>
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
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                                                }`}>
                                                {u.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className='px-6 py-4 text-sm text-gray-600 font-medium'>{u._count?.papers ?? 0}</td>
                                        <td className='px-6 py-4 text-sm text-gray-600 font-medium'>{u._count?.conversations ?? 0}</td>
                                        <td className='px-6 py-4 text-sm text-gray-500'>{formatDate(u.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
