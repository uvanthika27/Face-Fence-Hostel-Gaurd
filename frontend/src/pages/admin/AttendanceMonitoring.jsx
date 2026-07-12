import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const STATUS_BADGE = { Present: 'success', Late: 'warning', Absent: 'secondary', Suspicious: 'danger' };
const TODAY = new Date().toISOString().split('T')[0];
const EMPTY_FILTERS = { date: TODAY, sessionId: '', block: '', room: '', status: '' };

const AttendanceMonitoring = () => {
  const [data, setData] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  // draft = what's typed in inputs; applied = what was last searched
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [reviewRecord, setReviewRecord] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const initialLoad = useRef(true);

  // Fetch sessions whenever date changes in draft (for the session dropdown)
  useEffect(() => {
    if (!draft.date) { setSessions([]); return; }
    API.get('/sessions', { params: { date: draft.date } })
      .then(({ data }) => setSessions(data.sessions))
      .catch(() => setSessions([]));
  }, [draft.date]);

  const fetchData = useCallback(async (filters) => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date)      params.date      = filters.date;
      if (filters.sessionId) params.sessionId = filters.sessionId;
      if (filters.block)     params.block     = filters.block;
      if (filters.room)      params.room      = filters.room;
      if (filters.status)    params.status    = filters.status;
      const { data: res } = await API.get('/attendance/monitoring', { params });
      setData(res.data);
    } catch { toast.error('Failed to load monitoring data'); }
    finally { setLoading(false); }
  }, []);

  // Only auto-load on mount
  useEffect(() => {
    if (initialLoad.current) { initialLoad.current = false; fetchData(EMPTY_FILTERS); }
  }, [fetchData]);

  const handleApply = () => { setApplied(draft); fetchData(draft); };

  const handleReset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    fetchData(EMPTY_FILTERS);
  };

  const set = (field, value) => setDraft((d) => ({ ...d, [field]: value }));

  const handleReview = async (reviewStatus) => {
    setReviewing(true);
    try {
      await API.patch(`/attendance/${reviewRecord.record._id}/review`, { reviewStatus, reviewNote });
      toast.success(`Record ${reviewStatus}`);
      setReviewRecord(null);
      setReviewNote('');
      document.getElementById('reviewModalClose').click();
      fetchData(applied);
    } catch { toast.error('Review failed'); }
    finally { setReviewing(false); }
  };

  const counts = data.reduce((acc, d) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {});

  return (
    <div className="p-3 p-lg-4">
      <h5 className="fw-bold mb-4">Attendance Monitoring</h5>

      {/* Summary badges */}
      <div className="d-flex flex-wrap gap-2 mb-4">
        {Object.entries(STATUS_BADGE).map(([s, c]) => (
          <span key={s} className={`badge bg-${c} fs-6 px-3 py-2`}>{s}: {counts[s] || 0}</span>
        ))}
        <span className="badge bg-dark fs-6 px-3 py-2">Total: {data.length}</span>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-6 col-md-2">
              <label className="form-label small fw-semibold mb-1">Date</label>
              <input type="date" className="form-control form-control-sm" value={draft.date}
                onChange={(e) => set('date', e.target.value)} />
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small fw-semibold mb-1">Session</label>
              <select className="form-select form-select-sm" value={draft.sessionId}
                onChange={(e) => set('sessionId', e.target.value)}>
                <option value="">All Sessions</option>
                {sessions.map((s) => (
                  <option key={s._id} value={s._id}>{s.sessionName} ({s.startTime})</option>
                ))}
              </select>
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label small fw-semibold mb-1">Block</label>
              <input className="form-control form-control-sm" placeholder="e.g. A"
                value={draft.block} onChange={(e) => set('block', e.target.value.toUpperCase())} />
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label small fw-semibold mb-1">Room</label>
              <input className="form-control form-control-sm" placeholder="e.g. 101"
                value={draft.room} onChange={(e) => set('room', e.target.value)} />
            </div>
            <div className="col-4 col-md-2">
              <label className="form-label small fw-semibold mb-1">Status</label>
              <select className="form-select form-select-sm" value={draft.status}
                onChange={(e) => set('status', e.target.value)}>
                <option value="">All Status</option>
                {Object.keys(STATUS_BADGE).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-6 col-md-1">
              <button className="btn btn-primary btn-sm w-100" onClick={handleApply}>
                <i className="bi bi-search"></i>
              </button>
            </div>
            <div className="col-6 col-md-1">
              <button className="btn btn-outline-secondary btn-sm w-100" onClick={handleReset} title="Reset">
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Reg. No</th>
                  <th>Block/Room</th>
                  <th>Status</th>
                  <th>Match %</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No records found</td></tr>
                )}
                {data.map((row, i) => (
                  <tr key={row.student._id}>
                    <td>{i + 1}</td>
                    <td className="fw-semibold">{row.student.fullName}</td>
                    <td><code>{row.student.registerNumber}</code></td>
                    <td>{row.student.block}/{row.student.roomNumber}</td>
                    <td>
                      <span className={`badge bg-${STATUS_BADGE[row.status]}`}>{row.status}</span>
                    </td>
                    <td>{row.record?.matchScore != null ? `${row.record.matchScore}%` : '-'}</td>
                    <td>
                      <small>{row.record?.timestamp ? new Date(row.record.timestamp).toLocaleTimeString() : '-'}</small>
                    </td>
                    <td>
                      {row.status === 'Suspicious' && row.record && (
                        <button className="btn btn-sm btn-outline-warning"
                          data-bs-toggle="modal" data-bs-target="#reviewModal"
                          onClick={() => { setReviewRecord(row); setReviewNote(''); }}>
                          <i className="bi bi-search me-1"></i>Review
                        </button>
                      )}
                      {row.record?.selfieImage && (
                        <a href={`/${row.record.selfieImage}`} target="_blank" rel="noreferrer"
                          className="btn btn-sm btn-outline-secondary ms-1">
                          <i className="bi bi-camera"></i>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <div className="modal fade" id="reviewModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title fw-bold">Review Suspicious Record</h6>
              <button type="button" className="btn-close" id="reviewModalClose" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              {reviewRecord && (
                <>
                  <p className="mb-1"><strong>Student:</strong> {reviewRecord.student.fullName}</p>
                  <p className="mb-1"><strong>Match Score:</strong> {reviewRecord.record?.matchScore}%</p>
                  <p className="mb-2"><strong>Time:</strong> {reviewRecord.record?.timestamp
                    ? new Date(reviewRecord.record.timestamp).toLocaleString() : '-'}</p>
                  {reviewRecord.record?.selfieImage && (
                    <img src={`/${reviewRecord.record.selfieImage}`} alt="selfie"
                      className="img-thumbnail mb-3 d-block" style={{ maxHeight: 200 }} />
                  )}
                  <div className="alert alert-warning small py-2 mb-3">
                    <i className="bi bi-info-circle-fill me-1"></i>
                    <strong>Approve</strong> — marks attendance as Present.<br />
                    <strong>Reject</strong> — deletes this record so the student can <strong>mark attendance again</strong>.
                  </div>
                  <label className="form-label small fw-semibold">Review Note (optional)</label>
                  <textarea className="form-control form-control-sm" rows={2} value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)} placeholder="Add a note..." />
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleReview('Rejected')} disabled={reviewing}>
                <i className="bi bi-x-circle me-1"></i>Reject
              </button>
              <button className="btn btn-success btn-sm" onClick={() => handleReview('Approved')} disabled={reviewing}>
                {reviewing && <span className="spinner-border spinner-border-sm me-1"></span>}
                <i className="bi bi-check-circle me-1"></i>Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceMonitoring;
