const path = require('path');
const fs = require('fs');
const { getDistance } = require('geolib');
const xlsx = require('xlsx');
const AttendanceRecord = require('../models/AttendanceRecord');
const AttendanceSession = require('../models/AttendanceSession');
const User = require('../models/User');

// ─── Helpers ────────────────────────────────────────────────────────────────

const isLate = (session, timestamp) => {
  const [endH, endM] = session.endTime.split(':').map(Number);
  const end = new Date(timestamp);
  end.setHours(endH, endM, 0, 0);
  return timestamp > end;
};

// ─── POST /api/attendance/mark ───────────────────────────────────────────────
// Body: { sessionId, latitude, longitude, matchScore, selfieBase64 }
const markAttendance = async (req, res) => {
  const { sessionId, latitude, longitude, matchScore } = req.body;

  if (!sessionId || latitude == null || longitude == null || matchScore == null)
    return res.status(400).json({ success: false, message: 'sessionId, latitude, longitude, matchScore are required' });

  // 1. Load session
  const session = await AttendanceSession.findById(sessionId);
  if (!session || !session.isActive)
    return res.status(404).json({ success: false, message: 'Session not found or inactive' });

  // 2. Geofence check
  const distanceMeters = getDistance(
    { latitude: Number(latitude), longitude: Number(longitude) },
    { latitude: session.latitude, longitude: session.longitude }
  );
  if (distanceMeters > session.radius)
    return res.status(403).json({ success: false, message: `You are outside the hostel boundary (${distanceMeters}m away, limit ${session.radius}m)` });

  // 3. Duplicate check
  const existing = await AttendanceRecord.findOne({ studentId: req.user._id, sessionId });
  if (existing)
    return res.status(409).json({ success: false, message: 'Attendance already marked for this session' });

  // 4. Determine status
  const now = new Date();
  const score = Number(matchScore);
  let status;

  // Logic aligned with Frontend Dynamic Thresholding
  if (score >= 75) {
    status = isLate(session, now) ? 'Late' : 'Present';
  } else if (score >= 60) {
    status = 'Suspicious';
  } else {
    return res.status(403).json({ success: false, message: 'Recognition confidence too low. Ensure proper lighting and try again.' });
  }

  // 5. Save selfie image if uploaded via multipart
  let selfieImage = null;
  if (req.file) selfieImage = `uploads/selfies/${req.file.filename}`;

  const record = await AttendanceRecord.create({
    studentId: req.user._id,
    sessionId,
    latitude: Number(latitude),
    longitude: Number(longitude),
    matchScore: score,
    status,
    selfieImage,
    timestamp: now,
  });

  const messages = {
    Present: 'Attendance marked successfully!',
    Late: 'Attendance marked as Late.',
    Suspicious: 'Face match score too low. Your attendance is queued for admin review.',
  };

  res.status(201).json({ success: true, message: messages[status], status, record });
};

// ─── GET /api/attendance/my-history ─────────────────────────────────────────
const myHistory = async (req, res) => {
  const records = await AttendanceRecord.find({ studentId: req.user._id })
    .populate('sessionId', 'sessionName date startTime endTime')
    .sort({ timestamp: -1 })
    .limit(60);

  const summary = {
    total: records.length,
    present: records.filter((r) => r.status === 'Present').length,
    late: records.filter((r) => r.status === 'Late').length,
    absent: records.filter((r) => r.status === 'Absent').length,
    suspicious: records.filter((r) => r.status === 'Suspicious').length,
  };
  summary.percentage = summary.total ? Math.round(((summary.present + summary.late) / summary.total) * 100) : 0;

  res.json({ success: true, summary, records });
};

// ─── GET /api/attendance/monitoring ─────────────────────────────────────────
const getMonitoring = async (req, res) => {
  const { sessionId, date, block, room, status } = req.query;

  // 1. Get matching students
  const studentFilter = { role: 'student', isActive: true };
  if (block) studentFilter.block = block.toUpperCase();
  if (room) studentFilter.roomNumber = room;
  const students = await User.find(studentFilter).select('_id fullName registerNumber block roomNumber');
  const studentIds = students.map((s) => s._id);

  // 2. Build session scope
  let sessionIds = [];
  if (sessionId) {
    sessionIds = [sessionId];
  } else if (date) {
    const sessions = await AttendanceSession.find({ date }).select('_id');
    sessionIds = sessions.map((s) => s._id);
  }

  // 3. Fetch records scoped to these students + sessions
  const recordFilter = { studentId: { $in: studentIds } };
  if (sessionIds.length) recordFilter.sessionId = { $in: sessionIds };
  // Only filter by status in DB for Present/Late/Suspicious — Absent is derived
  if (status && status !== 'Absent') recordFilter.status = status;

  const records = await AttendanceRecord.find(recordFilter)
    .populate('sessionId', 'sessionName date startTime endTime')
    .sort({ timestamp: -1 });

  // 4. Map latest record per student
  const recordMap = {};
  records.forEach((r) => {
    const sid = r.studentId.toString();
    if (!recordMap[sid]) recordMap[sid] = r; // already sorted by latest
  });

  // 5. Build result — derive Absent for students with no record
  let result = students.map((s) => {
    const rec = recordMap[s._id.toString()] || null;
    const st = rec?.status || 'Absent';
    return { student: s, record: rec, status: st };
  });

  // 6. Apply Absent filter client-side (since Absent rows have no DB record)
  if (status) result = result.filter((r) => r.status === status);

  res.json({ success: true, total: result.length, data: result });
};

