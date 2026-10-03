/**
 * embeddingService.js
 *
 * Generates vector embeddings for RAG pipeline.
 * Supports:
 * 1. Google Gemini (text-embedding-004 / embedding-001) - 100% Free
 * 2. OpenAI (text-embedding-3-small)
 * 3. Deterministic Feature-Hash Embedder (Graceful offline/rate-limit fallback)
 */
const OpenAI = require('openai');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder')
  ? process.env.OPENAI_API_KEY
  : null;

const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

/**
 * Fallback deterministic feature hashing embedding (dim: 768, unit-normalized)
 */
function createHashEmbedding(text, dimensions = 768) {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  
  if (words.length === 0) return vector;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;

    // Bigram hashing for local context
    if (i < words.length - 1) {
      const bi = word + '_' + words[i + 1];
      let biHash = 0;
      for (let c = 0; c < bi.length; c++) {
        biHash = (biHash << 5) - biHash + bi.charCodeAt(c);
        biHash |= 0;
      }
      const biIdx = Math.abs(biHash) % dimensions;
      vector[biIdx] += 1.5;
    }
  }

  // L2-normalize vector
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm;
    }
  }
  return vector;
}

/**
 * Request Gemini embedding via REST API
 */
async function callGeminiEmbedding(text) {
  const models = ['text-embedding-004', 'embedding-001'];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: text.replace(/\n/g, ' ') }] },
          }),
        }
      );
      const data = await res.json();
      if (data.embedding?.values) {
        return data.embedding.values;
      }
    } catch {
      // try next model
    }
  }
  throw new Error('Gemini embedding failed');
}

/**
 * Get embedding for a single text string.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function embedText(text) {
  // 1. Try Gemini
  if (GEMINI_KEY) {
    try {
      return await callGeminiEmbedding(text);
    } catch (err) {
      console.warn('⚠️ Gemini embed failed, using hash embed fallback:', err.message);
    }
  }

  // 2. Try OpenAI
  if (openai) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.replace(/\n/g, ' '),
      });
      return response.data[0].embedding;
    } catch (err) {
      console.warn('⚠️ OpenAI embed failed, using hash embed fallback:', err.message);
    }
  }

  // 3. Fallback
  return createHashEmbedding(text);
}

/**
 * Embed an array of text strings in batches.
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
async function embedBatch(texts) {
  const results = [];
  for (const text of texts) {
    const vec = await embedText(text);
    results.push(vec);
  }
  return results;
}

module.exports = { embedText, embedBatch, createHashEmbedding };
