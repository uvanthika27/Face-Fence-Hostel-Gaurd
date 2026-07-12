const AttendanceSession = require('../models/AttendanceSession');

// GET /api/sessions
const getSessions = async (req, res) => {
  const { date } = req.query;
  const filter = {};
  if (date) filter.date = date;

  const sessions = await AttendanceSession.find(filter)
    .populate('createdBy', 'fullName username')
    .sort({ date: -1, startTime: -1 });

  res.json({ success: true, sessions });
};

// GET /api/sessions/active  — used by student to find today's open session
const getActiveSession = async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toTimeString().slice(0, 5); // HH:MM

  const session = await AttendanceSession.findOne({
    date: today,
    isActive: true,
    startTime: { $lte: now },
  }).sort({ startTime: -1 });

  if (!session) return res.status(404).json({ success: false, message: 'No active session found for today' });
  res.json({ success: true, session });
};

// POST /api/sessions
const createSession = async (req, res) => {
  const { sessionName, date, startTime, endTime, latitude, longitude, radius } = req.body;
  if (!sessionName || !date || !startTime || !endTime || latitude == null || longitude == null || !radius)
    return res.status(400).json({ success: false, message: 'All session fields are required' });

  const session = await AttendanceSession.create({
    sessionName, date, startTime, endTime,
    latitude: Number(latitude), longitude: Number(longitude),
    radius: Number(radius), createdBy: req.user._id,
  });

  res.status(201).json({ success: true, message: 'Session created', session });
};

// PUT /api/sessions/:id
const updateSession = async (req, res) => {
  const session = await AttendanceSession.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, message: 'Session updated', session });
};

// DELETE /api/sessions/:id
const deleteSession = async (req, res) => {
  const session = await AttendanceSession.findByIdAndDelete(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, message: 'Session deleted' });
};

// PATCH /api/sessions/:id/toggle
const toggleSession = async (req, res) => {
  const session = await AttendanceSession.findById(req.params.id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  session.isActive = !session.isActive;
  await session.save();
  res.json({ success: true, message: `Session ${session.isActive ? 'activated' : 'deactivated'}`, isActive: session.isActive });
};

module.exports = { getSessions, getActiveSession, createSession, updateSession, deleteSession, toggleSession };
