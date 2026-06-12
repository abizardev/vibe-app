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

  const proxyUrl = (u) => `/api/proxy?url=${encodeURIComponent(u)}`;

  // Extract media info from result
  const getMediaInfo = () => {
    if (!result) return null;

    // Handle downr.org response with medias array
    if (result.medias && Array.isArray(result.medias)) {
      return {
        title: result.title || 'Untitled',
        author: result.author || result.unique_id || null,
        thumbnail: result.thumbnail || null,
        source: result.source || 'unknown',
        medias: result.medias,
        statistics: result.statistics || null
      };
    }

    // Handle other response formats
    return {
      title: result.title || 'Untitled',
      author: result.author || null,
      thumbnail: result.thumbnail || null,
      url: result.url || null,
      downloads: result.downloads || null
    };
  };

  const mediaInfo = getMediaInfo();

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

      {mediaInfo && (
        <>
          {/* Preview Section */}
          <div className="downr-preview">
            <div className="downr-info">
              {mediaInfo.source && (
                <div className="downr-type">
                  <Film size={16} />
                  <span>{mediaInfo.source.toUpperCase()}</span>
                </div>
              )}
              
              {mediaInfo.title && <p className="downr-title">{mediaInfo.title}</p>}
              
              {mediaInfo.author && (
                <div className="downr-author">
                  <span>@{mediaInfo.author}</span>
                </div>
              )}

              {mediaInfo.thumbnail && (
                <div className="downr-thumbnail">
                  <img src={proxyUrl(mediaInfo.thumbnail)} alt="Thumbnail" />
                </div>
              )}

              {/* Statistics */}
              {mediaInfo.statistics && (
                <div className="tiktok-stats">
                  {mediaInfo.statistics.play_count && <span>👁 {formatCount(mediaInfo.statistics.play_count)}</span>}
                  {mediaInfo.statistics.digg_count && <span>❤️ {formatCount(mediaInfo.statistics.digg_count)}</span>}
                  {mediaInfo.statistics.comment_count && <span>💬 {formatCount(mediaInfo.statistics.comment_count)}</span>}
                  {mediaInfo.statistics.share_count && <span>📤 {formatCount(mediaInfo.statistics.share_count)}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Download Actions */}
          <div className="download-actions">
            {/* Handle medias array (downr.org format) */}
            {mediaInfo.medias && mediaInfo.medias.map((media, idx) => {
              if (media.type === 'video') {
                let btnClass = 'btn-download';
                let label = media.quality || 'Video';
                
                if (media.quality === 'hd_no_watermark') {
                  btnClass = 'btn-download btn-hd';
                  label = 'HD Video';
                } else if (media.quality === 'no_watermark') {
                  btnClass = 'btn-download btn-hd';
                  label = 'SD Video';
                } else if (media.quality === 'watermark') {
                  label = 'Watermark Video';
                }

                return (
                  <a
                    key={idx}
                    href={proxyUrl(media.url)}
                    download
                    className={btnClass}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download size={16} />
                    {label}
                  </a>
                );
              } else if (media.type === 'audio') {
                return (
                  <a
                    key={idx}
                    href={proxyUrl(media.url)}
                    download
                    className="btn-download btn-music"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Music size={16} />
                    Audio
                  </a>
                );
              }
              return null;
            })}

            {/* Handle simple URL format */}
            {mediaInfo.url && !mediaInfo.medias && (
              <>
                <a 
                  href={mediaInfo.url} 
                  download 
                  className="btn-download btn-hd"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download size={16} />
                  Download Media
                </a>
                <button 
                  className="btn-download btn-music" 
                  onClick={() => handleCopy(mediaInfo.url)}
                >
                  {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
              </>
            )}

            {/* Handle downloads array */}
            {mediaInfo.downloads && Array.isArray(mediaInfo.downloads) && (
              mediaInfo.downloads.map((dl, idx) => (
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
              ))
            )}

            {/* Original link */}
            <a 
              href={task.detail} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-download"
            >
              <ExternalLink size={16} />
              Original
            </a>
          </div>

          {/* Display raw result data if structure is unknown */}
          {result && !mediaInfo.medias && !mediaInfo.url && !mediaInfo.downloads && (
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

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export function DownrPanel({ tasks, createTask }) {
  const [urls, setUrls] = useState('');
  const downrTasks = tasks.filter((task) => task.type === 'downr');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const list = splitUrls(urls);
    if (!list.length) return;

    // Batch mode: create individual tasks like TikTok Downloader
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

    setUrls('');
  };

  return (
    <div className="panel downr-panel">
      <div className="panel-header">
        <Link size={22} />
        <h2>Media Downloader Batch</h2>
      </div>

      <div className="downr-info-box">
        <p>Download media dari berbagai platform: TikTok, Instagram, Twitter, YouTube, Facebook, dan lainnya</p>
      </div>

      <form className="batch-form" onSubmit={handleSubmit}>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="Paste banyak link media di sini. Pisahkan dengan enter, spasi, atau koma..."
          className="text-area"
          rows={6}
        />
        <div className="form-footer">
          <span>{splitUrls(urls).length} link terdeteksi</span>
          <button type="submit" className="btn-primary" disabled={!splitUrls(urls).length}>
            <Send size={18} />
            Kirim Batch
          </button>
        </div>
      </form>

      <div className="batch-results">
        {downrTasks.map((task) => <DownrResultCard key={task.id} task={task} />)}
      </div>
    </div>
  );
}