// ─── GET /api/attendance/dashboard-stats ────────────────────────────────────
const getDashboardStats = async (req, res) => {
  const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
  const totalSessions = await AttendanceSession.countDocuments();

  // Find the most recent session that actually has attendance records
  // Fall back to today's sessions if no records exist anywhere yet
  const today = new Date().toISOString().split('T')[0];

  // Get the latest record to find which session is most recent
  const latestRecord = await AttendanceRecord.findOne()
    .sort({ timestamp: -1 })
    .select('sessionId');

  let activeSessionIds = [];
  let sessionLabel = 'Today';
  let sessionDate = today;

  if (latestRecord) {
    // Use the session of the latest record
    const latestSession = await AttendanceSession.findById(latestRecord.sessionId).select('date sessionName');
    if (latestSession) {
      sessionDate = latestSession.date;
      sessionLabel = `${latestSession.sessionName} (${latestSession.date})`;
      // Get all sessions for that date so multi-session days work too
      const sessionsOnDate = await AttendanceSession.find({ date: latestSession.date }).select('_id');
      activeSessionIds = sessionsOnDate.map((s) => s._id);
    }
  } else {
    // No records at all — use today's sessions
    const todaySessions = await AttendanceSession.find({ date: today }).select('_id');
    activeSessionIds = todaySessions.map((s) => s._id);
  }

  const sessionRecords = activeSessionIds.length
    ? await AttendanceRecord.find({ sessionId: { $in: activeSessionIds } }).select('status')
    : [];

  const counts = { Present: 0, Late: 0, Absent: 0, Suspicious: 0 };
  sessionRecords.forEach((r) => counts[r.status]++);

  // Absent = students who have no record in this session scope
  counts.Absent = Math.max(0, totalStudents - sessionRecords.length);

  // Only show Absent count if there was actually a session (don't show all as absent on blank state)
  const hasSession = activeSessionIds.length > 0;

  res.json({
    success: true,
    stats: {
      totalStudents,
      totalSessions,
      sessionLabel,
      sessionDate,
      hasSession,
      today: hasSession ? counts : { Present: 0, Late: 0, Absent: 0, Suspicious: 0 },
    },
  });
};

// ─── PATCH /api/attendance/:id/review ───────────────────────────────────────
const reviewRecord = async (req, res) => {
  const { reviewStatus, reviewNote } = req.body;
  if (!['Approved', 'Rejected'].includes(reviewStatus))
    return res.status(400).json({ success: false, message: 'reviewStatus must be Approved or Rejected' });

  // Approved → mark Present, Rejected → delete the record so student can try again
  if (reviewStatus === 'Rejected') {
    await AttendanceRecord.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Record rejected. Student can mark attendance again.' });
  }

  await AttendanceRecord.findByIdAndUpdate(req.params.id, { status: 'Present', reviewNote });
  res.json({ success: true, message: 'Record approved and marked as Present.' });
};

// ─── GET /api/attendance/export ─────────────────────────────────────────────
const getExportData = async (req, res) => {
  const records = await AttendanceRecord.find()
    .populate('studentId', 'fullName registerNumber block roomNumber')
    .populate('sessionId', 'sessionName date')
    .sort({ timestamp: -1 });

  const data = records.map((r) => ({
    Date: r.sessionId?.date || 'N/A',
    Session: r.sessionId?.sessionName || 'N/A',
    Name: r.studentId?.fullName || 'Unknown',
    RegNo: r.studentId?.registerNumber || 'N/A',
    Block: r.studentId?.block || 'N/A',
    Room: r.studentId?.roomNumber || 'N/A',
    Status: r.status,
    Time: new Date(r.timestamp).toLocaleTimeString(),
    MatchScore: r.matchScore ? `${r.matchScore}%` : '0%',
  }));

  res.json({ success: true, data });
};

module.exports = { markAttendance, myHistory, getMonitoring, getDashboardStats, reviewRecord, getExportData };