const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const protect = authMiddleware.protect || authMiddleware.default?.protect || authMiddleware;
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

router.default = router;
module.exports = router;
module.exports.default = router;
