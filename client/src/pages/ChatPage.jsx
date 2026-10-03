import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatService, documentService } from '../services/services';
import { useToast } from '../context/ToastContext';

/* ── Source Citation Card ──────────────────────────────────── */
function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="pp-source-card" onClick={() => setExpanded((v) => !v)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.875rem' }}>📄</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {source.documentName}
          </div>
          <div style={{ fontSize: '0.625rem', color: 'var(--gray-400)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            PAGE {String(source.pageNumber).padStart(2, '0')}
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>{expanded ? '↑' : '↓'}</span>
      </div>
      {expanded && source.excerpt && (
        <div style={{ marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: '0.75rem', color: '#444', lineHeight: 1.5, fontStyle: 'italic' }}>
          "{source.excerpt}"
        </div>
      )}
    </div>
  );
}

/* ── Message Bubble ────────────────────────────────────────── */
function MessageBubble({ msg, isStreaming }) {
  if (msg.role === 'user') {
    return (
      <div className="pp-msg-user" style={{ marginLeft: 'auto' }}>
        <div className="pp-msg-label" style={{ color: 'rgba(255,255,255,0.5)' }}>YOU</div>
        <div style={{ fontSize: '0.9375rem', lineHeight: 1.6 }}>{msg.content}</div>
      </div>
    );
  }

  return (
    <div className="pp-msg-ai">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ width: 24, height: 24, background: 'var(--yellow)', border: '1.5px solid var(--ink)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>◈</div>
        <div className="pp-msg-label" style={{ margin: 0 }}>POLICY PILOT</div>
        {isStreaming && (
          <div className="pp-typing" style={{ marginLeft: 'auto' }}>
            <span /><span /><span />
          </div>
        )}
      </div>

      <div className="pp-markdown" style={{ fontSize: '0.9375rem', lineHeight: 1.7 }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
      </div>

      {msg.sources && msg.sources.length > 0 && (
        <>
          <div className="pp-divider" />
          <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.625rem', color: 'var(--gray-400)' }}>
            SOURCES
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {msg.sources.map((s, i) => (
              <SourceCard key={i} source={s} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Chat Input ────────────────────────────────────────────── */
function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e) => {
    setValue(e.target.value);
    // Auto-grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
      <textarea
        ref={textareaRef}
        id="chat-input"
        className="pp-input"
        placeholder="Ask about your insurance policy..."
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
        style={{
          flex: 1, resize: 'none', minHeight: 48,
          lineHeight: 1.5, paddingTop: '0.75rem', paddingBottom: '0.75rem',
          overflowY: 'hidden',
        }}
      />
      <button
        id="chat-send-btn"
        type="submit"
        disabled={!value.trim() || disabled}
        className="pp-btn pp-btn-dark"
        style={{
          padding: '0.75rem 1.25rem', boxShadow: 'var(--shadow-sm)',
          opacity: (!value.trim() || disabled) ? 0.5 : 1,
          flexShrink: 0,
        }}
      >
        {disabled ? <div className="pp-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white', width: 16, height: 16 }} /> : '→'}
      </button>
    </form>
  );
}

/* ── Main Chat Page ─────────────────────────────────────────── */
export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const messagesEndRef = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load sessions and documents
  useEffect(() => {
    chatService.listSessions().then(({ data }) => setSessions(data.sessions)).catch(() => {});
    documentService.list().then(({ data }) => setDocuments(data.documents.filter((d) => d.status === 'ready'))).catch(() => {});
  }, []);

  // Load session messages when sessionId changes
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    setLoadingSession(true);
    chatService
      .getSession(sessionId)
      .then(({ data }) => {
        setMessages(data.messages);
        // Update session title in sidebar
        setSessions((prev) => prev.map((s) => s._id === sessionId ? { ...s, ...data.session } : s));
      })
      .catch(() => toast.error('Failed to load chat session'))
      .finally(() => setLoadingSession(false));
  }, [sessionId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = async () => {
    try {
      const { data } = await chatService.createSession('New Chat');
      setSessions((prev) => [data.session, ...prev]);
      navigate(`/chat/${data.session._id}`);
      setSidebarOpen(false);
    } catch {
      toast.error('Failed to create session');
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat session?')) return;
    try {
      await chatService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s._id !== id));
      if (sessionId === id) navigate('/chat');
    } catch {
      toast.error('Failed to delete session');
    }
  };

  const handleSend = useCallback(
    async (question) => {
      if (!sessionId) {
        // Auto-create session if none exists
        try {
          const { data } = await chatService.createSession(question.slice(0, 60));
          setSessions((prev) => [data.session, ...prev]);
          navigate(`/chat/${data.session._id}`);
          return; // Let the redirect trigger handleSend after navigation
        } catch {
          toast.error('Failed to create session');
          return;
        }
      }

      // Add user message optimistically
      const userMsg = { _id: Date.now(), role: 'user', content: question, sources: [] };
      const aiMsgId = Date.now() + 1;
      const aiMsg = { _id: aiMsgId, role: 'assistant', content: '', sources: [], _streaming: true };

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setStreaming(true);

      await chatService.streamMessage(
        sessionId,
        question,
        // onChunk: accumulate streamed tokens
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m._id === aiMsgId ? { ...m, content: m.content + chunk } : m))
          );
        },
        // onDone: attach sources
        (sources) => {
          setMessages((prev) =>
            prev.map((m) => (m._id === aiMsgId ? { ...m, sources: sources || [], _streaming: false } : m))
          );
          setStreaming(false);
          // Refresh session list to update title
          chatService.listSessions().then(({ data }) => setSessions(data.sessions)).catch(() => {});
        },
        // onError
        (errMsg) => {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === aiMsgId
                ? { ...m, content: `⚠️ Error: ${errMsg}`, _streaming: false }
                : m
            )
          );
          setStreaming(false);
          toast.error('Something went wrong. Please try again.');
        }
      );
    },
    [sessionId, navigate, toast]
  );

  const readyDocCount = documents.length;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', position: 'relative' }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        style={{
          width: 260, borderRight: 'var(--border)', background: 'var(--white)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          flexShrink: 0,
        }}
        className="chat-sidebar-desktop"
      >
        {/* Header */}
        <div style={{ padding: '1rem', borderBottom: 'var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>SESSIONS</span>
            <button onClick={handleNewChat} className="pp-btn pp-btn-primary pp-btn-sm pp-btn-icon" style={{ boxShadow: 'var(--shadow-sm)' }}>+</button>
          </div>
          {readyDocCount > 0 ? (
            <div style={{ fontSize: '0.6875rem', color: '#16a34a', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
              {readyDocCount} DOC{readyDocCount !== 1 ? 'S' : ''} READY
            </div>
          ) : (
            <Link to="/documents" style={{ fontSize: '0.6875rem', color: '#d97706', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem', textDecoration: 'none' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
              UPLOAD A DOCUMENT →
            </Link>
          )}
        </div>

        {/* Documents list */}
        {documents.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1.5px solid var(--gray-100)' }}>
            <div style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: '0.5rem' }}>DOCUMENTS</div>
            {documents.slice(0, 4).map((doc) => (
              <div key={doc._id} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ color: 'var(--gray-400)' }}>●</span> {doc.originalName}
              </div>
            ))}
          </div>
        )}

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
          {sessions.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.8125rem' }}>
              No sessions yet.<br />Start a new chat →
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s._id}
                onClick={() => { navigate(`/chat/${s._id}`); setSidebarOpen(false); }}
                style={{
                  padding: '0.625rem 0.75rem', cursor: 'pointer', borderRadius: '2px',
                  background: sessionId === s._id ? 'var(--yellow)' : 'transparent',
                  border: sessionId === s._id ? 'var(--border-thin)' : '1.5px solid transparent',
                  marginBottom: '0.25rem', transition: 'all 0.1s ease',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}
                onMouseEnter={(e) => { if (sessionId !== s._id) e.currentTarget.style.background = 'var(--gray-100)'; }}
                onMouseLeave={(e) => { if (sessionId !== s._id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: '0.125rem' }}>
                    {new Date(s.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(e, s._id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0, padding: '0.125rem 0.25rem', fontSize: '0.75rem', color: '#dc2626' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.stopPropagation(); }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = 0; }}
                  title="Delete session"
                >✕</button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ───────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Chat toolbar */}
        <div style={{ padding: '0.875rem 1.5rem', borderBottom: 'var(--border)', background: 'var(--white)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="pp-btn pp-btn-ghost pp-btn-icon pp-btn-sm"
            id="sidebar-toggle-btn"
            style={{ display: 'none' }}
          >
            ☰
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>
              {sessionId ? 'ACTIVE SESSION' : 'NEW CHAT'}
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '-0.01em' }}>
              {sessions.find((s) => s._id === sessionId)?.title || 'ASK YOUR POLICY ANYTHING'}
            </div>
          </div>
          <button onClick={handleNewChat} className="pp-btn pp-btn-ghost pp-btn-sm" style={{ border: 'var(--border-thin)' }}>
            + NEW CHAT
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loadingSession ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div className="pp-spinner" style={{ width: 28, height: 28 }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="pp-empty" style={{ flex: 1, justifyContent: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>◈</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                ASK YOUR POLICY<br />ANYTHING.
              </h2>
              <p style={{ fontSize: '0.9375rem', maxWidth: 360, lineHeight: 1.6 }}>
                {readyDocCount > 0
                  ? `You have ${readyDocCount} document${readyDocCount !== 1 ? 's' : ''} ready. Type a question below.`
                  : 'Upload an insurance policy PDF first, then come back to ask questions.'}
              </p>
              {readyDocCount === 0 && (
                <Link to="/documents" className="pp-btn pp-btn-primary" style={{ marginTop: '1rem', boxShadow: 'var(--shadow-sm)' }}>
                  UPLOAD PDF →
                </Link>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg._id} msg={msg} isStreaming={msg._streaming} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="pp-chat-input-area">
          {readyDocCount === 0 && (
            <div style={{ marginBottom: '0.625rem', fontSize: '0.75rem', fontWeight: 700, color: '#d97706', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              ⚠ No documents uploaded —{' '}
              <Link to="/documents" style={{ color: 'inherit', textDecoration: 'underline' }}>Upload a PDF</Link>
              {' '}first
            </div>
          )}
          <ChatInput onSend={handleSend} disabled={streaming} />
          <div style={{ marginTop: '0.5rem', fontSize: '0.625rem', color: 'var(--gray-400)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            SHIFT+ENTER FOR NEW LINE · ANSWERS GROUNDED IN YOUR DOCUMENTS
          </div>
        </div>
      </main>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}
            onClick={() => setSidebarOpen(false)}
          />
          <div style={{
            position: 'fixed', top: 64, left: 0, bottom: 0, width: 280,
            background: 'var(--white)', borderRight: 'var(--border)', zIndex: 201,
            overflowY: 'auto',
          }}>
            <div style={{ padding: '1rem', borderBottom: 'var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.875rem' }}>SESSIONS</span>
              <button onClick={() => setSidebarOpen(false)} className="pp-btn pp-btn-ghost pp-btn-icon pp-btn-sm">✕</button>
            </div>
            {sessions.map((s) => (
              <div
                key={s._id}
                onClick={() => { navigate(`/chat/${s._id}`); setSidebarOpen(false); }}
                style={{ padding: '1rem', cursor: 'pointer', borderBottom: '1.5px solid var(--gray-100)', background: sessionId === s._id ? 'var(--yellow)' : 'transparent' }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.title}</div>
                <div style={{ fontSize: '0.625rem', color: 'var(--gray-400)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {new Date(s.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .chat-sidebar-desktop { display: none !important; }
          #sidebar-toggle-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
