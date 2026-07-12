import React, { useEffect, useState } from 'react';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_BADGE = { Present: 'success', Late: 'warning', Absent: 'secondary', Suspicious: 'danger' };

const AttendanceHistory = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/attendance/my-history')
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const s = data?.summary || {};

  return (
    <div className="p-3 p-lg-4">
      <h5 className="fw-bold mb-4">Attendance History</h5>

      <div className="row g-3 mb-4">
        {[['Present', s.present, 'success'], ['Late', s.late, 'warning'], ['Absent', s.absent, 'danger'], ['Total Sessions', s.total, 'primary']].map(([l, v, c]) => (
          <div className="col-6 col-md-3" key={l}>
            <div className={`card border-0 shadow-sm text-center py-3 border-top border-3 border-${c}`}>
              <div className="fw-bold fs-4">{v ?? 0}</div>
              <div className="text-muted small">{l}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3">
        <div className="progress" style={{ height: 20 }}>
          <div className="progress-bar bg-success" style={{ width: `${s.percentage ?? 0}%` }}>
            {s.percentage ?? 0}%
          </div>
        </div>
        <small className="text-muted">Attendance Percentage</small>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr><th>#</th><th>Session</th><th>Date</th><th>Status</th><th>Match%</th><th>Time</th></tr>
            </thead>
            <tbody>
              {!data?.records?.length && (
                <tr><td colSpan={6} className="text-center text-muted py-4">No attendance records yet</td></tr>
              )}
              {data?.records?.map((r, i) => (
                <tr key={r._id}>
                  <td>{i + 1}</td>
                  <td>{r.sessionId?.sessionName || '-'}</td>
                  <td>{r.sessionId?.date || '-'}</td>
                  <td><span className={`badge bg-${STATUS_BADGE[r.status]}`}>{r.status}</span></td>
                  <td>{r.matchScore ? `${r.matchScore}%` : '-'}</td>
                  <td><small>{new Date(r.timestamp).toLocaleString()}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceHistory;
