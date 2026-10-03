const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createSession,
  getSessions,
  getSession,
  deleteSession,
  sendMessage,
} = require('../controllers/chatController');

router.use(protect);

router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.get('/sessions/:id', getSession);
router.delete('/sessions/:id', deleteSession);
router.post('/:sessionId/message', sendMessage);

module.exports = router;
