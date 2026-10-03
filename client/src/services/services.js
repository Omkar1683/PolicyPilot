import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const documentService = {
  upload: (formData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list: () => api.get('/documents'),
  get: (id) => api.get(`/documents/${id}`),
  delete: (id) => api.delete(`/documents/${id}`),
};

export const chatService = {
  createSession: (title) => api.post('/chat/sessions', { title }),
  listSessions: () => api.get('/chat/sessions'),
  getSession: (id) => api.get(`/chat/sessions/${id}`),
  deleteSession: (id) => api.delete(`/chat/sessions/${id}`),

  /**
   * Stream a message response using the Fetch API (for SSE).
   * Returns a readable stream so the caller can process chunks.
   */
  streamMessage: async (sessionId, question, onChunk, onDone, onError) => {
    const token = localStorage.getItem('pp_token');
    try {
      const response = await fetch(`/api/chat/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') {
              if (onDone) onDone();
              return;
            }
            try {
              const parsed = JSON.parse(raw);
              if (parsed.type === 'chunk' && onChunk) onChunk(parsed.content);
              if (parsed.type === 'done' && onDone) onDone(parsed.sources);
              if (parsed.type === 'error' && onError) onError(parsed.message);
            } catch (_) {
              // Ignore malformed JSON
            }
          }
        }
      }
    } catch (error) {
      if (onError) onError(error.message);
    }
  },
};
