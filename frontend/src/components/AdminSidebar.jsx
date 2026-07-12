import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/admin/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
  { to: '/admin/students', icon: 'bi-people-fill', label: 'Students' },
  { to: '/admin/sessions', icon: 'bi-calendar-check-fill', label: 'Sessions' },
  { to: '/admin/monitoring', icon: 'bi-eye-fill', label: 'Monitoring' },
  { to: '/admin/reports', icon: 'bi-bar-chart-fill', label: 'Reports' },
];

const SidebarContent = ({ onNavigate }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="d-flex flex-column h-100">
      <div className="p-3 border-bottom">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-shield-lock-fill text-primary fs-4"></i>
          <div>
            <div className="fw-bold text-dark lh-1">GeoFace</div>
            <small className="text-muted">Hostel Guard</small>
          </div>
        </div>
      </div>

      <div className="p-3 border-bottom">
        <div className="d-flex align-items-center gap-2">
          <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white"
            style={{ width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="small fw-semibold lh-1">{user?.fullName}</div>
            <small className="text-muted">Warden</small>
          </div>
        </div>
      </div>

      <nav className="flex-grow-1 p-2">
        {links.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} onClick={onNavigate}
            className={({ isActive }) =>
              `d-flex align-items-center gap-2 px-3 py-2 rounded text-decoration-none mb-1 ${isActive ? 'bg-primary text-white' : 'text-dark'}`
            }>
            <i className={`bi ${icon}`}></i>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-top">
        <button className="btn btn-outline-danger btn-sm w-100" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right me-2"></i>Logout
        </button>
      </div>
    </div>
  );
};

const AdminSidebar = () => (
  <>
    {/* Desktop sidebar */}
    <div className="d-none d-lg-flex flex-column bg-white border-end"
      style={{ width: 240, minHeight: '100vh', position: 'sticky', top: 0 }}>
      <SidebarContent />
    </div>

    {/* Mobile offcanvas */}
    <div className="offcanvas offcanvas-start" tabIndex="-1" id="adminSidebar" style={{ width: 240 }}>
      <div className="offcanvas-header border-bottom py-2">
        <button type="button" className="btn-close ms-auto" data-bs-dismiss="offcanvas"></button>
      </div>
      <div className="offcanvas-body p-0 h-100">
        <SidebarContent onNavigate={() => {
          const el = document.getElementById('adminSidebar');
          const bs = window.bootstrap?.Offcanvas?.getInstance(el);
          bs?.hide();
        }} />
      </div>
    </div>
  </>
);

export default AdminSidebar;
