# Draft: Flow Deployment - GitHub + Vercel + Hugging Face

## Requirements (confirmed)
- Extract file.zip ke /root/flow: DONE
- Pelajari struktur aplikasi: IN PROGRESS
- Deploy ke GitHub: repositori baru untuk flow
- Deploy frontend+API ke Vercel
- Deploy HD video backend ke Hugging Face Spaces (solusi timeout Vercel)

## Technical Decisions
- **Aplikasi**: Vibe-app - React + Vite frontend, Express backend
- **Fitur utama**: TikTok download, AI image edit, Video upscale (HD)
- **Masalah**: Vercel timeout untuk HD video processing (maxDuration: 60s di vercel.json)
- **Solusi**: Split architecture - frontend+lite API di Vercel, HD video backend di HF Spaces

## Research Findings
- **Stack**: React 18, Vite 5, Express 5, Multer, Axios
- **Backend services**: 
  - `wink.js` - HD video upscale (TIMEOUT CANDIDATE untuk HF Spaces)
  - `nanobanana.js` - AI image edit
  - `tiktok.js` - TikTok downloader
  - `supabase.js` - Storage untuk hasil
- **Vercel config**: `vercel.json` dengan maxDuration 60s (tidak cukup untuk HD video)
- **API endpoints**: 
  - `/api/video/*` - sign, transfer, process, poll (PINDAH KE HF)
  - `/api/image/*` - edit (TETAP DI VERCEL)
  - `/api/tiktok/*` - download (TETAP DI VERCEL)

## Technical Analysis (Completed)
- **Credentials ditemukan**:
  - Supabase URL + SERVICE_KEY hardcoded di `server/services/supabase.js` (HARUS PINDAH KE ENV)
  - NanoBanana API: https://apis.snowping.eu.cc (public, no auth)
  - TikTok API: https://www.tikwm.com (public, no auth)
  - Wink.ai: no explicit API key (menggunakan session cookies)

- **CLI Tools tersedia**:
  - Git 2.48.1 ✓
  - GitHub CLI 2.93.0 ✓
  - Vercel CLI 54.9.1 ✓

- **Service Split Strategy**:
  - **Vercel** (fast, <60s): Frontend, TikTok download, Image edit, Video sign/transfer
  - **HF Spaces** (long-running): Video process + poll endpoints (wink.js HD upscale)

## Deployment Architecture Decision

### Split Strategy (Final)
```
┌─────────────────────────────────────────────────────────────┐
│ VERCEL (Frontend + Lite API)                                │
│ - React + Vite build → static files                         │
│ - /api/tiktok/* → fast (<5s response)                       │
│ - /api/image/* → moderate (~10-30s)                         │
│ - /api/video/sign → instant (credential generation)         │
│ - /api/video/transfer → moderate (server-to-server upload)  │
│ - /api/proxy, /api/storage/* → fast                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Frontend calls for video processing
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ HUGGING FACE SPACES (HD Video Backend)                      │
│ - Docker runtime dengan Express.js                          │
│ - /api/video/process → start HD upscale                     │
│ - /api/video/poll → long-polling (2-5 minutes total)        │
│ - Only wink.js service + dependencies                       │
└─────────────────────────────────────────────────────────────┘
```

### Environment Variables Strategy
- **Phase 1 (MVP)**: Hardcoded values tetap (sudah ada di code)
- **Phase 2 (Production)**: Move ke env vars (SUPABASE_URL, SUPABASE_SERVICE_KEY)

## Decisions Made (Proceeding with defaults)
- Repo name: `flow-app`
- HF Spaces: Docker runtime (pure Express, no Gradio wrapper - lebih simple untuk API)
- Env vars: Tetap hardcoded untuk deployment pertama (bisa migrate nanti)

## Files to Create (New)

### For HF Spaces
- `hf-spaces/Dockerfile` - Container definition untuk Express backend
- `hf-spaces/package.json` - Dependencies untuk video processing only
- `hf-spaces/server.js` - Express entry point (port 7860 - HF default)
- `hf-spaces/services/wink.js` - Copy dari main repo
- `hf-spaces/services/supabase.js` - Copy dari main repo
- `hf-spaces/README.md` - HF Spaces documentation
- `hf-spaces/.env.example` - Environment variables template

### For Vercel
- `.env.example` - Document required env vars
- `README.md` - Setup and deployment instructions

### For GitHub
- `.github/workflows/deploy.yml` - (Optional) CI/CD pipeline
- Update `.gitignore` - Add HF Spaces specific ignores

