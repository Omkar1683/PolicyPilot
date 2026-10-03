const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    // Source chunks used by the AI to generate the answer
    sources: [
      {
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        documentName: String,
        pageNumber: Number,
        chunkIndex: Number,
        // Short excerpt from the chunk for UI display
        excerpt: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
