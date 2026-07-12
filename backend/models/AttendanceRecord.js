const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: true,
    },
    selfieImage: {
      type: String, // relative path: uploads/selfies/<filename>
      default: null,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    matchScore: {
      type: Number, // 0–100
      min: 0,
      max: 100,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent', 'Suspicious'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Admin review fields for Suspicious records
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    reviewNote: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance for same student + session
attendanceRecordSchema.index(
  { studentId: 1, sessionId: 1 },
  { unique: true }
);

// Fast queries for monitoring dashboard
attendanceRecordSchema.index({ sessionId: 1, status: 1 });
attendanceRecordSchema.index({ studentId: 1, timestamp: -1 });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
