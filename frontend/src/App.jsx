import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import StudentLayout from './components/StudentLayout';

// Auth
import Login from './pages/auth/Login';
import ChangePassword from './pages/auth/ChangePassword';

// Admin
import Dashboard from './pages/admin/Dashboard';
import StudentManagement from './pages/admin/StudentManagement';
import SessionManagement from './pages/admin/SessionManagement';
import AttendanceMonitoring from './pages/admin/AttendanceMonitoring';
import Reports from './pages/admin/Reports';

// Student
import StudentDashboard from './pages/student/StudentDashboard';
import MarkAttendance from './pages/student/MarkAttendance';
import AttendanceHistory from './pages/student/AttendanceHistory';
import Profile from './pages/student/Profile';
import FaceSetup from './pages/student/FaceSetup';

const App = () => (
  <AuthProvider>
    <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Shared protected */}
        <Route path="/change-password" element={
          <ProtectedRoute><ChangePassword /></ProtectedRoute>
        } />
        <Route path="/face-setup" element={
          <ProtectedRoute><FaceSetup /></ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="sessions" element={<SessionManagement />} />
          <Route path="monitoring" element={<AttendanceMonitoring />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Student routes */}
        <Route path="/student" element={
          <ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="mark-attendance" element={<MarkAttendance />} />
          <Route path="history" element={<AttendanceHistory />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
