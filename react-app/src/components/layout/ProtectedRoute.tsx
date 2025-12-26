import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-50">Loading...</div>;
    }

    // Check if user is authenticated (simple check for now)
    // For dev, if user is null, redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
