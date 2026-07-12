const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema(
  {
    sessionName: {
      type: String,
      required: [true, 'Session name is required'],
      trim: true,
    },
    date: {
      type: String, // stored as YYYY-MM-DD string for easy filtering
      required: [true, 'Date is required'],
    },
    startTime: {
      type: String, // stored as HH:MM (24h)
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // stored as HH:MM (24h)
      required: [true, 'End time is required'],
    },
    latitude: {
      type: Number,
      required: [true, 'Hostel latitude is required'],
    },
    longitude: {
      type: Number,
      required: [true, 'Hostel longitude is required'],
    },
    radius: {
      type: Number, // meters
      required: [true, 'Allowed radius is required'],
      min: [10, 'Radius must be at least 10 meters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index for fast daily lookups
attendanceSessionSchema.index({ date: 1, isActive: 1 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
