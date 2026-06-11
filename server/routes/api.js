import { Router } from "express";
import multer from "multer";
import { tiktokDownloader } from "../services/tiktok.js";
import { editImage } from "../services/nanobanana.js";
import { getUploadCredentials, startProcessing, pollProgress } from "../services/wink.js";
import {
  uploadImageResult,
  uploadImageResultFromUrl,
  uploadImageToStorage,
  uploadVideoResult,
  deleteFile,
} from "../services/supabase.js";

const router = Router();

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4.5 * 1024 * 1024 },
});

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4.5 * 1024 * 1024 },
});

// Sliding window rate limit: max 1 req per 1.1s
let lastTikTokStart = 0;
let tiktokQueue = Promise.resolve();

router.post("/tiktok/download", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ Status: false, Code: 400, msg: "URL is required" });

  tiktokQueue = tiktokQueue.then(async () => {
    // Ensure at least 1.1s since last request START (not end)
    const wait = 1100 - (Date.now() - lastTikTokStart);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastTikTokStart = Date.now();
    try {
      const result = await tiktokDownloader(url);
      res.json(result);
    } catch (error) {
      console.error("[TikTok Error]", error.message);
      res.status(500).json({ Status: false, Code: 500, msg: error.message });
    }
  });
});

router.post("/image/edit", uploadImage.single("image"), async (req, res) => {
  try {
    const { prompt } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ Status: false, Code: 400, msg: "Image file is required" });
    }
    if (!prompt) {
      return res.status(400).json({ Status: false, Code: 400, msg: "Prompt is required" });
    }

    console.log(`[Image Edit] Processing: ${file.originalname} | Prompt: "${prompt}"`);

    // Step 1: Upload original image to Supabase to get a public URL
    const uploaded = await uploadImageToStorage(file.buffer, file.originalname);
    console.log(`[Image Edit] Uploaded to Supabase: ${uploaded.url}`);

    // Step 2: Call edit API with the public URL
    const result = await editImage(uploaded.url, prompt);

    // Step 3: Save result image to Supabase (download from result URL)
    const stored = await uploadImageResultFromUrl(result.imageUrl, `result_${Date.now()}.webp`);

    // Step 4: Delete the original upload (temp)
    try { await deleteFile(uploaded.bucket, uploaded.path); } catch {}

    return res.json({
      Status: true,
      Code: 200,
      Prompt: prompt,
      Url: stored.url,
      storage_path: stored.path,
      storage_bucket: stored.bucket,
    });
  } catch (error) {
    console.error("[Image Edit Error]", error.message);
    return res.status(200).json({ Status: false, Code: 500, msg: error.message });
  }
});

