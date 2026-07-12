import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import Navbar from './Navbar';

const pageLabels = {
  '/admin/dashboard': 'Dashboard',
  '/admin/students': 'Student Management',
  '/admin/sessions': 'Attendance Sessions',
  '/admin/monitoring': 'Attendance Monitoring',
  '/admin/reports': 'Reports',
};

const AdminLayout = () => {
  const title = pageLabels[window.location.pathname] || 'Admin Panel';

  return (
    <div className="d-flex" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <AdminSidebar />
      <div className="flex-grow-1 d-flex flex-column overflow-hidden">
        <Navbar title={title} />
        <main className="flex-grow-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
