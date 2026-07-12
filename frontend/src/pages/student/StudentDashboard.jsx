import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE = { Present: 'success', Late: 'warning', Absent: 'secondary', Suspicious: 'danger' };

const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/attendance/my-history')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const s = data?.summary || {};

  return (
    <div className="p-3 p-lg-4">
      <div className="d-flex align-items-center gap-3 mb-4">
        {user?.profilePhoto
          ? <img src={`/${user.profilePhoto}`} className="rounded-circle" style={{ width: 56, height: 56, objectFit: 'cover' }} alt="" />
          : <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
              style={{ width: 56, height: 56, fontSize: 20 }}>{user?.fullName?.charAt(0)}</div>}
        <div>
          <h5 className="mb-0 fw-bold">{user?.fullName}</h5>
          <small className="text-muted">{user?.registerNumber} &bull; Block {user?.block}, Room {user?.roomNumber}</small>
        </div>
      </div>

      {/* Attendance % ring */}
      <div className="card border-0 shadow-sm mb-4 text-center p-3">
        <div className="display-4 fw-bold text-primary">{s.percentage ?? 0}%</div>
        <div className="text-muted small">Overall Attendance</div>
        <div className="mt-3">
          <Link to="/student/mark-attendance" className="btn btn-success px-4">
            <i className="bi bi-camera-fill me-2"></i>Mark Hostel Attendance
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {[['Present', s.present, 'success', 'bi-check-circle'], ['Late', s.late, 'warning', 'bi-clock'], ['Absent', s.absent, 'danger', 'bi-x-circle'], ['Total', s.total, 'primary', 'bi-list-check']].map(([label, val, color, icon]) => (
          <div className="col-6 col-md-3" key={label}>
            <div className={`card border-0 border-top border-3 border-${color} shadow-sm text-center py-3`}>
              <i className={`bi ${icon} text-${color} fs-3`}></i>
              <div className="fw-bold fs-4">{val ?? 0}</div>
              <div className="text-muted small">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent history */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 fw-semibold d-flex justify-content-between">
          Recent Attendance
          <Link to="/student/history" className="btn btn-sm btn-outline-primary">View All</Link>
        </div>
        <div className="table-responsive">
          <table className="table table-sm table-hover align-middle mb-0">
            <thead className="table-light">
              <tr><th>Session</th><th>Date</th><th>Status</th><th>Time</th></tr>
            </thead>
            <tbody>
              {(!data?.records?.length) && (
                <tr><td colSpan={4} className="text-center text-muted py-3">No records yet</td></tr>
              )}
              {data?.records?.slice(0, 5).map((r) => (
                <tr key={r._id}>
                  <td>{r.sessionId?.sessionName || '-'}</td>
                  <td>{r.sessionId?.date || '-'}</td>
                  <td><span className={`badge bg-${STATUS_BADGE[r.status]}`}>{r.status}</span></td>
                  <td><small>{new Date(r.timestamp).toLocaleTimeString()}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
