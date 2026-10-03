import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="pp-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
