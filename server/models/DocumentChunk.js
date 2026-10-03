const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    pageNumber: {
      type: Number,
      default: 1,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    // 1536-dim vector for text-embedding-3-small
    embedding: {
      type: [Number],
      required: true,
    },
  },
  { timestamps: true }
);

// Index for userId-based filtering — critical for user isolation in vector search
documentChunkSchema.index({ userId: 1, documentId: 1 });

module.exports = mongoose.model('DocumentChunk', documentChunkSchema);
