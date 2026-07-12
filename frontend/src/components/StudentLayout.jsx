import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

const bottomLinks = [
  { to: '/student/dashboard', icon: 'bi-house-fill', label: 'Home' },
  { to: '/student/mark-attendance', icon: 'bi-camera-fill', label: 'Attend' },
  { to: '/student/history', icon: 'bi-clock-history', label: 'History' },
  { to: '/student/profile', icon: 'bi-person-fill', label: 'Profile' },
];

const StudentLayout = () => {
  const pageLabels = {
    '/student/dashboard': 'Dashboard',
    '/student/mark-attendance': 'Mark Attendance',
    '/student/history': 'Attendance History',
    '/student/profile': 'My Profile',
  };
  const path = window.location.pathname;

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar title={pageLabels[path] || 'Student Portal'} />

      <main className="flex-grow-1 bg-light pb-5">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav className="navbar fixed-bottom bg-white border-top d-flex justify-content-around py-1 d-lg-none">
        {bottomLinks.map(({ to, icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `d-flex flex-column align-items-center text-decoration-none px-3 py-1 rounded ${isActive ? 'text-primary' : 'text-muted'}`}>
            <i className={`bi ${icon} fs-5`}></i>
            <span style={{ fontSize: 10 }}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Desktop top sub-nav */}
      <div className="d-none d-lg-flex fixed-bottom bg-white border-top justify-content-center gap-4 py-2">
        {bottomLinks.map(({ to, icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `d-flex align-items-center gap-1 text-decoration-none ${isActive ? 'text-primary fw-semibold' : 'text-muted'}`}>
            <i className={`bi ${icon}`}></i>
            <span className="small">{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default StudentLayout;
