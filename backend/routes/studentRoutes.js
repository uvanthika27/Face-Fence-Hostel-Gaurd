const router = require('express').Router();
const {
  getStudents, getStudent, createStudent, updateStudent,
  deleteStudent, toggleStatus, resetPassword, bulkUpload,
} = require('../controllers/studentController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { uploadProfile, uploadCSV } = require('../middleware/uploadMiddleware');

router.use(protect, adminOnly);

router.get('/', getStudents);
router.get('/:id', getStudent);
router.post('/', uploadProfile.single('profilePhoto'), createStudent);
router.put('/:id', uploadProfile.single('profilePhoto'), updateStudent);
router.delete('/:id', deleteStudent);
router.patch('/:id/toggle-status', toggleStatus);
router.patch('/:id/reset-password', resetPassword);
router.post('/bulk-upload', uploadCSV.single('file'), bulkUpload);

module.exports = router;
