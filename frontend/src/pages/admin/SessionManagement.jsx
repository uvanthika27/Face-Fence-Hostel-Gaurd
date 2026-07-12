import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const EMPTY = { sessionName: '', date: '', startTime: '', endTime: '', latitude: '', longitude: '', radius: '' };

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/sessions', { params: filterDate ? { date: filterDate } : {} });
      setSessions(data.sessions);
    } catch { toast.error('Failed to load sessions'); }
    finally { setLoading(false); }
  }, [filterDate]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const openAdd = () => { setEditId(null); setForm({ ...EMPTY, date: new Date().toISOString().split('T')[0] }); };
  const openEdit = (s) => {
    setEditId(s._id);
    setForm({ sessionName: s.sessionName, date: s.date, startTime: s.startTime, endTime: s.endTime, latitude: s.latitude, longitude: s.longitude, radius: s.radius });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await API.put(`/sessions/${editId}`, form);
      else await API.post('/sessions', form);
      toast.success(editId ? 'Session updated' : 'Session created');
      fetchSessions();
      document.getElementById('sessionModalClose').click();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    try { await API.delete(`/sessions/${id}`); toast.success('Session deleted'); fetchSessions(); }
    catch { toast.error('Delete failed'); }
  };

  const handleToggle = async (id) => {
    try { const { data } = await API.patch(`/sessions/${id}/toggle`); toast.success(data.message); fetchSessions(); }
    catch { toast.error('Failed'); }
  };

  const setCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((f) => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) })); toast.success('Location captured'); },
      () => toast.error('Location access denied')
    );
  };

  return (
    <div className="p-3 p-lg-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-4">
        <h5 className="fw-bold mb-0">Attendance Sessions</h5>
        <button className="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#sessionModal" onClick={openAdd}>
          <i className="bi bi-plus-lg me-1"></i>New Session
        </button>
      </div>

      <div className="mb-3 d-flex gap-2 align-items-center">
        <input type="date" className="form-control form-control-sm" style={{ maxWidth: 200 }}
          value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
        {filterDate && <button className="btn btn-sm btn-outline-secondary" onClick={() => setFilterDate('')}>Clear</button>}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Session Name</th>
                  <th>Date</th>
                  <th>Time Window</th>
                  <th>Location</th>
                  <th>Radius</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-4">No sessions found</td></tr>
                )}
                {sessions.map((s) => (
                  <tr key={s._id}>
                    <td className="fw-semibold">{s.sessionName}</td>
                    <td>{s.date}</td>
                    <td><span className="badge bg-light text-dark border">{s.startTime} – {s.endTime}</span></td>
                    <td><small className="text-muted">{s.latitude}, {s.longitude}</small></td>
                    <td>{s.radius}m</td>
                    <td>
                      <span className={`badge ${s.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#sessionModal" onClick={() => openEdit(s)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className={`btn btn-sm ${s.isActive ? 'btn-outline-secondary' : 'btn-outline-success'}`} onClick={() => handleToggle(s._id)}>
                          <i className={`bi ${s.isActive ? 'bi-pause' : 'bi-play'}`}></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s._id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Session Modal */}
      <div className="modal fade" id="sessionModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title fw-bold">{editId ? 'Edit Session' : 'New Attendance Session'}</h6>
              <button type="button" className="btn-close" id="sessionModalClose" data-bs-dismiss="modal"></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">Session Name</label>
                  <input className="form-control form-control-sm" value={form.sessionName}
                    onChange={(e) => setForm({ ...form, sessionName: e.target.value })} required placeholder="e.g. Night Roll Call" />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Date</label>
                  <input type="date" className="form-control form-control-sm" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
                <div className="col-3">
                  <label className="form-label small fw-semibold">Start Time</label>
                  <input type="time" className="form-control form-control-sm" value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
                </div>
                <div className="col-3">
                  <label className="form-label small fw-semibold">End Time</label>
                  <input type="time" className="form-control form-control-sm" value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
                </div>
                <div className="col-5">
                  <label className="form-label small fw-semibold">Latitude</label>
                  <input type="number" step="any" className="form-control form-control-sm" value={form.latitude}
                    onChange={(e) => setForm({ ...form, latitude: e.target.value })} required placeholder="e.g. 11.0168" />
                </div>
                <div className="col-5">
                  <label className="form-label small fw-semibold">Longitude</label>
                  <input type="number" step="any" className="form-control form-control-sm" value={form.longitude}
                    onChange={(e) => setForm({ ...form, longitude: e.target.value })} required placeholder="e.g. 76.9558" />
                </div>
                <div className="col-2 d-flex align-items-end">
                  <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={setCurrentLocation} title="Use my current location">
                    <i className="bi bi-geo-alt-fill"></i>
                  </button>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold">Allowed Radius (meters)</label>
                  <input type="number" className="form-control form-control-sm" value={form.radius} min={10}
                    onChange={(e) => setForm({ ...form, radius: e.target.value })} required placeholder="e.g. 200" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving && <span className="spinner-border spinner-border-sm me-1"></span>}
                  {editId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionManagement;
