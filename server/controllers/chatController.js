/**
 * chatController.js
 *
 * Handles chat session management and the core RAG question-answering endpoint.
 *
 * The message endpoint streams the LLM response using SSE (Server-Sent Events)
 * so the user sees the answer token-by-token rather than waiting for completion.
 */
const ChatSession = require('../models/ChatSession');
const Message = require('../models/Message');
const { rewriteQuery, answerQuestion } = require('../services/queryService');

/**
 * @route  POST /api/chat/sessions
 * @desc   Create a new chat session
 * @access Private
 */
const createSession = async (req, res) => {
  const { title } = req.body;

  const session = await ChatSession.create({
    userId: req.user._id,
    title: title || 'New Chat',
  });

  res.status(201).json({ success: true, session });
};

/**
 * @route  GET /api/chat/sessions
 * @desc   List all chat sessions for the user
 * @access Private
 */
const getSessions = async (req, res) => {
  const sessions = await ChatSession.find({ userId: req.user._id })
    .sort({ updatedAt: -1 })
    .select('-__v');

  res.json({ success: true, sessions });
};

/**
 * @route  GET /api/chat/sessions/:id
 * @desc   Get a session with all its messages
 * @access Private
 */
const getSession = async (req, res) => {
  const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user._id });

  if (!session) {
    return res.status(404).json({ success: false, message: 'Chat session not found' });
  }

  const messages = await Message.find({ sessionId: session._id }).sort({ createdAt: 1 });

  res.json({ success: true, session, messages });
};

/**
 * @route  DELETE /api/chat/sessions/:id
 * @desc   Delete a chat session and all its messages
 * @access Private
 */
const deleteSession = async (req, res) => {
  const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user._id });

  if (!session) {
    return res.status(404).json({ success: false, message: 'Chat session not found' });
  }

  await Message.deleteMany({ sessionId: session._id });
  await ChatSession.deleteOne({ _id: session._id });

  res.json({ success: true, message: 'Session deleted' });
};

/**
 * @route  POST /api/chat/:sessionId/message
 * @desc   Send a message and get a streaming RAG-powered response
 * @access Private
 *
 * Uses SSE (Server-Sent Events) to stream the LLM answer token by token.
 * The response format is:
 *   data: {"type":"chunk","content":"Hello"}
 *   data: {"type":"done","sources":[...]}
 *   data: [DONE]
 */
const sendMessage = async (req, res) => {
  const { sessionId } = req.params;
  const { question } = req.body;

  if (!question || !question.trim()) {
    return res.status(400).json({ success: false, message: 'Question is required' });
  }

  // Verify session belongs to user
  const session = await ChatSession.findOne({ _id: sessionId, userId: req.user._id });
  if (!session) {
    return res.status(404).json({ success: false, message: 'Chat session not found' });
  }

  // Save the user message
  await Message.create({
    sessionId: session._id,
    role: 'user',
    content: question.trim(),
  });

  // Fetch conversation history for query rewriting and LLM context
  const previousMessages = await Message.find({ sessionId: session._id })
    .sort({ createdAt: 1 })
    .limit(20)
    .select('role content');

  const history = previousMessages.map((m) => ({ role: m.role, content: m.content }));

  // Rewrite query if there is prior conversation (handles follow-ups)
  const rewrittenQuestion = await rewriteQuery(question.trim(), history.slice(0, -1));

  // Set up SSE headers for streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { fullAnswer, sources } = await answerQuestion(
      rewrittenQuestion,
      req.user._id,
      history,
      (chunk) => sendEvent({ type: 'chunk', content: chunk })
    );

    // Save the AI response to the database
    await Message.create({
      sessionId: session._id,
      role: 'assistant',
      content: fullAnswer,
      sources,
    });

    // Update session timestamp and auto-generate title from first question
    const updateData = { updatedAt: new Date() };
    if (session.title === 'New Chat' && session.messageCount === 0) {
      updateData.title = question.trim().slice(0, 60) + (question.length > 60 ? '...' : '');
    }
    updateData.$inc = { messageCount: 1 };

    await ChatSession.findByIdAndUpdate(session._id, {
      updatedAt: new Date(),
      ...(session.title === 'New Chat' && {
        title: question.trim().slice(0, 60) + (question.length > 60 ? '...' : ''),
      }),
      $inc: { messageCount: 1 },
    });

    // Send sources and signal completion
    sendEvent({ type: 'done', sources });
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('❌ Chat error:', error.message);
    sendEvent({ type: 'error', message: error.message });
  } finally {
    res.end();
  }
};

module.exports = { createSession, getSessions, getSession, deleteSession, sendMessage };
