import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Lock,
    BarChart3,
    FileText,
    MessageSquare,
    Users2,
    Calendar,
    CheckCircle,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useGetMe, useUpdateProfile, useChangePassword } from '../hooks/queries/useUserQueries';
import { UserAvatar } from '../components/common/UserAvatar';

// ─────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────
function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string | number;
    sub?: string;
    color: string;
}) {
    return (
        <div className='bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow'>
            <div className={`rounded-xl p-3 ${color}`}>
                <Icon size={22} className='text-white' />
            </div>
            <div>
                <p className='text-xs text-gray-500 font-medium uppercase tracking-wide'>{label}</p>
                <p className='text-2xl font-bold text-gray-900 mt-0.5'>{value}</p>
                {sub && <p className='text-xs text-gray-400 mt-0.5'>{sub}</p>}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────
// Toast helper (local, minimal)
// ─────────────────────────────────────────────────
function useToast() {
    const [toast, setToast] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const show = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3500);
    };

    return { toast, show };
}

// ─────────────────────────────────────────────────
// Format date helper
// ─────────────────────────────────────────────────
function formatDate(iso: string | null | undefined) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

// ─────────────────────────────────────────────────
// Profile Tab
// ─────────────────────────────────────────────────
function ProfileTab() {
    const { user } = useAuthStore();
    const { data: profile, isLoading } = useGetMe();
    const updateProfile = useUpdateProfile();
    const changePassword = useChangePassword();
    const { toast, show } = useToast();

    const [displayName, setDisplayName] = useState(user?.displayName ?? '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwErrors, setPwErrors] = useState<string[]>([]);

    const isLocal = user?.provider === 'LOCAL';

    // sync with profile query when loaded
    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName ?? '');
            setAvatarUrl(profile.avatarUrl ?? '');
        }
    }, [profile]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateProfile.mutateAsync({ displayName: displayName.trim() || undefined, avatarUrl: avatarUrl.trim() || undefined });
            show('success', 'Profile updated!');
        } catch {
            show('error', 'Failed to update profile.');
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const errors: string[] = [];
        if (newPassword.length < 8) errors.push('New password must be at least 8 characters.');
        if (newPassword !== confirmPassword) errors.push('Passwords do not match.');
        if (errors.length) { setPwErrors(errors); return; }
        setPwErrors([]);
        try {
            await changePassword.mutateAsync({ oldPassword, newPassword });
            show('success', 'Password changed successfully!');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'Failed to change password.';
            show('error', msg);
        }
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center py-16 text-gray-400'>
                <Loader2 size={28} className='animate-spin' />
            </div>
        );
    }

    return (
        <div className='space-y-8'>
            {/* Toast */}
            {toast && (
                <div
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${toast.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                >
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                </div>
            )}

            {/* Avatar preview */}
            <div className='flex items-center gap-4'>
                <UserAvatar name={displayName || user?.email} avatarUrl={avatarUrl || undefined} size='lg' />
                <div>
                    <p className='font-semibold text-gray-900'>{displayName || user?.email}</p>
                    <p className='text-sm text-gray-500'>{user?.email}</p>
                    <span className='inline-flex items-center gap-1 text-xs text-gray-400 mt-1'>
                        {user?.provider === 'GOOGLE' ? '🔗 Google account' : '🔑 Local account'}
                    </span>
                </div>
            </div>

            {/* Personal info form */}
            <form onSubmit={handleSaveProfile} className='bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4'>
                <h3 className='font-semibold text-gray-800 flex items-center gap-2'>
                    <User size={16} /> Personal Information
                </h3>

                <div className='grid gap-4 sm:grid-cols-2'>
                    <div>
                        <label className='block text-xs font-medium text-gray-600 mb-1'>Display Name</label>
                        <input
                            type='text'
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder='Your name'
                            maxLength={100}
                            className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
                        />
                    </div>
                    <div>
                        <label className='block text-xs font-medium text-gray-600 mb-1'>Email</label>
                        <input
                            type='email'
                            value={user?.email ?? ''}
                            disabled
                            className='w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed'
                        />
                    </div>
                    <div className='sm:col-span-2'>
                        <label className='block text-xs font-medium text-gray-600 mb-1'>Avatar URL</label>
                        <input
                            type='url'
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            placeholder='https://example.com/avatar.png'
                            className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
                        />
                    </div>
                </div>

                <div className='flex justify-end'>
                    <button
                        type='submit'
                        disabled={updateProfile.isPending}
                        className='inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 transition-colors'
                    >
                        {updateProfile.isPending && <Loader2 size={14} className='animate-spin' />}
                        Save Changes
                    </button>
                </div>
            </form>

            {/* Change Password */}
            {isLocal && (
                <form onSubmit={handleChangePassword} className='bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4'>
                    <h3 className='font-semibold text-gray-800 flex items-center gap-2'>
                        <Lock size={16} /> Change Password
                    </h3>

                    {pwErrors.length > 0 && (
                        <div className='rounded-lg bg-red-50 border border-red-200 p-3 space-y-1'>
                            {pwErrors.map((e, i) => (
                                <p key={i} className='text-xs text-red-600 flex items-center gap-1'>
                                    <AlertCircle size={12} /> {e}
                                </p>
                            ))}
                        </div>
                    )}

                    <div className='grid gap-4'>
                        <div>
                            <label className='block text-xs font-medium text-gray-600 mb-1'>Current Password</label>
                            <input
                                type='password'
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                                className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
                            />
                        </div>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <div>
                                <label className='block text-xs font-medium text-gray-600 mb-1'>New Password</label>
                                <input
                                    type='password'
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
                                />
                            </div>
                            <div>
                                <label className='block text-xs font-medium text-gray-600 mb-1'>Confirm New Password</label>
                                <input
                                    type='password'
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className='w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400'
                                />
                            </div>
                        </div>
                    </div>

                    <div className='flex justify-end'>
                        <button
                            type='submit'
                            disabled={changePassword.isPending}
                            className='inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-60 transition-colors'
                        >
                            {changePassword.isPending && <Loader2 size={14} className='animate-spin' />}
                            Update Password
                        </button>
                    </div>
                </form>
            )}

            {!isLocal && (
                <div className='rounded-2xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700'>
                    Password management is handled by your Google account. You cannot change your password here.
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────
// Dashboard Tab
// ─────────────────────────────────────────────────
function DashboardTab() {
    const { data: profile, isLoading } = useGetMe();

    if (isLoading) {
        return (
            <div className='flex items-center justify-center py-16 text-gray-400'>
                <Loader2 size={28} className='animate-spin' />
            </div>
        );
    }

    const stats = profile?.stats;

    return (
        <div className='space-y-6'>
            <div className='grid gap-4 sm:grid-cols-2'>
                <StatCard
                    icon={FileText}
                    label='Papers Uploaded'
                    value={stats?.papersUploaded ?? 0}
                    color='bg-brand-500'
                />
                <StatCard
                    icon={MessageSquare}
                    label='Conversations'
                    value={stats?.conversations ?? 0}
                    color='bg-purple-500'
                />
                <StatCard
                    icon={Users2}
                    label='Collaborative Sessions'
                    value={stats?.collaborativeSessions ?? 0}
                    color='bg-green-500'
                />
                <StatCard
                    icon={BarChart3}
                    label='Total Activity'
                    value={(stats?.papersUploaded ?? 0) + (stats?.conversations ?? 0)}
                    sub='Papers + conversations'
                    color='bg-orange-500'
                />
            </div>

            {/* Timestamps */}
            <div className='bg-white border border-gray-100 rounded-2xl p-5 shadow-sm'>
                <h3 className='font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide'>Account Timeline</h3>
                <div className='space-y-3'>
                    <div className='flex items-center gap-3 text-sm'>
                        <Calendar size={16} className='text-gray-400 flex-shrink-0' />
                        <span className='text-gray-500 w-32'>Member since</span>
                        <span className='font-medium text-gray-800'>{formatDate(profile?.createdAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────
// Main ProfilePage
// ─────────────────────────────────────────────────
type Tab = 'profile' | 'dashboard';

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const navigate = useNavigate();

    const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    ];

    return (
        <div className='min-h-screen bg-gray-50 pt-14 pl-16'>
            <div className='max-w-3xl mx-auto px-6 py-10'>
                {/* Header */}
                <div className='mb-8'>
                    <button
                        onClick={() => navigate(-1)}
                        className='text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1 transition-colors'
                    >
                        ← Back
                    </button>
                    <h1 className='text-3xl font-bold text-gray-900'>Account</h1>
                    <p className='text-gray-500 mt-1 text-sm'>Manage your personal information and view activity statistics.</p>
                </div>

                {/* Tabs */}
                <div className='flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit'>
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Icon size={15} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {activeTab === 'profile' && <ProfileTab />}
                {activeTab === 'dashboard' && <DashboardTab />}
            </div>
        </div>
    );
}
