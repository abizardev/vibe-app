import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  SlidersHorizontal,
  Plus,
  HelpCircle,
  Settings,
  MoreVertical,
  LayoutGrid,
  Download,
  Wand2,
  ArrowUpCircle,
  Upload,
  X,
  Loader2,
  Play,
  Film,
  ExternalLink,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Music,
  CheckCircle2,
  AlertCircle,
  Send,
  ClipboardList,
  Trash2,
  Copy,
  Link,
} from 'lucide-react';
import './App.css';

const SIDEBAR_ITEMS = [
  { id: 'home', icon: LayoutGrid, label: 'Home' },
  { id: 'tiktok', icon: Download, label: 'TikTok Download' },
  { id: 'image', icon: Wand2, label: 'AI Image Edit' },
  { id: 'video', icon: ArrowUpCircle, label: 'Video Upscale' },
];

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function proxyUrl(u) {
  return `/api/proxy?url=${encodeURIComponent(u)}`;
}

function splitTikTokUrls(text) {
  return text.match(/https?:\/\/[^\s,]+/g) || [];
}

function TaskStatusIcon({ status }) {
  if (status === 'running') return <Loader2 size={14} className="spin" />;
  if (status === 'done') return <CheckCircle2 size={14} />;
  return <AlertCircle size={14} />;
}

function GlobalTaskBar({ tasks }) {
  const running = tasks.filter((task) => task.status === 'running');
  const done = tasks.filter((task) => task.status === 'done');
  const failed = tasks.filter((task) => task.status === 'error');

  if (!tasks.length) return null;

  return (
    <div className="global-task-bar">
      <div className="global-task-left">
        {running.length ? <Loader2 size={16} className="spin" /> : <ClipboardList size={16} />}
        <span>
          {running.length
            ? `${running.length} task berjalan di background`
            : `${done.length} selesai${failed.length ? `, ${failed.length} gagal` : ''}`}
        </span>
      </div>
      <div className="global-task-pills">
        {tasks.slice(0, 5).map((task) => (
          <span key={task.id} className={`task-pill ${task.status}`}>
            <TaskStatusIcon status={task.status} />
            {task.title}
          </span>
        ))}
        {tasks.length > 5 && <span className="task-pill more">+{tasks.length - 5}</span>}
      </div>
    </div>
  );
}