## Scope Boundaries
- INCLUDE:
  - Create GitHub repo + push semua files
  - Deploy Vercel untuk frontend + API ringan (image, tiktok)
  - Setup HF Spaces untuk HD video backend (/api/video/*)
  - Create HF Spaces deployment files (Dockerfile, isolated package.json)
  - Update frontend untuk point ke HF Spaces endpoint untuk video
  - Environment variables documentation (.env.example)
  - Testing deployment: TikTok download, Image edit, Video upscale end-to-end
  
- EXCLUDE:
  - Migration data existing (fresh deployment)
  - Custom domain setup
  - CI/CD pipeline automation (manual deploy untuk MVP)
  - Monitoring/logging infrastructure
  - Moving hardcoded credentials to env vars (Phase 2)
  - Rate limiting / authentication layer

## Acceptance Criteria (Draft)
1. GitHub repo created, all source code pushed
2. Vercel deployment live, frontend accessible
3. TikTok download works end-to-end via Vercel API
4. Image edit works end-to-end via Vercel API
5. HF Spaces deployment live, /api/video/* endpoints accessible
6. Video upscale works end-to-end: frontend → Vercel sign → HF process → result displayed
7. All three features tested with real inputs and confirmed working
8. README.md dengan deployment instructions complete

## Task Breakdown (Preliminary)

### Wave 1: Repository Setup (parallel)
1. Create `.env.example` with all required env vars
2. Update `.gitignore` untuk HF Spaces artifacts
3. Initialize git repo + create GitHub remote
4. Create README.md dengan deployment instructions

### Wave 2: Prepare HF Spaces Backend (parallel)
5. Create `hf-spaces/` directory structure
6. Create `hf-spaces/Dockerfile` (depends on librarian research)
7. Create `hf-spaces/package.json` (minimal deps: express, cors, form-data)
8. Create `hf-spaces/server.js` (Express app on port 7860)
9. Copy + adapt `services/wink.js` and `services/supabase.js`
10. Create `hf-spaces/README.md` with HF Spaces setup instructions

### Wave 3: Deploy HF Spaces (sequential)
11. Test HF backend locally (docker build + run)
12. Create HF Space via web UI or CLI
13. Push to HF Spaces repository
14. Verify `/api/video/process` and `/api/video/poll` endpoints live

### Wave 4: Prepare Vercel Deployment (parallel with Wave 3)
15. Update frontend API calls to use HF Spaces URL for video endpoints
16. Test locally: frontend → HF Spaces video API
17. Verify vercel.json configuration

### Wave 5: Deploy Vercel + GitHub (sequential)
18. Push all code to GitHub repo
19. Link Vercel project to GitHub repo
20. Configure Vercel environment variables (if needed)
21. Deploy to Vercel
22. Verify frontend + API endpoints live

### Wave 6: End-to-End Testing (sequential)
23. Test TikTok download with real URL
24. Test Image edit with sample image + prompt
25. Test Video upscale with sample video (full flow: sign → transfer → HF process → poll → result)
26. Document any issues and fixes needed

---

## Metis Critical Findings

### MUST ANSWER Before Plan Generation
1. **HF Spaces URL Strategy**: 
   - Option A: Hardcode HF_SPACES_URL in frontend env (CORS from HF to Vercel)
   - Option B: Proxy /api/video/* through Vercel to HF Spaces (no CORS issue)
   - **Decision**: Option B - proxy through Vercel (simpler, no frontend changes)

2. **Deployment Safety**:
   - Keep wink.js on Vercel initially
   - Deploy HF Spaces in parallel
   - Only remove wink.js from Vercel after HF proven working
   - **Decision**: Phased cutover with rollback capability

3. **Supabase Keys**:
   - **Decision**: Private GitHub repo (keys stay hardcoded for MVP)

### Assumptions to Validate
- [ ] Vercel plan tier: Check actual maxDuration limit
- [ ] wink.js execution time: Measure locally with sample video
- [ ] HF Spaces free tier: Confirm 16GB RAM sufficient for wink.js
- [ ] Local dev works: Test all 3 services with `npm run dev`

### Guardrails (MUST NOT)
- Add authentication, monitoring, retry queues, CI/CD
- Refactor code structure (deploy as-is)
- Optimize performance (use existing wink.js)

### Guardrails (MUST)
- Executable verification commands for ALL acceptance criteria
- Test happy path + edge cases (invalid inputs, timeouts)
- CORS between Vercel ↔ HF Spaces
- Health check endpoints (/api/health) on both platforms
- Rollback commands documented for each deployment step
