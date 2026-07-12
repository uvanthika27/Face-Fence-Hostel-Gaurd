import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-light bg-white border-bottom px-3 py-2 sticky-top">
      <div className="d-flex align-items-center gap-2">
        <button className="btn btn-sm btn-outline-secondary d-lg-none"
          data-bs-toggle="offcanvas" data-bs-target="#adminSidebar">
          <i className="bi bi-list fs-5"></i>
        </button>
        <span className="fw-semibold">{title}</span>
      </div>
      <div className="d-flex align-items-center gap-2">
        <span className="d-none d-sm-inline text-muted small">{user?.fullName}</span>
        {user?.role === 'student' && (
          <button className="btn btn-sm btn-outline-danger" onClick={() => { logout(); navigate('/login'); }}>
            <i className="bi bi-box-arrow-right"></i>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
