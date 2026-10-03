/**
 * queryService.js
 *
 * Handles the question-answering half of the RAG pipeline:
 *
 * 1. Query rewriting (for follow-up questions)
 * 2. Query embedding (via embeddingService)
 * 3. Vector search (MongoDB Atlas / in-memory fallback)
 * 4. Context construction
 * 5. LLM answer generation with real-time streaming (Google Gemini / OpenAI)
 * 6. Source metadata extraction with deduplication
 */
const OpenAI = require('openai');
const { embedText } = require('./embeddingService');
const { vectorSearch } = require('./ragService');

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder')
  ? process.env.OPENAI_API_KEY
  : null;

const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;
const MAX_CONTEXT_CHARS = 6000;

/**
 * Rewrite a user query to be self-contained, considering conversation history.
 */
async function rewriteQuery(question, history = []) {
  if (!history || history.length === 0) {
    return question;
  }

  const recentHistory = history.slice(-6);

  // 1. Try Gemini
  if (GEMINI_KEY) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `You are a query rewriter for an insurance document QA system.
Given the conversation history and a new question, rewrite the question to be fully standalone and self-contained.
Output ONLY the rewritten question. No quotes, no intro.

Conversation history:
${recentHistory.map((m) => `${m.role}: ${m.content}`).join('\n')}

New Question: "${question}"`,
                  },
                ],
              },
            ],
          }),
        }
      );
      const data = await res.json();
      const rewritten = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (rewritten) return rewritten;
    } catch (e) {
      console.warn('Gemini query rewrite failed, using original:', e.message);
    }
  }

  // 2. Try OpenAI
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a query rewriter for a document QA system. Rewrite the question to be standalone. ONLY output the rewritten question.`,
          },
          ...recentHistory,
          { role: 'user', content: question },
        ],
        temperature: 0,
        max_tokens: 150,
      });
      return response.choices[0].message.content.trim() || question;
    } catch (e) {
      console.warn('OpenAI query rewrite failed:', e.message);
    }
  }

  return question;
}

/**
 * Build the LLM context string from retrieved chunks.
 */
function buildContext(chunks) {
  let context = '';
  const usedChunks = [];

  for (const chunk of chunks) {
    const entry = `[Source: ${chunk.documentName}, Page ${chunk.pageNumber}]\n${chunk.text}\n\n`;
    if (context.length + entry.length > MAX_CONTEXT_CHARS) break;
    context += entry;
    usedChunks.push(chunk);
  }

  return { context, usedChunks };
}

/**
 * Stream answer from Gemini API via SSE
 */
async function streamGeminiAnswer(systemPrompt, question, history, onChunk) {
  const contents = [];

  // Add conversation history
  for (const msg of history.slice(-6)) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  // Add the current prompt with context
  contents.push({
    role: 'user',
    parts: [{ text: `${systemPrompt}\n\nUSER QUESTION: ${question}` }],
  });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errorText}`);
  }

  let fullAnswer = '';
  let buffer = '';
  const decoder = new TextDecoder();

  for await (const rawChunk of res.body) {
    buffer += decoder.decode(rawChunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6);
        try {
          const parsed = JSON.parse(jsonStr);
          const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunkText) {
            fullAnswer += chunkText;
            if (onChunk) onChunk(chunkText);
          }
        } catch {
          // ignore partial JSON parse errors
        }
      }
    }
  }

  return fullAnswer.trim();
}

/**
 * Stream answer from OpenAI API
 */
async function streamOpenAIAnswer(systemPrompt, question, history, onChunk) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6),
      { role: 'user', content: question },
    ],
    temperature: 0.1,
    max_tokens: 800,
  });

  let fullAnswer = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    fullAnswer += delta;
    if (onChunk && delta) {
      onChunk(delta);
    }
  }
  return fullAnswer;
}

/**
 * Answer a question using RAG with streaming response.
 */
async function answerQuestion(question, userId, history = [], onChunk) {
  // Step 1: Embed the question
  const queryEmbedding = await embedText(question);

  // Step 2: Vector search — retrieve top-K relevant chunks
  const relevantChunks = await vectorSearch(queryEmbedding, userId);

  if (!relevantChunks || relevantChunks.length === 0) {
    const noDocMsg =
      "I couldn't find relevant information in your uploaded documents. Please make sure you have uploaded the relevant policy PDF and try rephrasing your question.";
    if (onChunk) onChunk(noDocMsg);
    return { fullAnswer: noDocMsg, sources: [] };
  }

  // Step 3: Build context from retrieved chunks
  const { context, usedChunks } = buildContext(relevantChunks);

  // Step 4: System prompt
  const systemPrompt = `You are PolicyPilot, an expert insurance document assistant.
Your job is to answer questions ONLY based on the provided document excerpts below.

Rules:
- Answer clearly and concisely based ONLY on the provided context.
- If the answer is not in the provided context, say: "I don't have enough information in your uploaded documents to answer this question."
- Never make up information or speculate beyond the provided text.
- Use Indian Rupee symbol (₹) where appropriate for financial values.
- Keep answers focused and professional.
- Do NOT cite sources in your answer text — sources are shown separately.

DOCUMENT CONTEXT:
${context}`;

  let fullAnswer = '';

  // Step 5: Stream the LLM response
  if (GEMINI_KEY) {
    fullAnswer = await streamGeminiAnswer(systemPrompt, question, history, onChunk);
  } else if (openai) {
    fullAnswer = await streamOpenAIAnswer(systemPrompt, question, history, onChunk);
  } else {
    // Basic extractive answer if no LLM key
    fullAnswer = `Based on your documents:\n\n${relevantChunks[0].text}`;
    if (onChunk) onChunk(fullAnswer);
  }

  if (!fullAnswer || !fullAnswer.trim()) {
    fullAnswer = "I couldn't find specific details for this in your uploaded documents. Please check your policy document or try rephrasing.";
    if (onChunk) onChunk(fullAnswer);
  }

  // Step 6: Build source metadata (deduplicate by document + page)
  const seenSources = new Set();
  const sources = usedChunks
    .filter((chunk) => {
      const key = `${chunk.documentId}-${chunk.pageNumber}`;
      if (seenSources.has(key)) return false;
      seenSources.add(key);
      return true;
    })
    .map((chunk) => ({
      documentId: chunk.documentId,
      documentName: chunk.documentName,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      excerpt: chunk.text.slice(0, 150) + (chunk.text.length > 150 ? '...' : ''),
    }));

  return { fullAnswer, sources };
}

module.exports = { rewriteQuery, answerQuestion };
