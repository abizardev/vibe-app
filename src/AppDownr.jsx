import { useState } from 'react';
import {
  Link,
  Download,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Trash2,
  Film,
  Image as ImageIcon,
  Music,
} from 'lucide-react';

function TaskStatusIcon({ status }) {
  if (status === 'running') return <Loader2 size={14} className="spin" />;
  if (status === 'done') return <CheckCircle2 size={14} />;
  return <AlertCircle size={14} />;
}

function splitUrls(text) {
  return text.match(/https?:\/\/[^\s,]+/g) || [];
}

function DownrResultCard({ task }) {
  const result = task.result?.Result;
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMediaType = (result) => {
    if (!result) return null;
    
    // Detect media type from result data
    if (result.video || result.url?.includes('video')) return 'video';
    if (result.image || result.url?.includes('image')) return 'image';
    if (result.audio || result.url?.includes('audio')) return 'audio';
    
    return 'media';
  };

  const mediaType = result ? getMediaType(result) : null;

  return (
    <div className={`batch-card ${task.status}`}>
      <div className="batch-card-head">
        <TaskStatusIcon status={task.status} />
        <div>
          <strong>{task.title}</strong>
          <small>{task.detail}</small>
        </div>
      </div>

      {task.error && (
        <div className="msg msg-error">
          <AlertCircle size={16} />
          <span>{task.error}</span>
        </div>
      )}

      {result && (
        <>
          <div className="downr-preview">
            <div className="downr-info">
              {mediaType && (
                <div className="downr-type">
                  {mediaType === 'video' && <Film size={16} />}
                  {mediaType === 'image' && <ImageIcon size={16} />}
                  {mediaType === 'audio' && <Music size={16} />}
                  <span>{mediaType.toUpperCase()}</span>
                </div>
              )}
              
              {result.title && <p className="downr-title">{result.title}</p>}
              {result.description && <p className="downr-desc">{result.description}</p>}
              
              {result.author && (
                <div className="downr-author">
                  <span>By: {result.author}</span>
                </div>
              )}

              {result.thumbnail && (
                <div className="downr-thumbnail">
                  <img src={result.thumbnail} alt="Thumbnail" />
                </div>
              )}
            </div>
          </div>

          <div className="download-actions">
            {result.url && (
              <>
                <a 
                  href={result.url} 
                  download 
                  className="btn-download btn-hd"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download size={16} />
                  Download {mediaType || 'Media'}
                </a>
                <button 
                  className="btn-download btn-music" 
                  onClick={() => handleCopy(result.url)}
                >
                  {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
                <a 
                  href={task.detail} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-download"
                >
                  <ExternalLink size={16} />
                  Original
                </a>
              </>
            )}

            {/* Handle multiple quality options */}
            {result.downloads && Array.isArray(result.downloads) && (
              <div className="downr-quality-options">
                {result.downloads.map((dl, idx) => (
                  <a 
                    key={idx}
                    href={dl.url} 
                    download 
                    className="btn-download"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={16} />
                    {dl.quality || `Option ${idx + 1}`}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Display raw result data if structure is unknown */}
          {result && !result.url && !result.downloads && (
            <details className="downr-raw-data">
              <summary>View Raw Data</summary>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}

export function DownrPanel({ tasks, createTask }) {
  const [urls, setUrls] = useState('');
  const [mode, setMode] = useState('single'); // 'single' or 'batch'
  const downrTasks = tasks.filter((task) => task.type === 'downr');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const list = splitUrls(urls);
    if (!list.length) return;

    if (mode === 'batch' && list.length > 1) {
      // Batch mode: send all URLs at once
      createTask({
        type: 'downr',
        title: `Batch Download (${list.length} URLs)`,
        detail: `${list.length} media files`,
        run: async () => {
          const res = await fetch('/api/downr/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: list }),
          });
          const data = await res.json();
          if (!data.Status) throw new Error(data.msg || 'Batch download failed');
          return data;
        },
      });
    } else {
      // Single mode: create individual tasks
      list.forEach((url, index) => {
        createTask({
          type: 'downr',
          title: `Media #${index + 1}`,
          detail: url,
          run: async () => {
            const res = await fetch('/api/downr/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url }),
            });
            const data = await res.json();
            if (!data.Status) throw new Error(data.Error || 'Download failed');
            return data;
          },
        });
      });
    }

    setUrls('');
  };

  return (
    <div className="panel downr-panel">
      <div className="panel-header">
        <Link size={22} />
        <h2>Media Downloader</h2>
      </div>

      <div className="downr-info-box">
        <p>Download media dari berbagai platform: TikTok, Instagram, Twitter, YouTube, Facebook, dan lainnya</p>
      </div>

      <form className="batch-form" onSubmit={handleSubmit}>
        <div className="downr-mode-toggle">
          <button
            type="button"
            className={`mode-btn ${mode === 'single' ? 'active' : ''}`}
            onClick={() => setMode('single')}
          >
            Single Mode
          </button>
          <button
            type="button"
            className={`mode-btn ${mode === 'batch' ? 'active' : ''}`}
            onClick={() => setMode('batch')}
          >
            Batch Mode
          </button>
        </div>

        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="Paste media URLs here. Pisahkan dengan enter, spasi, atau koma..."
          className="text-area"
          rows={6}
        />
        <div className="form-footer">
          <span>
            {splitUrls(urls).length} URL terdeteksi
            {mode === 'batch' && splitUrls(urls).length > 1 && ' (akan diproses sebagai batch)'}
          </span>
          <button type="submit" className="btn-primary" disabled={!splitUrls(urls).length}>
            <Send size={18} />
            {mode === 'batch' && splitUrls(urls).length > 1 ? 'Kirim Batch' : 'Download'}
          </button>
        </div>
      </form>

      <div className="batch-results">
        {downrTasks.map((task) => <DownrResultCard key={task.id} task={task} />)}
      </div>
    </div>
  );
}
