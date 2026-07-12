import React, { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

ChartJS.register(ArcElement, Tooltip, Legend);

const StatCard = ({ icon, label, value, color, sub }) => (
  <div className="col-6 col-lg-3">
    <div className={`card border-0 border-start border-4 border-${color} shadow-sm h-100`}>
      <div className="card-body d-flex align-items-center gap-3">
        <div className={`bg-${color} bg-opacity-10 rounded-3 p-3`}>
          <i className={`bi ${icon} text-${color} fs-4`}></i>
        </div>
        <div>
          <div className="text-muted small">{label}</div>
          <div className="fs-4 fw-bold">{value ?? 0}</div>
          {sub && <div className="text-muted" style={{ fontSize: 11 }}>{sub}</div>}
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/attendance/dashboard-stats')
      .then(({ data }) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const today = stats?.today || {};
  const hasSession = stats?.hasSession;
  const sessionLabel = stats?.sessionLabel || '';
  const hasData = hasSession && (today.Present || today.Late || today.Absent || today.Suspicious);

  const chartData = {
    labels: ['Present', 'Late', 'Absent', 'Suspicious'],
    datasets: [{
      data: [today.Present || 0, today.Late || 0, today.Absent || 0, today.Suspicious || 0],
      backgroundColor: ['#198754', '#ffc107', '#dc3545', '#6f42c1'],
      borderWidth: 2,
    }],
  };

  return (
    <div className="p-3 p-lg-4">
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <h5 className="fw-bold mb-0">Dashboard Overview</h5>
        {hasSession && (
          <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2">
            <i className="bi bi-calendar-check me-1"></i>
            Showing: {sessionLabel}
          </span>
        )}
      </div>

      {/* No session state */}
      {!hasSession && (
        <div className="alert alert-info d-flex align-items-center gap-2 mb-4">
          <i className="bi bi-info-circle-fill fs-5"></i>
          <span>No attendance sessions have been created yet. Go to <strong>Sessions</strong> to create one.</span>
        </div>
      )}

      <div className="row g-3 mb-4">
        <StatCard icon="bi-people-fill"     label="Total Students"  value={stats?.totalStudents} color="primary" />
        <StatCard icon="bi-calendar3"       label="Total Sessions"  value={stats?.totalSessions} color="info" />
        <StatCard
          icon="bi-check-circle-fill"
          label="Present"
          value={hasSession ? (today.Present || 0) + (today.Late || 0) : '-'}
          color="success"
          sub={hasSession ? `${today.Present || 0} on time, ${today.Late || 0} late` : 'No session yet'}
        />
        <StatCard
          icon="bi-x-circle-fill"
          label="Absent"
          value={hasSession ? today.Absent || 0 : '-'}
          color="danger"
          sub={hasSession ? 'Did not mark attendance' : 'No session yet'}
        />
      </div>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 fw-semibold d-flex justify-content-between align-items-center">
              Attendance Breakdown
              {hasSession && <small className="text-muted fw-normal">{sessionLabel}</small>}
            </div>
            <div className="card-body d-flex justify-content-center align-items-center" style={{ minHeight: 260 }}>
              {hasData ? (
                <Doughnut
                  data={chartData}
                  options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
                  style={{ maxHeight: 240 }}
                />
              ) : (
                <div className="text-center text-muted">
                  <i className="bi bi-pie-chart fs-1 d-block mb-2 opacity-25"></i>
                  {hasSession ? 'No records yet for this session' : 'Create a session to see data'}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-0 fw-semibold">Status Summary</div>
            <div className="card-body">
              {!hasSession ? (
                <div className="text-muted text-center py-4">
                  <i className="bi bi-calendar-x fs-2 d-block mb-2 opacity-25"></i>
                  Stats will appear after the first session is created.
                </div>
              ) : (
                [
                  { label: 'Present',    value: today.Present    || 0, color: 'success' },
                  { label: 'Late',       value: today.Late       || 0, color: 'warning' },
                  { label: 'Absent',     value: today.Absent     || 0, color: 'danger'  },
                  { label: 'Suspicious', value: today.Suspicious || 0, color: 'secondary' },
                ].map(({ label, value, color }) => {
                  const total = (today.Present || 0) + (today.Late || 0) + (today.Absent || 0) + (today.Suspicious || 0);
                  const pct = total ? Math.round((value / total) * 100) : 0;
                  return (
                    <div key={label} className="mb-3">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="fw-semibold">{label}</span>
                        <span>{value} students ({pct}%)</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div className={`progress-bar bg-${color}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
