import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const ChangePassword = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword)
      return toast.error('New passwords do not match');
    if (form.newPassword.length < 6)
      return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      await API.put('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success('Password changed successfully!');
      updateUser({ mustChangePassword: false });
      navigate(user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="card shadow-sm border-0" style={{ width: '100%', maxWidth: 440 }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <i className="bi bi-key-fill text-warning" style={{ fontSize: 48 }}></i>
            <h5 className="fw-bold mt-2">Change Your Password</h5>
            {user?.mustChangePassword && (
              <div className="alert alert-warning py-2 mt-2 mb-0 small">
                <i className="bi bi-exclamation-triangle me-1"></i>
                You must change your password before continuing.
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
              <div className="mb-3" key={field}>
                <label className="form-label fw-semibold">
                  {field === 'currentPassword' ? 'Current Password' : field === 'newPassword' ? 'New Password' : 'Confirm New Password'}
                </label>
                <input type="password" className="form-control"
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  required minLength={field !== 'currentPassword' ? 6 : 1} />
              </div>
            ))}

            <button type="submit" className="btn btn-warning w-100 fw-semibold" disabled={loading}>
              {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
              Change Password
            </button>
          </form>

          <div className="text-center mt-3">
            <button className="btn btn-link btn-sm text-muted" onClick={() => { logout(); navigate('/login'); }}>
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
