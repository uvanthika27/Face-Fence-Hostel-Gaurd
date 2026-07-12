import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Step 1: force password change
  if (user.mustChangePassword && location.pathname !== '/change-password')
    return <Navigate to="/change-password" replace />;

  // Step 2: force face registration (students only, after password is set)
  if (
    !user.mustChangePassword &&
    user.role === 'student' &&
    !user.faceRegistered &&
    location.pathname !== '/face-setup'
  )
    return <Navigate to="/face-setup" replace />;

  // Step 3: role guard
  if (role && user.role !== role)
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;

  return children;
};

export default ProtectedRoute;
