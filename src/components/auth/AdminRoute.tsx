import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * AdminRoute — protects /admin/* routes.
 * - If not authenticated → redirect to /
 * - If authenticated but not SUPERADMIN → redirect to /
 * - If SUPERADMIN → render children
 */
export default function AdminRoute({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated || !user) {
        return <Navigate to='/' replace />;
    }

    if (user.role !== 'SUPERADMIN') {
        return <Navigate to='/' replace />;
    }

    return <>{children}</>;
}
