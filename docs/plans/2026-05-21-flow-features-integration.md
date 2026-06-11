# Flow Features Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate three tools (TikTok Download, AI Image Edit, Video Upscale) into the Google Flow clone UI, with full upload/process/download functionality.

**Architecture:** Express.js backend server proxied through Vite handles all API calls to external services. React frontend provides UI panels per feature via sidebar navigation. File uploads use multer, results display inline with download buttons.

**Tech Stack:** React 18, Vite, Express.js, Multer, Axios, lucide-react, tough-cookie, axios-cookiejar-support, form-data

---

## Feature Summary

| Feature | Source File | Input | Output |
|---------|------------|-------|--------|
| TikTok Download | `tikwm.js` | TikTok URL | Video metadata + download links |
| AI Image Edit | `nanobanana.mjs` | Image file + text prompt | AI-edited image URL |
| Video Upscale | `wink-upscale-video.js` | Video file | Enhanced/upscaled video URL |

---

### Task 1: Install Backend Dependencies

**Step 1:** Update `package.json` to add backend + dev deps

```bash
npm install express multer cors axios form-data tough-cookie axios-cookiejar-support
npm install -D concurrently nodemon
```

**Step 2:** Add scripts to `package.json`

```json
{
  "scripts": {
    "dev": "concurrently \"vite\" \"nodemon server/index.js\"",
    "dev:client": "vite",
    "dev:server": "nodemon server/index.js",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

**Step 3:** Update `vite.config.js` with proxy to Express (port 3001)

---

### Task 2: Create Backend Server

**Files:**
- Create: `server/index.js` — Express entry point (port 3001)
- Create: `server/routes/api.js` — API router
- Create: `server/services/tiktok.js` — TikTok download service
- Create: `server/services/nanobanana.js` — AI image edit service
- Create: `server/services/wink.js` — Video upscale service

**API Endpoints:**
- `POST /api/tiktok/download` — Body: `{ url }` → TikTok video info + download links
- `POST /api/image/edit` — Multipart: `image` file + `prompt` field → Result image URL
- `POST /api/video/upscale` — Multipart: `video` file → Result video URL
- `GET /api/proxy?url=...` — Proxy download for CORS-free media access

---

### Task 3: Port TikTok Download Service

Adapt `tikwm.js` into `server/services/tiktok.js`:
- Export async function `tiktokDownloader(url)`
- Returns `{ Status, Code, data: { title, cover, play, hdplay, music, author, ... } }`
- Simplest service — direct API call to tikwm.com

---

### Task 4: Port NanoBanana Image Edit Service

Adapt `nanobanana.mjs` into `server/services/nanobanana.js`:
- Export async function `editImage(imageBuffer, filename, prompt)`
- Accepts Buffer instead of file path
- Session management in-memory (no file writes)
- WASM initialization, signing, S3 upload, task creation, polling, signed URL return
- Returns `{ Status, Code, Prompt, Url }`

---

### Task 5: Port Wink Video Upscale Service

Adapt `wink-upscale-video.js` into `server/services/wink.js`:
- Export async function `upscaleVideo(videoBuffer, filename)`
- Accepts Buffer instead of file path
- Cookie jar, MAAT sign, Qiniu upload, transcode, delivery, polling
- Returns `{ Status, Code, Result_url }`

---

### Task 6: Rebuild Frontend UI

**Files:**
- Rewrite: `src/App.jsx` — Main app with sidebar navigation, 3 feature panels
- Rewrite: `src/App.css` — Updated styles for feature panels

**UI Structure:**
- Sidebar: Home, TikTok Download, Image Edit, Video Upscale icons
- Top bar: Keep existing (back, search, settings, avatar)
- Main area: Feature-specific panel based on active sidebar selection
- Bottom prompt bar: Removed or repurposed

**Feature Panels:**
1. **Home**: Welcome/empty state with instructions
2. **TikTok Download**: URL input → video preview card with metadata + download buttons
3. **Image Edit**: Drag-drop image upload + prompt input → before/after comparison + download
4. **Video Upscale**: Drag-drop video upload → progress bar → result video player + download

---

### Task 7: Testing & Verification

- Test TikTok download with a real TikTok URL
- Test Image Edit with a sample image + prompt
- Test Video Upscale with a sample video
- Verify all downloads work
- Verify error handling for invalid inputs
