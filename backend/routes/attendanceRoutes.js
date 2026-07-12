const router = require('express').Router();
const {
  markAttendance, myHistory, getMonitoring,
  getDashboardStats, reviewRecord, getExportData,
} = require('../controllers/attendanceController');
const { protect, adminOnly, studentOnly } = require('../middleware/authMiddleware');
const { uploadSelfie } = require('../middleware/uploadMiddleware');

router.use(protect);

// Student routes
router.post('/mark', studentOnly, uploadSelfie.single('selfie'), markAttendance);
router.get('/my-history', studentOnly, myHistory);

// Admin routes
router.get('/dashboard-stats', adminOnly, getDashboardStats);
router.get('/monitoring', adminOnly, getMonitoring);
router.get('/export', adminOnly, getExportData);
router.patch('/:id/review', adminOnly, reviewRecord);

module.exports = router;
