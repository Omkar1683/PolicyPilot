import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { documentService, chatService } from '../services/services';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([documentService.list(), chatService.listSessions()])
      .then(([docsRes, sessionsRes]) => {
        setDocuments(docsRes.data.documents);
        setSessions(sessionsRes.data.sessions);
      })
      .catch(() => toast.error('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  const handleNewChat = async () => {
    try {
      const { data } = await chatService.createSession('New Chat');
      navigate(`/chat/${data.session._id}`);
    } catch {
      toast.error('Failed to create chat session');
    }
  };

  const readyDocs = documents.filter((d) => d.status === 'ready');
  const totalChunks = readyDocs.reduce((sum, d) => sum + (d.totalChunks || 0), 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}>
        <div className="pp-spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="pp-page-enter" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* ── Greeting ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: '0.25rem' }}>
            DASHBOARD
          </p>
          <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: 1.1 }}>
            GOOD {getTimeOfDay().toUpperCase()},<br />{user?.name?.split(' ')[0]?.toUpperCase()}.
          </h1>
        </div>
        <button onClick={handleNewChat} className="pp-btn pp-btn-primary" style={{ boxShadow: 'var(--shadow)' }}>
          + NEW CHAT
        </button>
      </div>

      {/* ── Stats ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { number: documents.length, label: 'DOCUMENTS' },
          { number: readyDocs.length, label: 'READY' },
          { number: totalChunks, label: 'CHUNKS' },
          { number: sessions.length, label: 'CHAT SESSIONS' },
        ].map((stat) => (
          <div key={stat.label} className="pp-stat" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <div className="pp-stat-number">{stat.number}</div>
            <div className="pp-stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Knowledge Base ───────────────────────────────────── */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: 'var(--ink)', color: 'var(--white)',
          border: 'var(--border)',
        }}>
          <div>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--yellow)', marginBottom: '0.25rem' }}>
              KNOWLEDGE BASE
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em' }}>YOUR DOCUMENTS</div>
          </div>
          <Link to="/documents" className="pp-btn pp-btn-primary pp-btn-sm">
            + ADD PDF
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="pp-card-flat" style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>📄</div>
            <p style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>NO DOCUMENTS YET</p>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>Upload your first insurance policy PDF to get started.</p>
            <Link to="/documents" className="pp-btn pp-btn-dark">UPLOAD PDF →</Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            border: '1px solid transparent',
          }}>
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="pp-card-flat"
                style={{ padding: '1.25rem', cursor: 'pointer', transition: 'background 0.15s' }}
                onClick={() => navigate('/documents')}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--yellow)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--white)'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📄</span>
                  <span className={`pp-status pp-status-${doc.status}`}>
                    {doc.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.02em', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.originalName.toUpperCase()}
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, letterSpacing: '0.05em' }}>
                  <span>{doc.totalChunks || '—'} CHUNKS</span>
                  <span>{formatBytes(doc.fileSize)}</span>
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'underline' }}>
                  OPEN →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Chats ──────────────────────────────────────── */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1rem',
        }}>
          <div>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: '0.25rem' }}>
              RECENT
            </p>
            <h2 style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>CHAT SESSIONS</h2>
          </div>
          <button onClick={handleNewChat} className="pp-btn pp-btn-ghost pp-btn-sm" style={{ border: 'var(--border-thin)' }}>
            NEW CHAT →
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="pp-card-flat" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.4 }}>💬</div>
            <p style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>NO CHATS YET</p>
            <p style={{ color: 'var(--gray-400)', fontSize: '0.9375rem' }}>Start a conversation with your documents.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sessions.slice(0, 5).map((session) => (
              <div
                key={session._id}
                className="pp-card-flat"
                style={{
                  padding: '1rem 1.25rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background 0.15s',
                }}
                onClick={() => navigate(`/chat/${session._id}`)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-100)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--white)'}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>
                    {session.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {new Date(session.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={{ fontSize: '1.25rem', opacity: 0.3 }}>→</span>
              </div>
            ))}
            {sessions.length > 5 && (
              <Link to="/chat" className="pp-btn pp-btn-ghost" style={{ border: 'var(--border-thin)', justifyContent: 'center', marginTop: '0.5rem' }}>
                VIEW ALL {sessions.length} SESSIONS →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