function HomePanel({ onNavigate, tasks }) {
  const tools = [
    {
      id: 'tiktok',
      icon: Download,
      title: 'TikTok Download',
      desc: 'Batch download banyak link TikTok sekaligus',
      color: '#ea4335',
    },
    {
      id: 'image',
      icon: Wand2,
      title: 'AI Image Edit',
      desc: 'Batch edit image dengan AI prompt',
      color: '#8ab4f8',
    },
    {
      id: 'video',
      icon: ArrowUpCircle,
      title: 'Video Upscale',
      desc: 'Batch upscale video di background',
      color: '#34a853',
    },
  ];

  return (
    <div className="home-panel">
      <div className="home-hero">
        <h1 className="home-title">Flow Tools</h1>
        <p className="home-subtitle">AI-powered media toolkit with background batch processing</p>
      </div>


      <div className="home-grid">
        {tools.map((t) => (
          <button key={t.id} className="home-card" onClick={() => onNavigate(t.id)}>
            <div className="home-card-icon" style={{ background: t.color + '18', color: t.color }}>
              <t.icon size={28} strokeWidth={1.5} />
            </div>
            <h3>{t.title}</h3>
            <p>{t.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function TikTokResultCard({ task }) {
  const result = task.result?.data;

  return (
    <div className={`batch-card ${task.status}`}>
      <div className="batch-card-head">
        <TaskStatusIcon status={task.status} />
        <div>
          <strong>{task.title}</strong>
          <small>{task.detail}</small>
        </div>
      </div>

      {task.error && <div className="msg msg-error"><AlertCircle size={16} /><span>{task.error}</span></div>}

      {result && (
        <>
          <div className="tiktok-preview compact-preview">
            {result.cover && (
              <div className="tiktok-cover-wrap">
                <img src={proxyUrl(result.cover)} alt="" className="tiktok-cover" />
                <div className="tiktok-play-overlay"><Play size={30} fill="#fff" /></div>
              </div>
            )}
            <div className="tiktok-info">
              {result.author?.nickname && (
                <div className="tiktok-author">
                  {result.author.avatar && <img src={proxyUrl(result.author.avatar)} alt="" className="tiktok-avatar" />}
                  <span>@{result.author.unique_id || result.author.nickname}</span>
                </div>
              )}
              {result.title && <p className="tiktok-title">{result.title}</p>}
              <div className="tiktok-stats">
                <span><Eye size={14} /> {formatCount(result.play_count)}</span>
                <span><Heart size={14} /> {formatCount(result.digg_count)}</span>
                <span><MessageCircle size={14} /> {formatCount(result.comment_count)}</span>
                <span><Share2 size={14} /> {formatCount(result.share_count)}</span>
              </div>
              {result.music_info?.title && (
                <div className="tiktok-music">
                  <Music size={14} />
                  <span>{result.music_info.title} — {result.music_info.author}</span>
                </div>
              )}
            </div>
          </div>
          <div className="download-actions">
            {result.hdplay && <a href={proxyUrl(result.hdplay)} download className="btn-download btn-hd"><Download size={16} />HD Video</a>}
            {result.play && <a href={proxyUrl(result.play)} download className="btn-download"><Download size={16} />SD Video</a>}
            {result.music && <a href={proxyUrl(result.music)} download className="btn-download btn-music"><Music size={16} />Audio</a>}
          </div>
        </>
      )}
    </div>
  );
}

function TikTokPanel({ tasks, createTask }) {
  const [urls, setUrls] = useState('');
  const tiktokTasks = tasks.filter((task) => task.type === 'tiktok');

  const handleSubmit = (e) => {
    e.preventDefault();
    const list = splitTikTokUrls(urls);
    if (!list.length) return;

    list.forEach((url, index) => {
      createTask({
        type: 'tiktok',
        title: `TikTok #${index + 1}`,
        detail: url,
        run: async () => {
          const res = await fetch('/api/tiktok/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          const data = await res.json();
          if (!data.Status) throw new Error(data.msg || 'Failed to fetch TikTok data');
          return data;
        },
      });
    });

    setUrls('');
  };

  return (
    <div className="panel tiktok-panel">
      <div className="panel-header">
        <Download size={22} />
        <h2>TikTok Download Batch</h2>
      </div>

      <form className="batch-form" onSubmit={handleSubmit}>
        <textarea
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder="Paste banyak link TikTok di sini. Pisahkan dengan enter, spasi, atau koma..."
          className="text-area"
          rows={6}
        />
        <div className="form-footer">
          <span>{splitTikTokUrls(urls).length} link terdeteksi</span>
          <button type="submit" className="btn-primary" disabled={!splitTikTokUrls(urls).length}>
            <Send size={18} />
            Kirim Batch
          </button>
        </div>
      </form>

      <div className="batch-results">
        {tiktokTasks.map((task) => <TikTokResultCard key={task.id} task={task} />)}
      </div>
    </div>
  );
}

function ImageEditPanel({ tasks, createTask, setTasks }) {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [outputCount, setOutputCount] = useState(1);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [lightbox, setLightbox] = useState(null);
  const [showCountPicker, setShowCountPicker] = useState(false);
  const [barDragOver, setBarDragOver] = useState(false);
  const [selectedUploads, setSelectedUploads] = useState(new Set());
  const [selectedResults, setSelectedResults] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragSelectStart, setDragSelectStart] = useState(null);
  const [dragSelectRect, setDragSelectRect] = useState(null);
  const galleryRef = useRef(null);
  const inputRef = useRef(null);
  const imageTasks = tasks.filter((task) => task.type === 'image');
  const [savedResults, setSavedResults] = useState([]);

  useEffect(() => {
    fetch('/api/image/results')
      .then((r) => r.json())
      .then((d) => { if (d.Status) setSavedResults(d.results); })
      .catch(() => {});
    fetch('/api/storage/cleanup-temp', { method: 'POST' }).catch(() => {});
  }, []);

  const handleFiles = useCallback((selected) => {
    const next = Array.from(selected || []).filter((file) => file.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...next.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  }, []);

  const handleContainerDrop = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedUploads((prev) => {
      const next = new Set();
      prev.forEach((i) => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
      return next;
    });
  };

  const removeSelectedUploads = () => {
    const sorted = [...selectedUploads].sort((a, b) => b - a);
    setFiles((prev) => {
      const next = [...prev];
      sorted.forEach((i) => next.splice(i, 1));
      return next;
    });
    setSelectedUploads(new Set());
  };

  const toggleSelect = (index) => {
    setSelectedUploads((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  // Drag-select logic (desktop)
  const handleGalleryMouseDown = () => {};
  const handleGalleryMouseMove = () => {};
  const handleGalleryMouseUp = () => {};

  const handleDelete = async (task) => {
    if (!task.result?.storage_path || !task.result?.storage_bucket) return;
    const key = task.id || task.result.storage_path;
    setDeletingIds((prev) => new Set([...prev, key]));
    try {
      const res = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: task.result.storage_bucket, path: task.result.storage_path }),
      });
      const data = await res.json();
      if (data.Status) {
        const path = task.result.storage_path;
        setSavedResults((prev) => prev.filter((s) => s.storage_path !== path));
        setTasks((prev) => prev.map((t) => {
          if (t.result?.storage_path === path) {
            return { ...t, result: null, status: 'deleted' };
          }
          return t;
        }));
      }
    } catch {}
    setDeletingIds((prev) => { const s = new Set(prev); s.delete(key); return s; });
  };

  const toggleResultSelect = (src) => {
    setSelectedResults((prev) => {
      const next = new Set(prev);
      next.has(src) ? next.delete(src) : next.add(src);
      return next;
    });
  };

  const handleBarDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBarDragOver(false);
    // Prioritize file drops (from file system)
    if (e.dataTransfer?.files?.length) {
      handleFiles(e.dataTransfer.files);
      return;
    }
    // Fallback: URL text (drag from result grid)
    const url = e.dataTransfer.getData('text/plain');
    if (url && url.startsWith('http')) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = blob.type.split('/')[1] || 'jpg';
        const file = new File([blob], `image.${ext}`, { type: blob.type });
        setFiles((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
      } catch {}
    }
  };

  // Handle Ctrl+V paste images
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length) {
      e.preventDefault();
      handleFiles(imageFiles);
    }
  }, [handleFiles]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!files.length || !prompt.trim()) return;
    files.forEach((item) => {
      Array.from({ length: outputCount }).forEach((_, outputIndex) => {
        createTask({
          type: 'image',
          title: `${item.file.name}${outputCount > 1 ? ` #${outputIndex + 1}` : ''}`,
          detail: prompt.trim(),
          preview: item.preview,
          run: async () => {
            const formData = new FormData();
            formData.append('image', item.file);
            formData.append('prompt', prompt.trim());
            const res = await fetch('/api/image/edit', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.Status || !data.Url) throw new Error(data.msg || data.Error || 'Image editing failed');
            return data;
          },
        });
      });
    });
    setFiles([]);
    setSelectedUploads(new Set());
  };

  const sessionUrls = new Set(imageTasks.map((t) => t.result?.Url).filter(Boolean));
  const resultItems = [
    ...imageTasks.filter((t) => t.status === 'running').map((t) => ({ type: 'loading', task: t })),
    ...imageTasks.filter((t) => t.status === 'error' && !t._dismissed).map((t) => ({ type: 'error', task: t })),
    ...imageTasks.filter((t) => t.status !== 'deleted' && t.result?.Url).map((t) => ({ type: 'result', src: t.result.Url, task: t })),
    ...savedResults.filter((s) => !sessionUrls.has(s.url)).map((s) => ({ type: 'result', src: s.url, task: { result: s } })),
  ];

  // Auto-dismiss error cards after 3 seconds
  useEffect(() => {
    const errorTasks = imageTasks.filter((t) => t.status === 'error' && !t._dismissed);
    if (!errorTasks.length) return;
    const timers = errorTasks.map((t) => 
      setTimeout(() => {
        setTasks((prev) => prev.map((item) => 
          item.id === t.id ? { ...item, _dismissed: true } : item
        ));
      }, 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, [imageTasks, setTasks]);

  const handleLightboxDownload = async () => {
    if (!lightbox) return;
    try {
      const res = await fetch(lightbox);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'image.jpg';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {}
  };

  const handleLightboxCopyImage = async () => {
    if (!lightbox) return;
    try {
      const res = await fetch(lightbox);
      const blob = await res.blob();
      // Clipboard API requires image/png, convert via canvas
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const loaded = new Promise((resolve) => { img.onload = resolve; });
      img.src = URL.createObjectURL(blob);
      await loaded;
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    } catch (err) {
      console.error('Copy image failed:', err);
    }
  };

  const handleLightboxCopyLink = async () => {
    if (!lightbox) return;
    try {
      await navigator.clipboard.writeText(lightbox);
    } catch {}
  };

  const handleBatchDeleteResults = async () => {
    const toDelete = resultItems.filter((item) => item.type === 'result' && selectedResults.has(item.src));
    if (!toDelete.length) return;
    
    const deletedPaths = [];
    await Promise.all(toDelete.map(async (item) => {
      const { storage_path, storage_bucket } = item.task.result || {};
      if (!storage_path || !storage_bucket) return;
      try {
        const res = await fetch('/api/storage/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket: storage_bucket, path: storage_path }),
        });
        const data = await res.json();
        if (data.Status) {
          deletedPaths.push(storage_path);
        }
      } catch {}
    }));

    // Update savedResults - remove deleted ones
    setSavedResults((prev) => prev.filter((s) => !deletedPaths.includes(s.storage_path)));
    
    // Update tasks state properly via setTasks
    setTasks((prev) => prev.map((t) => {
      if (t.result?.storage_path && deletedPaths.includes(t.result.storage_path)) {
        return { ...t, result: null, status: 'deleted' };
      }
      return t;
    }));

    setSelectedResults(new Set());
    setSelectMode(false);
  };

  return (
    <div className="gflow-container" onDragOver={(e) => e.preventDefault()} onDrop={handleContainerDrop} onPaste={handlePaste}>
      {/* Lightbox */}
      {lightbox && (
        <div className="gflow-lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
          <div className="gflow-lightbox-actions" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleLightboxDownload} title="Download">
              <Download size={18} />
            </button>
            <button onClick={handleLightboxCopyImage} title="Copy Image">
              <Copy size={18} />
            </button>
            <button onClick={handleLightboxCopyLink} title="Copy Link">
              <Link size={18} />
            </button>
          </div>
          <button className="gflow-lightbox-close" onClick={() => setLightbox(null)}><X size={20} /></button>
        </div>
      )}

      {/* Input bar - top on mobile, bottom on desktop */}
      <div className="gflow-bar-wrap">
        {files.length > 0 && (
          <div className="gflow-bar-attachments">
            {files.map((item, index) => (
              <div key={`${item.file.name}-${index}`} className="gflow-bar-thumb">
                <img src={item.preview} alt="" />
                <button
                  type="button"
                  className="gflow-bar-thumb-remove"
                  onClick={() => removeFile(index)}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
        <form
          className={`gflow-input-bar${barDragOver ? ' drag-over' : ''}`}
          onSubmit={handleSubmit}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setBarDragOver(true); }}
          onDragLeave={() => setBarDragOver(false)}
          onDrop={handleBarDrop}
        >
          <button type="button" className="gflow-add-btn" onClick={() => inputRef.current?.click()}>
            <Plus size={20} />
          </button>
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/jpg" multiple onChange={(e) => handleFiles(e.target.files)} hidden />
          <button type="button" className="gflow-chip">
            <Wand2 size={14} />
            <span>Agen</span>
          </button>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Apa yang ingin Anda buat?"
            className="gflow-prompt-input"
          />
          <div className="gflow-right-actions">
            <div className="gflow-count-wrap">
              {showCountPicker && (
                <div className="gflow-count-dropdown">
                  {[1, 2, 3].map((n) => (
                    <button key={n} type="button" className={`gflow-count-opt${outputCount === n ? ' active' : ''}`}
                      onClick={() => { setOutputCount(n); setShowCountPicker(false); }}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
              <button type="button" className="gflow-output-chip" onClick={() => setShowCountPicker((v) => !v)}>
                <span>{outputCount}x</span>
              </button>
            </div>
            <button type="submit" className="gflow-send-btn" disabled={!files.length || !prompt.trim()}>
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>

      {/* Scrollable content area */}
      <div className="gflow-scroll-area">
        {resultItems.length > 0 && (
          <div className="gflow-result-section">
            <div className="gflow-upload-toolbar">
              {selectMode ? (
                <>
                  <span>{selectedResults.size} foto dipilih</span>
                  <button onClick={handleBatchDeleteResults} className="gflow-toolbar-del" disabled={!selectedResults.size}>
                    <Trash2 size={14} /> Hapus ({selectedResults.size})
                  </button>
                  <button onClick={() => { setSelectMode(false); setSelectedResults(new Set()); }} className="gflow-toolbar-cancel">Batal</button>
                </>
              ) : (
                <button onClick={() => setSelectMode(true)} className="gflow-toolbar-select">
                  <Trash2 size={14} /> Pilih Foto untuk Hapus
                </button>
              )}
            </div>
            <div className="gflow-result-grid">
              {resultItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`gflow-result-item ${item.type}${selectedResults.has(item.src) ? ' selected' : ''}`}
                  draggable={item.type === 'result'}
                  onDragStart={(e) => { if (item.src) e.dataTransfer.setData('text/plain', item.src); }}
                  onClick={() => {
                    if (item.type !== 'result') return;
                    if (selectMode) {
                      setSelectedResults((prev) => {
                        const next = new Set(prev);
                        next.has(item.src) ? next.delete(item.src) : next.add(item.src);
                        return next;
                      });
                    } else {
                      setLightbox(item.src);
                    }
                  }}
                >
                  {item.type === 'result' && (
                    <>
                      <img src={item.src} alt="" />
                      {selectedResults.has(item.src) && <div className="gflow-upload-check"><CheckCircle2 size={16} /></div>}
                      {!selectMode && (
                        <div className="gflow-gallery-hover">
                          <button onClick={async (e) => {
                            e.stopPropagation();
                            const res = await fetch(item.src);
                            const blob = await res.blob();
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = 'image.jpg';
                            a.click();
                          }}><Download size={14} /></button>
                          {item.task.result?.storage_path && (
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.task); }} disabled={deletingIds.has(item.task.id || item.task.result?.storage_path)}>
                              {deletingIds.has(item.task.id || item.task.result?.storage_path) ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {item.type === 'loading' && (
                    <div className="gflow-gallery-loading">
                      <div className="gflow-loading-pulse"></div>
                      <Loader2 size={18} className="spin" />
                      <span>{item.task.title}</span>
                    </div>
                  )}
                  {item.type === 'error' && (
                    <div className="gflow-gallery-error gflow-error-fadeout">
                      <AlertCircle size={16} />
                      <span>{item.task.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoUpscalePanel({ tasks, createTask }) {
  const [files, setFiles] = useState([]);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const inputRef = useRef(null);
  const videoTasks = tasks.filter((task) => task.type === 'video');

  const handleFiles = useCallback((selected) => {
    const next = Array.from(selected || []).filter((file) => file.type.startsWith('video/'));
    setFiles((prev) => [...prev, ...next.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer?.files);
  }, [handleFiles]);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDelete = async (task) => {
    if (!task.result?.storage_path || !task.result?.storage_bucket) return;
    setDeletingIds((prev) => new Set([...prev, task.id]));
    try {
      const res = await fetch('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: task.result.storage_bucket, path: task.result.storage_path }),
      });
      const data = await res.json();
      if (data.Status) {
        task.result = null;
        task.status = 'deleted';
      }
    } catch {}
    setDeletingIds((prev) => { const s = new Set(prev); s.delete(task.id); return s; });
  };

  const handleSubmit = () => {
    if (!files.length) return;

    files.forEach((item) => {
      createTask({
        type: 'video',
        title: item.file.name,
        detail: `${(item.file.size / 1024 / 1024).toFixed(1)} MB`,
        preview: item.preview,
        run: async () => {
          // Step 1: Get credentials (Qiniu token + Supabase upload path)
          const signRes = await fetch('/api/video/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: item.file.name }),
          });
          const signData = await signRes.json();
          if (!signData.Status) throw new Error(signData.msg || 'Failed to get credentials');

          // Step 2: Upload directly to Supabase from browser (no size limit, CORS ok)
          const uploadRes = await fetch(signData.supabase.uploadUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${signData.supabase.key}`,
              'apikey': signData.supabase.key,
              'Content-Type': item.file.type || 'video/mp4',
              'x-upsert': 'true',
            },
            body: item.file,
          });
          if (!uploadRes.ok) throw new Error('Upload ke Supabase gagal');

          // Step 3: Server transfers from Supabase to Qiniu (server-to-server, fast)
          const transferRes = await fetch('/api/video/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              supabaseUrl: signData.supabase.publicUrl,
              uploadUrl: signData.upload.url,
              token: signData.upload.token,
              key: signData.upload.key,
              filename: item.file.name,
            }),
          });
          const transferData = await transferRes.json();
          if (!transferData.Status) throw new Error(transferData.msg || 'Transfer gagal');

          // Step 4: Start processing (transcode)
          const processRes = await fetch('/api/video/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gnum: signData.gnum,
              cookies: signData.cookies,
              fileKey: signData.upload.key,
              filename: item.file.name,
            }),
          });
          const processData = await processRes.json();
          if (!processData.Status) throw new Error(processData.msg || 'Process start gagal');

          // Step 5: Poll until done
          let session = processData.session;
          const maxPolls = 120;
          const pollDelay = 5000;

          for (let i = 0; i < maxPolls; i++) {
            await new Promise((r) => setTimeout(r, pollDelay));
            try {
              const pollRes = await fetch('/api/video/poll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session, filename: item.file.name }),
              });
              const pollData = await pollRes.json();
              if (!pollData.Status) throw new Error(pollData.msg || 'Polling failed');
              if (pollData.done) {
                // Cleanup Supabase temp file
                fetch('/api/storage/delete', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ bucket: signData.supabase.bucket, path: signData.supabase.path }),
                }).catch(() => {});
                return pollData;
              }
              session = pollData.session;
            } catch (e) {
              if (e.message.includes('gagal')) throw e;
              continue;
            }
          }
          throw new Error('Video upscale timeout (10 menit)');
        },
      });
    });

    setFiles([]);
  };

  return (
    <div className="panel video-panel flow-panel">
      <div className="panel-header">
        <ArrowUpCircle size={22} />
        <h2>Video Upscale</h2>
      </div>

      <div
        className="dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Film size={40} strokeWidth={1} />
        <p>Drop video atau klik untuk upload</p>
        <span>MP4, MOV, WebM supported (max 4.5MB per file)</span>
        <input
          ref={inputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          hidden
        />
      </div>

      {!!files.length && (
        <>
          <div className="selected-grid video-selected-grid">
            {files.map((item, index) => (
              <div key={`${item.file.name}-${index}`} className="selected-file video-selected">
                <video src={item.preview} />
                <button type="button" className="btn-remove" onClick={() => removeFile(index)}><X size={16} /></button>
                <span>{item.file.name}</span>
              </div>
            ))}
          </div>
          <button className="btn-primary btn-upscale" onClick={handleSubmit}>
            <ArrowUpCircle size={18} />
            Kirim {files.length} Video ke Background
          </button>
        </>
      )}

      {/* Flow Grid for video results */}
      <div className="flow-grid flow-grid-video">
        {videoTasks.filter((t) => t.status !== 'deleted').map((task) => (
          <div key={task.id} className={`flow-card flow-card-video ${task.status}`}>
            {task.status === 'running' && (
              <div className="flow-card-loading">
                <Loader2 size={24} className="spin" />
                <span>Upscaling...</span>
              </div>
            )}
            {task.result?.Result_url && (
              <>
                <video src={task.result.Result_url} controls className="flow-card-video-player" />
                <div className="flow-card-video-bar">
                  <span>{task.title}</span>
                  <div className="flow-card-actions">
                    <a href={task.result.Result_url} download target="_blank" rel="noopener" className="flow-action-btn" title="Download">
                      <Download size={16} />
                    </a>
                    <a href={task.result.Result_url} target="_blank" rel="noopener" className="flow-action-btn" title="Open">
                      <ExternalLink size={16} />
                    </a>
                    {task.result?.storage_path && (
                      <button
                        className="flow-action-btn flow-action-delete"
                        onClick={() => handleDelete(task)}
                        disabled={deletingIds.has(task.id)}
                        title="Delete"
                      >
                        {deletingIds.has(task.id) ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
            {task.error && (
              <div className="flow-card-error">
                <AlertCircle size={18} />
                <span>{task.error}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState('home');
  const [tasks, setTasks] = useState([]);

  const createTask = useCallback((taskConfig) => {
    const id = `${taskConfig.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const task = {
      id,
      status: 'running',
      createdAt: Date.now(),
      result: null,
      error: '',
      ...taskConfig,
    };

    setTasks((prev) => [task, ...prev]);

    taskConfig.run()
      .then((result) => {
        setTasks((prev) => prev.map((item) => (
          item.id === id ? { ...item, status: 'done', result } : item
        )));
      })
      .catch((error) => {
        setTasks((prev) => prev.map((item) => (
          item.id === id ? { ...item, status: 'error', error: error.message } : item
        )));
      });
  }, []);

  const renderPanel = () => {
    switch (activeNav) {
      case 'tiktok': return <TikTokPanel tasks={tasks} createTask={createTask} />;
      case 'image': return <ImageEditPanel tasks={tasks} createTask={createTask} setTasks={setTasks} />;
      case 'video': return <VideoUpscalePanel tasks={tasks} createTask={createTask} />;
      default: return <HomePanel onNavigate={setActiveNav} tasks={tasks} />;
    }
  };

  return (
    <div className="flow-shell">
      <header className="topbar">
        <div className="topbar-left">
          <button className="icon-btn" onClick={() => setActiveNav('home')}>
            <ArrowLeft size={18} />
          </button>
          <span className="topbar-date">Flow Tools</span>
        </div>

        <div className="topbar-center">
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input type="text" className="search-input" placeholder="Search" />
          </div>
        </div>

        <div className="topbar-right">
          <button className="icon-btn"><Settings size={18} /></button>
          <div className="user-avatar">U</div>
        </div>
      </header>

      <GlobalTaskBar tasks={tasks} />

      <div className="flow-body">
        <aside className="sidebar">
          <nav className="sidebar-nav">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`sidebar-btn${activeNav === item.id ? ' active' : ''}`}
                onClick={() => setActiveNav(item.id)}
                title={item.label}
              >
                <item.icon size={18} strokeWidth={1.5} />
              </button>
            ))}
          </nav>
          <div className="sidebar-spacer" />
        </aside>

        <main className={`main-area${activeNav === 'image' ? ' main-area-flush' : ''}`}>
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}
