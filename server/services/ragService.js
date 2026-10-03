/**
 * ragService.js
 *
 * Orchestrates the full RAG (Retrieval-Augmented Generation) pipeline:
 *
 * 1. Document Ingestion:
 *    PDF → Text Extraction → Chunking → Embeddings → MongoDB
 *
 * 2. Question Answering:
 *    Question → Query Rewriting → Embedding → Vector Search → Context → LLM → Answer + Sources
 *
 * Deliberately built without LangChain so every step is transparent.
 */
const DocumentChunk = require('../models/DocumentChunk');
const { extractTextFromPDF } = require('./pdfService');
const { chunkText } = require('../utils/chunkText');
const { embedText, embedBatch } = require('./embeddingService');

/**
 * Ingest a PDF into the RAG pipeline.
 *
 * @param {Buffer}   pdfBuffer    - Raw PDF file buffer
 * @param {string}   userId       - Owner's user ID (for isolation)
 * @param {string}   documentId   - MongoDB document _id
 * @param {string}   documentName - Original filename
 * @returns {{ totalChunks: number, totalPages: number }}
 */
async function ingestDocument(pdfBuffer, userId, documentId, documentName) {
  // Step 1: Extract text from PDF
  const { text, totalPages } = await extractTextFromPDF(pdfBuffer);

  // Step 2: Split text into overlapping chunks
  const rawChunks = chunkText(text);

  if (rawChunks.length === 0) {
    throw new Error('No text chunks could be created from this document.');
  }

  // Step 3: Generate embeddings for all chunks in batches
  const chunkTexts = rawChunks.map((c) => c.text);
  const embeddings = await embedBatch(chunkTexts);

  // Step 4: Build DocumentChunk documents for MongoDB
  const chunkDocs = rawChunks.map((chunk, i) => ({
    userId,
    documentId,
    documentName,
    pageNumber: estimatePageNumber(chunk.text, text, totalPages),
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    embedding: embeddings[i],
  }));

  // Step 5: Bulk insert into MongoDB
  await DocumentChunk.insertMany(chunkDocs);

  return {
    totalChunks: chunkDocs.length,
    totalPages,
  };
}

/**
 * Estimate which page a chunk came from based on character position.
 * Simple heuristic: proportional position in the full text.
 */
function estimatePageNumber(chunkText, fullText, totalPages) {
  if (totalPages <= 1) return 1;
  const position = fullText.indexOf(chunkText.slice(0, 50));
  if (position === -1) return 1;
  return Math.max(1, Math.ceil((position / fullText.length) * totalPages));
}

/**
 * Perform vector search in MongoDB Atlas.
 *
 * Uses $vectorSearch aggregation pipeline to find the TOP_K most semantically
 * similar chunks to the query embedding, filtered by userId for isolation.
 *
 * @param {number[]} queryEmbedding - Embedded query vector
 * @param {string}   userId         - Filter results to this user only
 * @param {number}   topK           - Number of results to retrieve
 * @returns {Promise<DocumentChunk[]>}
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

async function vectorSearch(queryEmbedding, userId, topK = parseInt(process.env.TOP_K) || 5) {
  try {
    const results = await DocumentChunk.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: topK * 10,
          limit: topK * 2,
          filter: { userId: { $eq: userId } },
        },
      },
      {
        $match: { userId: userId },
      },
      {
        $limit: topK,
      },
      {
        $project: {
          text: 1,
          documentId: 1,
          documentName: 1,
          pageNumber: 1,
          chunkIndex: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);

    if (results && results.length > 0) {
      return results;
    }
  } catch (err) {
    console.warn('⚠️ Atlas Vector Search index not available, using in-memory cosine similarity fallback:', err.message);
  }

  // Fallback: in-memory cosine similarity for user's chunks
  const chunks = await DocumentChunk.find({ userId }).lean();
  if (!chunks || chunks.length === 0) return [];

  const scored = chunks.map((chunk) => ({
    text: chunk.text,
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    pageNumber: chunk.pageNumber,
    chunkIndex: chunk.chunkIndex,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Delete all chunks for a document (used when deleting a document).
 */
async function deleteDocumentChunks(documentId) {
  await DocumentChunk.deleteMany({ documentId });
}

module.exports = { ingestDocument, vectorSearch, deleteDocumentChunks };
