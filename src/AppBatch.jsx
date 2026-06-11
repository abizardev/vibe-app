import { useState, useRef, useCallback } from 'react';
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      desc: 'Batch edit image dan pilih 1/2/3 output per gambar',
      color: '#8ab4f8',
    },
    {
      id: 'video',
      icon: ArrowUpCircle,
      title: 'Video Upscale',
      desc: 'Batch upscale video yang tetap jalan di background',
      color: '#34a853',
    },
  ];

  return (
    <div className="home-panel">
      <div className="home-hero">
        <h1 className="home-title">Flow Tools</h1>
        <p className="home-subtitle">AI-powered media toolkit with background batch processing</p>
      </div>

      {!!tasks.length && (
        <div className="dashboard-summary">
          <h3>Recent Tasks</h3>
          <div className="task-list compact">
            {tasks.slice(0, 8).map((task) => (
              <div key={task.id} className={`task-row ${task.status}`}>
                <TaskStatusIcon status={task.status} />
                <span>{task.title}</span>
                <small>{task.detail}</small>
              </div>
            ))}
          </div>
        </div>
      )}

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
          if (index > 0) {
            await sleep(index * 1100);
          }
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
          placeholder="Paste banyak link TikTok di sini. Pisahkan dengan enter, spasi, atau koma. Request akan dijeda 1 detik per link..."
          className="text-area"
          rows={6}
        />
        <div className="form-footer">
          <span>{splitTikTokUrls(urls).length} link terdeteksi • jeda 1 detik/request</span>
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

function ImageEditPanel({ tasks, createTask }) {
  const [files, setFiles] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [outputCount, setOutputCount] = useState(1);
  const inputRef = useRef(null);
  const imageTasks = tasks.filter((task) => task.type === 'image');

  const handleFiles = useCallback((selected) => {
    const next = Array.from(selected || []).filter((file) => file.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...next.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer?.files);
  }, [handleFiles]);

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!files.length || !prompt.trim()) return;

    files.forEach((item) => {
      Array.from({ length: outputCount }).forEach((_, outputIndex) => {
        createTask({
          type: 'image',
          title: `${item.file.name} • Output ${outputIndex + 1}`,
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
  };

  return (
    <div className="panel image-panel">
      <div className="panel-header">
        <Wand2 size={22} />
        <h2>AI Image Edit Batch</h2>
      </div>

      <form className="batch-form" onSubmit={handleSubmit}>
        <div
          className="dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload size={40} strokeWidth={1} />
          <p>Drop banyak image sekaligus atau klik untuk upload</p>
          <span>JPG, JPEG, PNG supported</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            hidden
          />
        </div>

        {!!files.length && (
          <div className="selected-grid">
            {files.map((item, index) => (
              <div key={`${item.file.name}-${index}`} className="selected-file">
                <img src={item.preview} alt="" />
                <button type="button" className="btn-remove" onClick={() => removeFile(index)}><X size={16} /></button>
                <span>{item.file.name}</span>
              </div>
            ))}
          </div>
        )}

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to change..."
          className="text-input"
        />

        <div className="form-footer">
          <div className="output-picker">
            <span>Output per image</span>
            {[1, 2, 3].map((count) => (
              <button
                key={count}
                type="button"
                className={outputCount === count ? 'active' : ''}
                onClick={() => setOutputCount(count)}
              >
                {count}
              </button>
            ))}
          </div>
          <button type="submit" className="btn-primary" disabled={!files.length || !prompt.trim()}>
            <Wand2 size={18} />
            Kirim {files.length * outputCount || 0} Request
          </button>
        </div>
      </form>

      <div className="batch-results">
        {imageTasks.map((task) => (
          <div key={task.id} className={`batch-card ${task.status}`}>
            <div className="batch-card-head">
              <TaskStatusIcon status={task.status} />
              <div>
                <strong>{task.title}</strong>
                <small>{task.detail}</small>
              </div>
            </div>
            <div className="image-compare">
              {task.preview && (
                <div className="image-card">
                  <div className="image-card-label">Original</div>
                  <img src={task.preview} alt="" />
                </div>
              )}
              {task.result?.Url && (
                <div className="image-card result-card">
                  <div className="image-card-label">Result</div>
                  <img src={task.result.Url} alt="" />
                </div>
              )}
            </div>
            {task.error && <div className="msg msg-error"><AlertCircle size={16} /><span>{task.error}</span></div>}
            {task.result?.Url && (
              <div className="download-actions">
                <a href={task.result.Url} download target="_blank" rel="noopener" className="btn-download btn-hd"><Download size={16} />Download</a>
                <a href={task.result.Url} target="_blank" rel="noopener" className="btn-download"><ExternalLink size={16} />Open</a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoUpscalePanel({ tasks, createTask }) {
  const [files, setFiles] = useState([]);
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

  const handleSubmit = () => {
    if (!files.length) return;

    files.forEach((item) => {
      createTask({
        type: 'video',
        title: item.file.name,
        detail: `${(item.file.size / 1024 / 1024).toFixed(1)} MB`,
        preview: item.preview,
        run: async () => {
          const formData = new FormData();
          formData.append('video', item.file);
          const res = await fetch('/api/video/upscale', { method: 'POST', body: formData });
          const data = await res.json();
          if (!data.Status || !data.Result_url) throw new Error(data.msg || 'Video upscale failed');
          return data;
        },
      });
    });

    setFiles([]);
  };

  return (
    <div className="panel video-panel">
      <div className="panel-header">
        <ArrowUpCircle size={22} />
        <h2>Video Upscale Batch</h2>
      </div>

      <div
        className="dropzone"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Film size={40} strokeWidth={1} />
        <p>Drop banyak video sekaligus atau klik untuk upload</p>
        <span>MP4, MOV, WebM supported (max 200MB per file)</span>
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

      <div className="batch-results">
        {videoTasks.map((task) => (
          <div key={task.id} className={`batch-card ${task.status}`}>
            <div className="batch-card-head">
              <TaskStatusIcon status={task.status} />
              <div>
                <strong>{task.title}</strong>
                <small>{task.detail}</small>
              </div>
            </div>
            <div className="video-preview-section">
              {task.preview && (
                <div className="video-card">
                  <div className="image-card-label">Original</div>
                  <video src={task.preview} controls className="video-player" />
                </div>
              )}
              {task.result?.Result_url && (
                <div className="video-card result-card">
                  <div className="image-card-label">Enhanced</div>
                  <video src={task.result.Result_url} controls className="video-player" />
                </div>
              )}
            </div>
            {task.error && <div className="msg msg-error"><AlertCircle size={16} /><span>{task.error}</span></div>}
            {task.result?.Result_url && (
              <div className="download-actions">
                <a href={task.result.Result_url} download target="_blank" rel="noopener" className="btn-download btn-hd"><Download size={16} />Download Enhanced</a>
                <a href={task.result.Result_url} target="_blank" rel="noopener" className="btn-download"><ExternalLink size={16} />Open</a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppBatch() {
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
      case 'image': return <ImageEditPanel tasks={tasks} createTask={createTask} />;
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
          <button className="icon-btn icon-btn-sm">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="topbar-center">
          <div className="search-bar">
            <Search size={16} className="search-icon" />
            <input type="text" className="search-input" placeholder="Search" />
          </div>
          <button className="icon-btn filter-btn">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        <div className="topbar-right">
          <button className="icon-btn"><Plus size={18} /></button>
          <button className="icon-btn"><HelpCircle size={18} /></button>
          <button className="icon-btn"><Settings size={18} /></button>
          <button className="icon-btn"><MoreVertical size={18} /></button>
          <div className="pro-badge">PRO</div>
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

        <main className="main-area">
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}