router.post("/video/sign", async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ Status: false, msg: "filename is required" });
    const credentials = await getUploadCredentials(filename);

    // Also generate a Supabase upload path for browser direct upload
    const crypto = await import("node:crypto");
    const ext = filename.split(".").pop()?.toLowerCase() || "mp4";
    const id = crypto.randomBytes(12).toString("hex");
    const supabasePath = `temp/${id}_${Date.now()}.${ext}`;
    const SUPABASE_URL = "https://tklrhrwcivprtebhnrde.supabase.co";
    const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbHJocndjaXZwcnRlYmhucmRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzg5NDE5OCwiZXhwIjoyMDkzNDcwMTk4fQ._55geOiWRnZILSkRhUdNLS43P5fIWoZ7WdGYE6SSND4";

    return res.json({
      Status: true,
      ...credentials,
      supabase: {
        uploadUrl: `${SUPABASE_URL}/storage/v1/object/videos/${supabasePath}`,
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/videos/${supabasePath}`,
        path: supabasePath,
        bucket: "videos",
        key: SUPABASE_KEY,
      },
    });
  } catch (error) {
    console.error("[Video Sign Error]", error.message);
    return res.status(500).json({ Status: false, msg: error.message });
  }
});

// Transfer: download from Supabase, upload to Qiniu (server-to-server, fast)
router.post("/video/transfer", async (req, res) => {
  try {
    const { supabaseUrl, uploadUrl, token, key, filename } = req.body;
    if (!supabaseUrl || !uploadUrl || !token || !key) {
      return res.status(400).json({ Status: false, msg: "supabaseUrl, uploadUrl, token, key required" });
    }

    // Download from Supabase (server-to-server, fast)
    const dlRes = await fetch(supabaseUrl);
    if (!dlRes.ok) throw new Error(`Download from Supabase failed: ${dlRes.status}`);
    const videoBuffer = Buffer.from(await dlRes.arrayBuffer());

    // Upload to Qiniu
    const crypto = await import("node:crypto");
    const boundary = `----FormBoundary${crypto.randomBytes(8).toString("hex")}`;
    const ext = (filename || "video.mp4").split(".").pop()?.toLowerCase() || "mp4";
    const mimeMap = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };
    const mime = mimeMap[ext] || "application/octet-stream";
    const fname = filename || "video.mp4";

    const parts = [];
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fname}"\r\nContent-Type: ${mime}\r\n\r\n`);
    parts.push(videoBuffer);
    parts.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="token"\r\n\r\n${token}`);
    parts.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="key"\r\n\r\n${key}`);
    parts.push(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="fname"\r\n\r\n${fname}`);
    parts.push(`\r\n--${boundary}--\r\n`);

    const buffers = parts.map((p) => (typeof p === "string" ? Buffer.from(p) : p));
    const body = Buffer.concat(buffers);

    const qRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        origin: "https://wink.ai",
        referer: "https://wink.ai/",
        accept: "*/*",
      },
      body,
    });

    const qData = await qRes.json();
    if (!qRes.ok) throw new Error(`Qiniu upload failed: ${JSON.stringify(qData)}`);

    return res.json({ Status: true, data: qData });
  } catch (error) {
    console.error("[Video Transfer Error]", error.message);
    return res.status(500).json({ Status: false, msg: error.message });
  }
});

router.post("/video/process", async (req, res) => {
  try {
    const { gnum, cookies, fileKey, filename } = req.body;
    if (!gnum || !cookies || !fileKey) {
      return res.status(400).json({ Status: false, msg: "gnum, cookies, fileKey required" });
    }
    const result = await startProcessing({ gnum, cookiesJson: cookies, fileKey, filename });
    return res.json({ Status: true, session: result });
  } catch (error) {
    console.error("[Video Process Error]", error.message);
    return res.status(500).json({ Status: false, msg: error.message });
  }
});

router.post("/video/poll", async (req, res) => {
  try {
    const { session, filename } = req.body;
    if (!session) return res.status(400).json({ Status: false, msg: "session required" });

    const result = await pollProgress(session);

    if (result.done && result.resultUrl) {
      // Save to Supabase
      try {
        const stored = await uploadVideoResult(result.resultUrl, filename || "video.mp4");
        return res.json({
          Status: true, done: true,
          Result_url: stored.url,
          storage_path: stored.path,
          storage_bucket: stored.bucket,
        });
      } catch (storageErr) {
        return res.json({ Status: true, done: true, Result_url: result.resultUrl });
      }
    }

    return res.json({
      Status: true,
      done: false,
      session: { ...session, ...result, done: undefined, resultUrl: undefined },
    });
  } catch (error) {
    console.error("[Video Poll Error]", error.message);
    return res.status(500).json({ Status: false, msg: error.message });
  }
});

// Get upload URL for client-side direct upload to Supabase
router.post("/storage/upload-url", async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ Status: false, msg: "filename is required" });
    }
    const { uploadVideoTemp } = await import("../services/supabase.js");
    // We return the public URL pattern - client uploads via PUT
    const crypto = await import("node:crypto");
    const ext = filename.split(".").pop()?.toLowerCase() || "mp4";
    const id = crypto.randomBytes(12).toString("hex");
    const filePath = `temp/${id}_${Date.now()}.${ext}`;
    const bucket = "videos";
    const uploadUrl = `https://tklrhrwcivprtebhnrde.supabase.co/storage/v1/object/${bucket}/${filePath}`;
    const publicUrl = `https://tklrhrwcivprtebhnrde.supabase.co/storage/v1/object/public/${bucket}/${filePath}`;
    return res.json({ Status: true, uploadUrl, publicUrl, path: filePath, bucket });
  } catch (error) {
    console.error("[Upload URL Error]", error.message);
    return res.status(500).json({ Status: false, msg: error.message });
  }
});

// Delete file from Supabase storage
router.post("/storage/delete", async (req, res) => {
  try {
    const { bucket, path: filePath } = req.body;
    if (!bucket || !filePath) {
      return res.status(400).json({ Status: false, msg: "bucket and path are required" });
    }
    await deleteFile(bucket, filePath);
    return res.json({ Status: true, msg: "File deleted" });
  } catch (error) {
    console.error("[Storage Delete Error]", error.message);
    return res.status(500).json({ Status: false, msg: error.message });
  }
});

router.get("/proxy", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ msg: "url query param is required" });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ msg: `Proxy error: ${response.status}` });
    }

    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    const contentLength = response.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    res.setHeader("Content-Disposition", "attachment");

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error("[Proxy Error]", error.message);
    return res.status(500).json({ msg: error.message });
  }
});

// List saved image results
router.get("/image/results", async (req, res) => {
  try {
    const { listFiles } = await import("../services/supabase.js");
    const files = await listFiles("images", "results");
    const results = files
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 100)
      .map((f) => ({
        url: `https://tklrhrwcivprtebhnrde.supabase.co/storage/v1/object/public/images/results/${f.name}`,
        storage_path: `results/${f.name}`,
        storage_bucket: "images",
        created_at: f.created_at,
      }));
    return res.json({ Status: true, results });
  } catch (error) {
    return res.status(500).json({ Status: false, msg: error.message });
  }
});

// Cleanup temp files older than 60 minutes
router.post("/storage/cleanup-temp", async (req, res) => {
  try {
    const { listFiles, deleteFile } = await import("../services/supabase.js");
    const cutoff = Date.now() - 60 * 60 * 1000;
    const files = await listFiles("videos", "temp");
    const toDelete = files.filter((f) => new Date(f.created_at).getTime() < cutoff);
    await Promise.all(toDelete.map((f) => deleteFile("videos", `temp/${f.name}`).catch(() => {})));
    return res.json({ Status: true, deleted: toDelete.length });
  } catch (error) {
    return res.status(500).json({ Status: false, msg: error.message });
  }
});

export default router;
