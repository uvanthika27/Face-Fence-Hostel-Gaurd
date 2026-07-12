import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);

  const handleResetFace = async () => {
    if (!window.confirm('This will delete your face registration. You will need to re-scan on next login. Continue?')) return;
    setResetting(true);
    try {
      await API.post('/auth/reset-face');
      updateUser({ faceRegistered: false });
      toast.success('Face registration cleared. Redirecting to re-register...');
      setTimeout(() => navigate('/face-setup'), 1500);
    } catch { toast.error('Failed to reset face'); }
    finally { setResetting(false); }
  };

  return (
    <div className="p-3 p-lg-4" style={{ maxWidth: 500 }}>
      <h5 className="fw-bold mb-4">My Profile</h5>

      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-4">
          {user?.profilePhoto
            ? <img src={`/${user.profilePhoto}`} className="rounded-circle mb-3"
                style={{ width: 96, height: 96, objectFit: 'cover' }} alt="Profile" />
            : <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-bold mb-3"
                style={{ width: 96, height: 96, fontSize: 36 }}>{user?.fullName?.charAt(0)}</div>}
          <h5 className="fw-bold mb-0">{user?.fullName}</h5>
          <small className="text-muted">Student</small>
        </div>

        <ul className="list-group list-group-flush">
          {[
            ['Register Number', user?.registerNumber],
            ['Username', user?.username],
            ['Block', user?.block],
            ['Room Number', user?.roomNumber],
          ].map(([label, value]) => (
            <li className="list-group-item d-flex justify-content-between" key={label}>
              <span className="text-muted small">{label}</span>
              <span className="fw-semibold small">{value || '-'}</span>
            </li>
          ))}
        </ul>

        <div className="card-footer bg-white border-0 text-center pb-3 d-flex gap-2 justify-content-center">
          <Link to="/change-password" className="btn btn-outline-warning btn-sm">
            <i className="bi bi-key me-1"></i>Change Password
          </Link>
          <button className="btn btn-outline-danger btn-sm" onClick={handleResetFace} disabled={resetting}>
            {resetting
              ? <><span className="spinner-border spinner-border-sm me-1"></span>Resetting...</>
              : <><i className="bi bi-camera me-1"></i>Re-register Face</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
