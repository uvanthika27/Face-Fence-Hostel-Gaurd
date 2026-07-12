import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const Reports = () => {
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    block: '',
    sessionId: '',
  });
  const [sessions, setSessions] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load sessions when date changes
  useEffect(() => {
    if (!filters.date) { setSessions([]); return; }
    API.get('/sessions', { params: { date: filters.date } })
      .then(({ data }) => setSessions(data.sessions))
      .catch(() => setSessions([]));
  }, [filters.date]);

  const set = (field, value) => setFilters((f) => ({ ...f, [field]: value }));

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date)      params.date      = filters.date;
      if (filters.block)     params.block     = filters.block;
      if (filters.sessionId) params.sessionId = filters.sessionId;
      const { data } = await API.get('/attendance/export', { params });
      setReport(data.report);
      toast.success(`${data.report.length} records loaded`);
    } catch { toast.error('Failed to fetch report'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!report?.length) return toast.error('No data to export');
    const csv = [
      Object.keys(report[0]).join(','),
      ...report.map((r) => Object.values(r).map((v) => `"${v}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance_${filters.date || 'report'}.csv`;
    a.click();
  };

  const exportExcel = () => {
    if (!report?.length) return toast.error('No data to export');
    const ws = XLSX.utils.json_to_sheet(report);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${filters.date || 'report'}.xlsx`);
  };

  const exportPDF = () => {
    if (!report?.length) return toast.error('No data to export');
    const doc = new jsPDF();
    doc.setFontSize(13);
    doc.text(`Attendance Report — ${filters.date || ''}`, 14, 16);
    autoTable(doc, {
      startY: 24,
      head: [Object.keys(report[0])],
      body: report.map((r) => Object.values(r)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 110, 253] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    doc.save(`attendance_${filters.date || 'report'}.pdf`);
  };

  const statusColor = (v) => {
    if (v === 'Present') return 'bg-success';
    if (v === 'Late') return 'bg-warning text-dark';
    if (v === 'Suspicious') return 'bg-danger';
    return 'bg-secondary';
  };

  return (
    <div className="p-3 p-lg-4">
      <h5 className="fw-bold mb-4">Attendance Reports</h5>

      {/* Filter card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold mb-1">Date</label>
              <input type="date" className="form-control form-control-sm" value={filters.date}
                onChange={(e) => { set('date', e.target.value); set('sessionId', ''); }} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label small fw-semibold mb-1">Session</label>
              <select className="form-select form-select-sm" value={filters.sessionId}
                onChange={(e) => set('sessionId', e.target.value)}>
                <option value="">All Sessions</option>
                {sessions.map((s) => (
                  <option key={s._id} value={s._id}>{s.sessionName} ({s.startTime})</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-md-2">
              <label className="form-label small fw-semibold mb-1">Block</label>
              <input className="form-control form-control-sm" placeholder="e.g. A"
                value={filters.block}
                onChange={(e) => set('block', e.target.value.toUpperCase())} />
            </div>
            <div className="col-6 col-md-4 d-flex gap-2 align-items-end">
              <button className="btn btn-primary btn-sm flex-grow-1" onClick={fetchReport} disabled={loading}>
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-1"></span>Loading...</>
                  : <><i className="bi bi-search me-1"></i>Generate Report</>}
              </button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => {
                setFilters({ date: new Date().toISOString().split('T')[0], block: '', sessionId: '' });
                setReport(null);
              }}>
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {report && (
        <>
          <div className="d-flex gap-2 mb-3 flex-wrap align-items-center">
            <button className="btn btn-sm btn-outline-success" onClick={exportCSV}>
              <i className="bi bi-filetype-csv me-1"></i>CSV
            </button>
            <button className="btn btn-sm btn-outline-primary" onClick={exportExcel}>
              <i className="bi bi-file-earmark-excel me-1"></i>Excel
            </button>
            <button className="btn btn-sm btn-outline-danger" onClick={exportPDF}>
              <i className="bi bi-file-earmark-pdf me-1"></i>PDF
            </button>
            <span className="ms-auto text-muted small">
              {report.length} students &nbsp;|&nbsp;
              Present: {report.filter((r) => r.Status === 'Present').length} &nbsp;|&nbsp;
              Absent: {report.filter((r) => r.Status === 'Absent').length} &nbsp;|&nbsp;
              Late: {report.filter((r) => r.Status === 'Late').length}
            </span>
          </div>

          {loading ? <LoadingSpinner /> : (
            <div className="card border-0 shadow-sm">
              <div className="table-responsive">
                <table className="table table-sm table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      {report.length > 0 && Object.keys(report[0]).map((k) => <th key={k}>{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {report.map((row, i) => (
                      <tr key={i}>
                        {Object.entries(row).map(([k, v]) => (
                          <td key={k}>
                            {k === 'Status'
                              ? <span className={`badge ${statusColor(v)}`}>{v}</span>
                              : v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!report && !loading && (
        <div className="text-center text-muted py-5">
          <i className="bi bi-bar-chart-line fs-1 d-block mb-2"></i>
          Select filters and click <strong>Generate Report</strong>
        </div>
      )}
    </div>
  );
};

export default Reports;
