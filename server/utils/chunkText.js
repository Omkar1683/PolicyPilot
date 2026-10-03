/**
 * chunkText.js
 *
 * Splits long text into overlapping chunks suitable for embedding.
 *
 * Strategy:
 *  1. Split by paragraph boundaries first (double newline).
 *  2. If a paragraph is still > maxChunkSize, split by sentence.
 *  3. Accumulate chunks with overlap to preserve context across boundaries.
 *
 * This manual implementation is deliberate — it avoids LangChain and
 * helps you understand exactly how RAG chunking works at interview time.
 */

const CHUNK_SIZE = 800;    // characters per chunk
const CHUNK_OVERLAP = 150; // characters of overlap between consecutive chunks

/**
 * Split text into sentences (very simple — good enough for insurance docs).
 */
function splitIntoSentences(text) {
  return text.match(/[^.!?]+[.!?]+/g) || [text];
}

/**
 * Core chunking function.
 * Returns an array of { text, chunkIndex } objects.
 */
function chunkText(fullText, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  // Normalize whitespace
  const normalized = fullText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  // Split into paragraphs
  const paragraphs = normalized.split(/\n\n+/);

  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    // If adding this paragraph exceeds chunk size, flush the current chunk
    if (currentChunk.length + trimmedPara.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        chunkIndex: chunkIndex++,
      });

      // Keep the overlap portion of the previous chunk
      const words = currentChunk.split(' ');
      const overlapWords = [];
      let overlapLength = 0;
      for (let i = words.length - 1; i >= 0; i--) {
        overlapLength += words[i].length + 1;
        if (overlapLength > overlap) break;
        overlapWords.unshift(words[i]);
      }
      currentChunk = overlapWords.join(' ') + ' ';
    }

    // If a single paragraph is too long, split by sentence
    if (trimmedPara.length > chunkSize) {
      const sentences = splitIntoSentences(trimmedPara);
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            chunkIndex: chunkIndex++,
          });
          // Overlap
          const lastSentences = currentChunk.split('. ').slice(-2).join('. ');
          currentChunk = lastSentences.length < overlap ? lastSentences + ' ' : '';
        }
        currentChunk += sentence + ' ';
      }
    } else {
      currentChunk += trimmedPara + '\n\n';
    }
  }

  // Flush remaining text
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      chunkIndex: chunkIndex++,
    });
  }

  return chunks;
}

module.exports = { chunkText, CHUNK_SIZE, CHUNK_OVERLAP };
