import { useState, useEffect } from 'react';
import { documentService } from '../services/services';
import { useToast } from '../context/ToastContext';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentList({ refreshKey }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const toast = useToast();

  const fetchDocs = () => {
    setLoading(true);
    documentService
      .list()
      .then(({ data }) => setDocuments(data.documents))
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
  }, [refreshKey]);

  // Poll for processing documents every 5 seconds
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing');
    if (!hasProcessing) return;
    const timer = setInterval(fetchDocs, 5000);
    return () => clearInterval(timer);
  }, [documents]);

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) return;
    setDeleting(doc._id);
    try {
      await documentService.delete(doc._id);
      setDocuments((prev) => prev.filter((d) => d._id !== doc._id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div className="pp-spinner" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="pp-card-flat" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4 }}>📂</div>
        <p style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>NO DOCUMENTS YET</p>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.9375rem' }}>Upload a PDF using the panel on the left.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>
          {documents.length} DOCUMENT{documents.length !== 1 ? 'S' : ''} INDEXED
        </span>
        <button
          onClick={fetchDocs}
          className="pp-btn pp-btn-ghost pp-btn-sm"
          style={{ border: 'var(--border-thin)', padding: '0.375rem 0.625rem', minWidth: 'auto' }}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {documents.map((doc) => (
          <div key={doc._id} className="pp-card-flat" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.02em', marginBottom: '0.375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.originalName}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className={`pp-status pp-status-${doc.status}`}>
                    {doc.status === 'processing' && <div className="pp-spinner" style={{ width: 8, height: 8, borderWidth: 1.5 }} />}
                    {doc.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {formatBytes(doc.fileSize)}
                  </span>
                  {doc.totalChunks > 0 && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {doc.totalChunks} CHUNKS
                    </span>
                  )}
                  {doc.totalPages > 0 && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {doc.totalPages} PAGES
                    </span>
                  )}
                </div>
                {doc.status === 'failed' && doc.errorMessage && (
                  <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                    {doc.errorMessage}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(doc)}
                disabled={deleting === doc._id}
                className="pp-btn pp-btn-ghost pp-btn-icon pp-btn-sm"
                style={{ color: '#dc2626', flexShrink: 0 }}
                title="Delete document"
              >
                {deleting === doc._id ? <div className="pp-spinner" style={{ width: 14, height: 14 }} /> : '✕'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
