import crypto from "node:crypto";

const SUPABASE_URL = "https://miwhnljvdcusanmqfbhi.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pd2hubGp2ZGN1c2FubXFmYmhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE1NDk0OCwiZXhwIjoyMDk2NzMwOTQ4fQ.VgduPDINbcVmcDfSAWA1Ns53sXqOBZzJheeC3qxOAJE";

const BUCKET_IMAGES = "images";
const BUCKET_VIDEOS = "videos";

function generatePath(prefix, ext) {
  const id = crypto.randomBytes(12).toString("hex");
  const ts = Date.now();
  return `${prefix}/${id}_${ts}.${ext}`;
}

function getMimeType(filename) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
  };
  return map[ext] || "application/octet-stream";
}

async function uploadToStorage(bucket, filePath, buffer, contentType) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upload gagal: ${res.status} ${text}`);
  }

  return getPublicUrl(bucket, filePath);
}

function getPublicUrl(bucket, filePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
}

async function deleteFromStorage(bucket, filePath) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [filePath] }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase delete gagal: ${res.status} ${text}`);
  }

  return true;
}

export async function uploadImageResult(buffer, originalFilename) {
  const ext = originalFilename.split(".").pop()?.toLowerCase() || "png";
  const filePath = generatePath("results", ext);
  const contentType = getMimeType(originalFilename);
  const url = await uploadToStorage(BUCKET_IMAGES, filePath, buffer, contentType);
  return { url, path: filePath, bucket: BUCKET_IMAGES };
}

export async function uploadImageToStorage(buffer, originalFilename) {
  const ext = originalFilename.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = generatePath("uploads", ext);
  const contentType = getMimeType(originalFilename);
  const url = await uploadToStorage(BUCKET_IMAGES, filePath, buffer, contentType);
  return { url, path: filePath, bucket: BUCKET_IMAGES };
}

export async function uploadImageResultFromUrl(imageUrl, originalFilename) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Gagal download image dari URL: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = originalFilename?.split(".").pop()?.toLowerCase() || "png";
  const filePath = generatePath("results", ext);
  const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;
  const url = await uploadToStorage(BUCKET_IMAGES, filePath, buffer, contentType);
  return { url, path: filePath, bucket: BUCKET_IMAGES };
}

export async function uploadVideoTemp(buffer, filename) {
  const ext = filename.split(".").pop()?.toLowerCase() || "mp4";
  const filePath = generatePath("temp", ext);
  const contentType = getMimeType(filename);
  const url = await uploadToStorage(BUCKET_VIDEOS, filePath, buffer, contentType);
  return { url, path: filePath, bucket: BUCKET_VIDEOS };
}

export async function uploadVideoResult(resultUrl, filename) {
  const res = await fetch(resultUrl);
  if (!res.ok) throw new Error(`Gagal download video result: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = filename.split(".").pop()?.toLowerCase() || "mp4";
  const filePath = generatePath("enhanced", ext);
  const contentType = getMimeType(filename);
  const url = await uploadToStorage(BUCKET_VIDEOS, filePath, buffer, contentType);
  return { url, path: filePath, bucket: BUCKET_VIDEOS };
}

export async function deleteFile(bucket, filePath) {
  return deleteFromStorage(bucket, filePath);
}

export async function listFiles(bucket, prefix) {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/list/${bucket}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
    }
  );
  if (!res.ok) return [];
  return res.json();
}
