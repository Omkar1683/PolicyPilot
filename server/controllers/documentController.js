/**
 * documentController.js
 *
 * Handles PDF upload, processing, listing and deletion.
 * Uses Multer for multipart file handling.
 * Triggers the RAG ingestion pipeline asynchronously after upload.
 */
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const { ingestDocument } = require('../services/ragService');
const { deleteDocumentChunks } = require('../services/ragService');

/**
 * @route  POST /api/documents/upload
 * @desc   Upload a PDF and trigger ingestion pipeline
 * @access Private
 */
const uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const { originalname, buffer, mimetype, size } = req.file;

  if (mimetype !== 'application/pdf') {
    return res.status(400).json({ success: false, message: 'Only PDF files are accepted' });
  }

  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10485760; // 10MB
  if (size > maxSize) {
    return res.status(400).json({
      success: false,
      message: `File too large. Maximum allowed size is ${Math.round(maxSize / 1024 / 1024)}MB`,
    });
  }

  // Create the document record with 'processing' status
  const doc = await Document.create({
    userId: req.user._id,
    originalName: originalname,
    fileSize: size,
    status: 'processing',
  });

  try {
    const { totalChunks, totalPages } = await ingestDocument(
      buffer,
      req.user._id,
      doc._id,
      originalname
    );

    const updatedDoc = await Document.findByIdAndUpdate(
      doc._id,
      {
        status: 'ready',
        totalChunks,
        totalPages,
      },
      { new: true }
    );

    console.log(`✅ Ingested "${originalname}": ${totalChunks} chunks, ${totalPages} pages`);

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and indexed successfully',
      document: {
        id: updatedDoc._id,
        originalName: updatedDoc.originalName,
        fileSize: updatedDoc.fileSize,
        status: updatedDoc.status,
        totalChunks: updatedDoc.totalChunks,
        totalPages: updatedDoc.totalPages,
        createdAt: updatedDoc.createdAt,
      },
    });
  } catch (error) {
    console.error(`❌ Ingestion failed for "${originalname}":`, error.message);
    await Document.findByIdAndUpdate(doc._id, {
      status: 'failed',
      errorMessage: error.message,
    });
    return res.status(500).json({
      success: false,
      message: `Document processing failed: ${error.message}`,
    });
  }
};

/**
 * @route  GET /api/documents
 * @desc   List all documents for the authenticated user
 * @access Private
 */
const getDocuments = async (req, res) => {
  const documents = await Document.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .select('-__v');

  res.json({
    success: true,
    count: documents.length,
    documents,
  });
};

/**
 * @route  GET /api/documents/:id
 * @desc   Get a single document by ID
 * @access Private
 */
const getDocument = async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });

  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  res.json({ success: true, document: doc });
};

/**
 * @route  DELETE /api/documents/:id
 * @desc   Delete a document and all its chunks
 * @access Private
 */
const deleteDocument = async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });

  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  // Delete all associated embedding chunks
  await deleteDocumentChunks(doc._id);

  // Delete the document record
  await Document.deleteOne({ _id: doc._id });

  res.json({ success: true, message: 'Document and all associated data deleted successfully' });
};

module.exports = { uploadDocument, getDocuments, getDocument, deleteDocument };
