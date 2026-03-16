import { useState } from 'react';
import { FileText, Users, MessageSquare, UserCheck, TrendingUp, Zap, Coins } from 'lucide-react';
import { useAdminStats, useAdminUsageStats } from '../../hooks/useAdmin';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    PieChart, Pie, Cell, Legend,
} from 'recharts';

const RANGES = [
    { label: 'Hôm nay', days: 1 },
    { label: '7 ngày', days: 7 },
];

const MODEL_COLORS = [
    '#6366f1', // indigo
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
];

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

export default function AdminDashboardPage() {
    const [days, setDays] = useState(7);
    const { data: statsRes, isLoading: statsLoading } = useAdminStats(days);
    const { data: usageRes, isLoading: usageLoading } = useAdminUsageStats(days);

    const stats = statsRes?.data;
    const usage = usageRes?.data;

    const statCards = stats
        ? [
            {
                label: 'Tổng Users',
                value: stats.totalUsers,
                sub: `${stats.activeUsers} đang hoạt động`,
                icon: Users,
                color: 'bg-blue-50 text-blue-600',
            },
            {
                label: 'Users Active',
                value: stats.activeUsers,
                sub: `${stats.inactiveUsers} bị vô hiệu`,
                icon: UserCheck,
                color: 'bg-green-50 text-green-600',
            },
            {
                label: 'Tổng PDFs',
                value: stats.totalPapers,
                sub: 'đã upload vào hệ thống',
                icon: FileText,
                color: 'bg-orange-50 text-orange-600',
            },
            {
                label: `Sessions (${days}d)`,
                value: stats.conversationsInRange,
                sub: `Tổng: ${stats.totalConversations}`,
                icon: MessageSquare,
                color: 'bg-purple-50 text-purple-600',
            },
            {
                label: `Users mới (${days}d)`,
                value: stats.newUsersInRange,
                sub: 'đăng ký trong khoảng',
                icon: TrendingUp,
                color: 'bg-indigo-50 text-indigo-600',
            },
        ]
        : [];

    const usageCards = usage
        ? [
            {
                label: `LLM Calls (${days}d)`,
                value: usage.totalCalls,
                sub: `${usage.callsByModel.length} models`,
                icon: Zap,
                color: 'bg-amber-50 text-amber-600',
            },
            {
                label: `Tokens (${days}d)`,
                value: usage.totalInputTokens + usage.totalOutputTokens,
                sub: `In: ${formatNumber(usage.totalInputTokens)} | Out: ${formatNumber(usage.totalOutputTokens)}`,
                icon: Coins,
                color: 'bg-teal-50 text-teal-600',
            },
        ]
        : [];

    // Pie chart data: token usage by model
    const pieData = (usage?.callsByModel || []).map((m) => ({
        name: m.model,
        value: m.inputTokens + m.outputTokens,
        calls: m.calls,
    }));

    // Bar chart data: calls by day
    const barData = (usage?.callsByDay || []).map((d) => ({
        date: d.date.slice(5), // "03-16" format
        calls: d.calls,
        tokens: d.inputTokens + d.outputTokens,
    }));

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
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8'>
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className='bg-white p-5 rounded-2xl border shadow-sm flex flex-col'>
                                <div className='flex items-center justify-between mb-3'>
                                    <div className='text-sm font-medium text-gray-500'>{card.label}</div>
                                    <div className={`p-2 rounded-lg ${card.color}`}>
                                        <Icon size={18} />
                                    </div>
                                </div>
                                <div className='text-2xl font-bold text-gray-900 mb-1'>{card.value.toLocaleString()}</div>
                                <div className='text-xs text-gray-500 mt-auto'>{card.sub}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* LLM Usage Section */}
            {usageLoading ? (
                <div className='flex items-center justify-center p-12 text-gray-500'>Đang tải LLM usage...</div>
            ) : usage && (
                <>
                    {/* Usage stat cards */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-8'>
                        {usageCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div key={card.label} className='bg-white p-5 rounded-2xl border shadow-sm flex flex-col'>
                                    <div className='flex items-center justify-between mb-3'>
                                        <div className='text-sm font-medium text-gray-500'>{card.label}</div>
                                        <div className={`p-2 rounded-lg ${card.color}`}>
                                            <Icon size={18} />
                                        </div>
                                    </div>
                                    <div className='text-2xl font-bold text-gray-900 mb-1'>{formatNumber(card.value)}</div>
                                    <div className='text-xs text-gray-500 mt-auto'>{card.sub}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Charts row */}
                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
                        {/* Bar chart: calls by day */}
                        <div className='bg-white rounded-2xl border shadow-sm p-6'>
                            <h3 className='text-lg font-semibold text-gray-900 mb-4'>LLM Calls / Ngày</h3>
                            {barData.length === 0 ? (
                                <div className='flex items-center justify-center h-48 text-gray-400 text-sm'>Chưa có dữ liệu</div>
                            ) : (
                                <ResponsiveContainer width='100%' height={260}>
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#f0f0f0' />
                                        <XAxis dataKey='date' tick={{ fontSize: 12 }} stroke='#9ca3af' />
                                        <YAxis tick={{ fontSize: 12 }} stroke='#9ca3af' allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: '1px solid #e5e7eb',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                            }}
                                            formatter={(value: number, name: string) => [
                                                name === 'calls' ? value : formatNumber(value),
                                                name === 'calls' ? 'Calls' : 'Tokens',
                                            ]}
                                        />
                                        <Bar dataKey='calls' fill='#6366f1' radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Pie chart: tokens by model */}
                        <div className='bg-white rounded-2xl border shadow-sm p-6'>
                            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Token Usage / Model</h3>
                            {pieData.length === 0 ? (
                                <div className='flex items-center justify-center h-48 text-gray-400 text-sm'>Chưa có dữ liệu</div>
                            ) : (
                                <ResponsiveContainer width='100%' height={260}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx='50%'
                                            cy='50%'
                                            innerRadius={55}
                                            outerRadius={95}
                                            paddingAngle={3}
                                            dataKey='value'
                                            nameKey='name'
                                            label={({ name, percent }) =>
                                                `${name} (${(percent * 100).toFixed(0)}%)`
                                            }
                                            labelLine={false}
                                        >
                                            {pieData.map((_entry, index) => (
                                                <Cell key={index} fill={MODEL_COLORS[index % MODEL_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => formatNumber(value)}
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: '1px solid #e5e7eb',
                                            }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Model breakdown table */}
                    <div className='bg-white rounded-2xl border shadow-sm overflow-hidden'>
                        <div className='px-6 py-5 border-b'>
                            <h3 className='text-lg font-semibold text-gray-900'>Chi tiết theo Model</h3>
                        </div>
                        {usage.callsByModel.length === 0 ? (
                            <div className='p-12 text-center text-gray-500'>Chưa có dữ liệu LLM usage</div>
                        ) : (
                            <div className='overflow-x-auto'>
                                <table className='w-full text-left border-collapse'>
                                    <thead>
                                        <tr className='bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500'>
                                            <th className='px-6 py-4 font-medium'>Model</th>
                                            <th className='px-6 py-4 font-medium'>Provider</th>
                                            <th className='px-6 py-4 font-medium text-right'>Calls</th>
                                            <th className='px-6 py-4 font-medium text-right'>Input Tokens</th>
                                            <th className='px-6 py-4 font-medium text-right'>Output Tokens</th>
                                            <th className='px-6 py-4 font-medium text-right'>Total Tokens</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y divide-gray-100'>
                                        {usage.callsByModel.map((m) => (
                                            <tr key={`${m.model}-${m.provider}`} className='hover:bg-gray-50/50 transition-colors'>
                                                <td className='px-6 py-4'>
                                                    <span className='text-sm font-medium text-gray-900'>{m.model}</span>
                                                </td>
                                                <td className='px-6 py-4'>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m.provider === 'openai'
                                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                                        : m.provider === 'groq'
                                                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                        }`}>
                                                        {m.provider}
                                                    </span>
                                                </td>
                                                <td className='px-6 py-4 text-sm text-gray-600 font-medium text-right'>{m.calls.toLocaleString()}</td>
                                                <td className='px-6 py-4 text-sm text-gray-600 text-right'>{formatNumber(m.inputTokens)}</td>
                                                <td className='px-6 py-4 text-sm text-gray-600 text-right'>{formatNumber(m.outputTokens)}</td>
                                                <td className='px-6 py-4 text-sm text-gray-900 font-medium text-right'>{formatNumber(m.inputTokens + m.outputTokens)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
