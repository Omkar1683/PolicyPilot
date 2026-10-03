import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentService } from '../services/services';
import { useToast } from '../context/ToastContext';
import DocumentList from './DocumentsListPage';

const PIPELINE_STEPS = [
  'EXTRACTING TEXT',
  'CREATING CHUNKS',
  'GENERATING EMBEDDINGS',
  'INDEXING DOCUMENT',
];

export default function DocumentsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File too large — max 10MB');
      return;
    }
    setFile(f);
    setUploadDone(false);
    setProgress(0);
    setCurrentStep(0);
  }, [toast]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handleInputChange = (e) => handleFile(e.target.files[0]);

  const simulateProgress = () => {
    let step = 0;
    const totalDuration = 5000; // 5s animation
    const stepDuration = totalDuration / PIPELINE_STEPS.length;

    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);
      setProgress(Math.min((step / PIPELINE_STEPS.length) * 90, 90));

      if (step >= PIPELINE_STEPS.length) {
        clearInterval(interval);
      }
    }, stepDuration);

    return interval;
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(5);
    setCurrentStep(0);

    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      await documentService.upload(formData);

      clearInterval(progressInterval);
      setProgress(100);
      setCurrentStep(PIPELINE_STEPS.length);
      setUploadDone(true);
      toast.success(`"${file.name}" uploaded! Processing in background.`);
      setRefreshKey((k) => k + 1);
      setTimeout(() => {
        setFile(null);
        setUploading(false);
        setProgress(0);
        setCurrentStep(0);
        setUploadDone(false);
      }, 2000);
    } catch (err) {
      clearInterval(progressInterval);
      toast.error(err.response?.data?.message || 'Upload failed');
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="pp-page-enter" style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: '0.25rem' }}>
          DOCUMENTS
        </p>
        <h1 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
          YOUR KNOWLEDGE BASE
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {/* Upload Panel */}
        <div className="pp-card" style={{ padding: '1.5rem' }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gray-400)', marginBottom: '1rem' }}>
            UPLOAD NEW DOCUMENT
          </div>

          {!uploading ? (
            <>
              {/* Drop zone */}
              <div
                id="pdf-drop-zone"
                className={`pp-upload-zone${dragOver ? ' drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('pdf-file-input').click()}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
                  {file ? '📄' : '↑'}
                </div>
                {file ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.02em', marginBottom: '0.25rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                      DROP YOUR PDF HERE
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, letterSpacing: '0.05em' }}>
                      PDF ONLY • MAX 10MB
                    </div>
                  </>
                )}
              </div>

              <input
                id="pdf-file-input"
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleInputChange}
              />

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => document.getElementById('pdf-file-input').click()}
                  className="pp-btn pp-btn-ghost pp-btn-sm"
                  style={{ flex: 1, justifyContent: 'center', border: 'var(--border-thin)' }}
                >
                  BROWSE
                </button>
                <button
                  id="upload-btn"
                  onClick={handleUpload}
                  disabled={!file}
                  className="pp-btn pp-btn-primary"
                  style={{ flex: 1, justifyContent: 'center', boxShadow: file ? 'var(--shadow-sm)' : 'none', opacity: file ? 1 : 0.5, cursor: file ? 'pointer' : 'not-allowed' }}
                >
                  UPLOAD →
                </button>
              </div>
            </>
          ) : (
            /* Processing state */
            <div style={{ padding: '1rem 0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                {uploadDone ? '✓ PROCESSING COMPLETE' : 'PROCESSING DOCUMENT...'}
              </div>

              {/* Progress bar */}
              <div className="pp-progress" style={{ marginBottom: '1.5rem' }}>
                <div className="pp-progress-fill" style={{ width: `${progress}%` }} />
              </div>

              {/* Pipeline steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {PIPELINE_STEPS.map((step, i) => (
                  <div key={step} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    opacity: i < currentStep ? 1 : i === currentStep ? 0.6 : 0.25,
                    transition: 'opacity 0.3s ease',
                  }}>
                    <div style={{
                      width: 18, height: 18,
                      background: i < currentStep ? 'var(--yellow)' : 'var(--gray-200)',
                      border: '1.5px solid var(--ink)',
                      borderRadius: '2px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.625rem', fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {i < currentStep ? '✓' : String(i + 1)}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {step}
                    </span>
                    {i === currentStep && !uploadDone && (
                      <div className="pp-spinner" style={{ marginLeft: 'auto', width: 14, height: 14 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Documents list — separate view */}
        <div>
          <DocumentList refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
