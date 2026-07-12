const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const User = require('../models/User');

// GET /api/students
const getStudents = async (req, res) => {
  const { block, room, search, page = 1, limit = 20 } = req.query;
  const filter = { role: 'student' };
  if (block) filter.block = block.toUpperCase();
  if (room) filter.roomNumber = room;
  if (search) filter.$or = [
    { fullName: { $regex: search, $options: 'i' } },
    { registerNumber: { $regex: search, $options: 'i' } },
    { username: { $regex: search, $options: 'i' } },
  ];

  const total = await User.countDocuments(filter);
  const students = await User.find(filter)
    .select('-password')
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  res.json({ success: true, total, page: Number(page), students });
};

// GET /api/students/:id
const getStudent = async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student' }).select('-password');
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  res.json({ success: true, student });
};

// POST /api/students
const createStudent = async (req, res) => {
  const { fullName, registerNumber, block, roomNumber, username, password } = req.body;
  if (!fullName || !registerNumber || !block || !roomNumber || !username || !password)
    return res.status(400).json({ success: false, message: 'All fields are required' });

  const exists = await User.findOne({ $or: [{ username: username.toLowerCase() }, { registerNumber: registerNumber.toUpperCase() }] });
  if (exists) return res.status(409).json({ success: false, message: 'Username or Register Number already exists' });

  const profilePhoto = req.file ? `uploads/profiles/${req.file.filename}` : null;

  const student = await User.create({
    fullName, registerNumber: registerNumber.toUpperCase(),
    block: block.toUpperCase(), roomNumber, username: username.toLowerCase(),
    password, profilePhoto, role: 'student', mustChangePassword: true,
  });

  res.status(201).json({ success: true, message: 'Student created', student: { ...student.toObject(), password: undefined } });
};

// PUT /api/students/:id
const updateStudent = async (req, res) => {
  const { fullName, block, roomNumber, registerNumber } = req.body;
  const student = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  if (fullName) student.fullName = fullName;
  if (block) student.block = block.toUpperCase();
  if (roomNumber) student.roomNumber = roomNumber;
  if (registerNumber) student.registerNumber = registerNumber.toUpperCase();
  if (req.file) {
    // Remove old photo
    if (student.profilePhoto) fs.unlink(path.join(__dirname, '..', student.profilePhoto), () => {});
    student.profilePhoto = `uploads/profiles/${req.file.filename}`;
  }

  await student.save();
  res.json({ success: true, message: 'Student updated', student: { ...student.toObject(), password: undefined } });
};

// DELETE /api/students/:id
const deleteStudent = async (req, res) => {
  const student = await User.findOneAndDelete({ _id: req.params.id, role: 'student' });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  if (student.profilePhoto) fs.unlink(path.join(__dirname, '..', student.profilePhoto), () => {});
  res.json({ success: true, message: 'Student deleted' });
};

// PATCH /api/students/:id/toggle-status
const toggleStatus = async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  student.isActive = !student.isActive;
  await student.save();
  res.json({ success: true, message: `Student ${student.isActive ? 'activated' : 'deactivated'}`, isActive: student.isActive });
};

// PATCH /api/students/:id/reset-password
const resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const student = await User.findOne({ _id: req.params.id, role: 'student' });
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  student.password = newPassword;
  student.mustChangePassword = true;
  await student.save();
  res.json({ success: true, message: 'Password reset. Student must change on next login.' });
};

// POST /api/students/bulk-upload
const bulkUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  if (!rows.length) return res.status(400).json({ success: false, message: 'File is empty' });

  const results = { created: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    try {
      const registerNumber = String(row.RegisterNo || row.registerNumber || '').trim().toUpperCase();
      const fullName = String(row.Name || row.fullName || '').trim();
      const block = String(row.Block || row.block || '').trim().toUpperCase();
      const roomNumber = String(row.Room || row.roomNumber || '').trim();

      if (!registerNumber || !fullName || !block || !roomNumber) {
        results.errors.push({ row: registerNumber || 'unknown', error: 'Missing required fields' });
        continue;
      }

      const username = registerNumber.toLowerCase();
      const password = registerNumber; // default password = register number

      const exists = await User.findOne({ $or: [{ username }, { registerNumber }] });
      if (exists) { results.skipped++; continue; }

      await User.create({ fullName, registerNumber, block, roomNumber, username, password, role: 'student', mustChangePassword: true });
      results.created++;
    } catch (err) {
      results.errors.push({ row: row.RegisterNo || 'unknown', error: err.message });
    }
  }

  fs.unlink(req.file.path, () => {});
  res.json({ success: true, message: `Bulk upload complete`, results });
};

module.exports = { getStudents, getStudent, createStudent, updateStudent, deleteStudent, toggleStatus, resetPassword, bulkUpload };
