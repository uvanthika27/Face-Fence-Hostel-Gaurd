const router = require('express').Router();
const {
  getSessions, getActiveSession, createSession,
  updateSession, deleteSession, toggleSession,
} = require('../controllers/sessionController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/active', protect, getActiveSession);          // students need this

router.use(protect, adminOnly);
router.get('/', getSessions);
router.post('/', createSession);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);
router.patch('/:id/toggle', toggleSession);

module.exports = router;
