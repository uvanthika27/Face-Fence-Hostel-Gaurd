const router = require('express').Router();
const { login, changePassword, getMe, saveFaceDescriptor, resetFaceDescriptor } = require('../controllers/authController');
const { protect, studentOnly } = require('../middleware/authMiddleware');

router.post('/login', login);
router.put('/change-password', protect, changePassword);
router.get('/me', protect, getMe);
router.post('/save-face-descriptor', protect, studentOnly, saveFaceDescriptor);
router.post('/reset-face', protect, studentOnly, resetFaceDescriptor);

module.exports = router;
