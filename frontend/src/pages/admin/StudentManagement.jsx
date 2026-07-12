import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const EMPTY_FORM = { fullName: '', registerNumber: '', block: '', roomNumber: '', username: '', password: '' };

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetId, setResetId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/students', { params: { search } });
      setStudents(data.students);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setPhoto(null); };
  const openEdit = (s) => {
    setEditId(s._id);
    setForm({ fullName: s.fullName, registerNumber: s.registerNumber, block: s.block, roomNumber: s.roomNumber, username: s.username, password: '' });
    setPhoto(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (photo) fd.append('profilePhoto', photo);
      if (editId) await API.put(`/students/${editId}`, fd);
      else await API.post('/students', fd);
      toast.success(editId ? 'Student updated' : 'Student created');
      fetchStudents();
      document.getElementById('studentModalClose').click();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student permanently?')) return;
    try { await API.delete(`/students/${id}`); toast.success('Deleted'); fetchStudents(); }
    catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleToggle = async (id) => {
    try { const { data } = await API.patch(`/students/${id}/toggle-status`); toast.success(data.message); fetchStudents(); }
    catch { toast.error('Failed to toggle status'); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await API.patch(`/students/${resetId}/reset-password`, { newPassword });
      toast.success('Password reset. Student must change on next login.');
      setResetId(null); setNewPassword('');
      document.getElementById('resetModalClose').click();
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed'); }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) return toast.error('Select a file first');
    setBulkLoading(true);
    const fd = new FormData();
    fd.append('file', bulkFile);
    try {
      const { data } = await API.post('/students/bulk-upload', fd);
      toast.success(`Created: ${data.results.created}, Skipped: ${data.results.skipped}`);
      fetchStudents();
      document.getElementById('bulkModalClose').click();
    } catch (err) { toast.error(err.response?.data?.message || 'Bulk upload failed'); }
    finally { setBulkLoading(false); }
  };

  return (
    <div className="p-3 p-lg-4">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-4">
        <h5 className="fw-bold mb-0">Student Management</h5>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" data-bs-toggle="modal" data-bs-target="#bulkModal">
            <i className="bi bi-upload me-1"></i>Bulk Upload
          </button>
          <button className="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#studentModal" onClick={openAdd}>
            <i className="bi bi-plus-lg me-1"></i>Add Student
          </button>
        </div>
      </div>

      <div className="mb-3">
        <input className="form-control" placeholder="Search by name, register number, or username..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Reg. No</th>
                  <th>Block / Room</th>
                  <th>Username</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No students found</td></tr>
                )}
                {students.map((s, i) => (
                  <tr key={s._id}>
                    <td>{i + 1}</td>
                    <td>
                      {s.profilePhoto
                        ? <img src={`/${s.profilePhoto}`} alt="" className="rounded-circle" style={{ width: 36, height: 36, objectFit: 'cover' }} />
                        : <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center text-white"
                            style={{ width: 36, height: 36, fontSize: 14 }}>
                            {s.fullName?.charAt(0)}
                          </div>}
                    </td>
                    <td className="fw-semibold">{s.fullName}</td>
                    <td><code>{s.registerNumber}</code></td>
                    <td>{s.block} / {s.roomNumber}</td>
                    <td>{s.username}</td>
                    <td>
                      <span className={`badge ${s.isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-primary" title="Edit"
                          data-bs-toggle="modal" data-bs-target="#studentModal" onClick={() => openEdit(s)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-warning" title="Reset Password"
                          data-bs-toggle="modal" data-bs-target="#resetModal"
                          onClick={() => { setResetId(s._id); setNewPassword(''); }}>
                          <i className="bi bi-key"></i>
                        </button>
                        <button className={`btn btn-sm ${s.isActive ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                          title={s.isActive ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(s._id)}>
                          <i className={`bi ${s.isActive ? 'bi-toggle-on' : 'bi-toggle-off'}`}></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" title="Delete" onClick={() => handleDelete(s._id)}>
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

      {/* Add/Edit Modal */}
      <div className="modal fade" id="studentModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title fw-bold">{editId ? 'Edit Student' : 'Add Student'}</h6>
              <button type="button" className="btn-close" id="studentModalClose" data-bs-dismiss="modal"></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body row g-3">
                {[['fullName','Full Name','text'], ['registerNumber','Register Number','text'], ['block','Block','text'], ['roomNumber','Room Number','text'], ['username','Username','text']].map(([field, label, type]) => (
                  <div className="col-6" key={field}>
                    <label className="form-label small fw-semibold">{label}</label>
                    <input type={type} className="form-control form-control-sm"
                      value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      required={field !== 'username' || !editId}
                      disabled={field === 'username' && !!editId} />
                  </div>
                ))}
                {!editId && (
                  <div className="col-6">
                    <label className="form-label small fw-semibold">Password</label>
                    <input type="password" className="form-control form-control-sm" minLength={6}
                      value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  </div>
                )}
                <div className="col-12">
                  <label className="form-label small fw-semibold">Profile Photo</label>
                  <input type="file" className="form-control form-control-sm" accept="image/*"
                    onChange={(e) => setPhoto(e.target.files[0])} />
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

      {/* Reset Password Modal */}
      <div className="modal fade" id="resetModal" tabIndex="-1">
        <div className="modal-dialog modal-sm">
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title fw-bold">Reset Password</h6>
              <button type="button" className="btn-close" id="resetModalClose" data-bs-dismiss="modal"></button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <label className="form-label small fw-semibold">New Password</label>
                <input type="password" className="form-control form-control-sm" minLength={6}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-warning btn-sm">Reset</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      <div className="modal fade" id="bulkModal" tabIndex="-1">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h6 className="modal-title fw-bold">Bulk Upload Students</h6>
              <button type="button" className="btn-close" id="bulkModalClose" data-bs-dismiss="modal"></button>
            </div>
            <form onSubmit={handleBulkUpload}>
              <div className="modal-body">
                <div className="alert alert-info small">
                  <strong>CSV/Excel format:</strong><br />
                  <code>RegisterNo, Name, Block, Room</code><br />
                  Default password = Register Number. Student must change on first login.
                </div>
                <input type="file" className="form-control" accept=".csv,.xlsx,.xls"
                  onChange={(e) => setBulkFile(e.target.files[0])} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={bulkLoading}>
                  {bulkLoading && <span className="spinner-border spinner-border-sm me-1"></span>}
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;
