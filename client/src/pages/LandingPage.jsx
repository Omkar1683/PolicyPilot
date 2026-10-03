import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="pp-page-enter">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ borderBottom: 'var(--border)', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            alignItems: 'center',
            padding: '4rem 0',
          }}>
            {/* Left: headline */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', background: 'var(--yellow)',
                border: 'var(--border)', padding: '0.25rem 0.75rem',
                marginBottom: '1.5rem', borderRadius: '2px'
              }}>
                <span>◈</span> RAG-POWERED DOCUMENT AI
              </div>

              <h1 style={{
                fontSize: 'clamp(2.75rem, 7vw, 5.5rem)',
                fontWeight: 700, lineHeight: 1.0,
                letterSpacing: '-0.03em', textTransform: 'uppercase',
                marginBottom: '1.5rem'
              }}>
                DOCUMENT<br />
                INTELLIGENCE<br />
                WITHOUT THE<br />
                GUESSWORK.
              </h1>

              <p style={{
                fontSize: '1.0625rem', color: '#444',
                lineHeight: 1.6, marginBottom: '2rem',
                maxWidth: 420,
              }}>
                Upload your insurance policies. Ask plain-English questions.
                Get answers grounded in your actual documents — with exact source citations.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link
                  to={isAuthenticated ? '/documents' : '/register'}
                  className="pp-btn pp-btn-primary"
                  style={{ fontSize: '0.9375rem', padding: '0.875rem 1.75rem', boxShadow: 'var(--shadow)' }}
                >
                  UPLOAD A POLICY →
                </Link>
                <Link
                  to={isAuthenticated ? '/chat' : '/login'}
                  className="pp-btn pp-btn-ghost"
                  style={{ fontSize: '0.9375rem', padding: '0.875rem 1.75rem', border: 'var(--border)' }}
                >
                  TRY DEMO
                </Link>
              </div>
            </div>

            {/* Right: visual card */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div className="pp-card" style={{
                width: '100%', maxWidth: 340,
                padding: '2rem',
                background: 'var(--ink)', color: 'var(--white)',
              }}>
                <div style={{
                  fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em',
                  textTransform: 'uppercase', color: 'var(--yellow)', marginBottom: '1.5rem'
                }}>
                  PIPELINE
                </div>
                {['PDF Upload', 'Text Extraction', 'Chunking', 'Embeddings', 'Vector Search', 'LLM Answer', 'Source Citations'].map((step, i, arr) => (
                  <div key={step}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.625rem 0',
                    }}>
                      <div style={{
                        width: 28, height: 28, background: 'var(--yellow)',
                        border: '2px solid var(--white)',
                        borderRadius: '2px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ink)',
                        flexShrink: 0,
                      }}>
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.02em' }}>{step}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ marginLeft: '0.875rem', height: '1rem', width: 2, background: 'rgba(255,255,255,0.2)' }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section style={{ padding: '4rem 1.5rem', borderBottom: 'var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>
              FEATURES
            </span>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
              WHAT POLICYPILOT DOES
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
          }}>
            {[
              { icon: '📄', title: 'PDF UPLOAD', desc: 'Upload any insurance policy PDF up to 10MB. Supports health, life, vehicle, and home policies.' },
              { icon: '🧩', title: 'SMART CHUNKING', desc: 'Documents are split into overlapping chunks to preserve context across section boundaries.' },
              { icon: '🔍', title: 'VECTOR SEARCH', desc: 'MongoDB Atlas Vector Search finds the most semantically relevant policy sections for your question.' },
              { icon: '💬', title: 'SOURCE CITATIONS', desc: 'Every AI answer comes with exact document name and page number — no hallucinations, only facts.' },
            ].map((f) => (
              <div key={f.title} className="pp-card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>{f.icon}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem', color: 'var(--gray-400)' }}>
                  {f.title}
                </div>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, color: '#333' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section style={{ padding: '3rem 1.5rem', background: 'var(--ink)', borderTop: 'var(--border)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'uppercase', color: 'var(--white)', lineHeight: 1.1 }}>
              READY TO UNDERSTAND<br />YOUR POLICY?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem', fontSize: '1rem' }}>
              Create a free account and upload your first PDF in seconds.
            </p>
          </div>
          <Link
            to={isAuthenticated ? '/documents' : '/register'}
            className="pp-btn pp-btn-primary"
            style={{ fontSize: '1rem', padding: '1rem 2rem', boxShadow: 'var(--shadow)', flexShrink: 0 }}
          >
            GET STARTED →
          </Link>
        </div>
      </section>
    </div>
  );
}
