import crypto from "node:crypto";
import path from "node:path";

const BASE_URL = "https://wink.ai";
const STRATEGY_URL = "https://strategy.app.meitudata.com";

const CLIENT_ID = "1189857605";
const VERSION = "5.1.2";
const COUNTRY_CODE = "ID";
const CLIENT_LANGUAGE = "en_US";
const CLIENT_TIMEZONE = "Asia/Jakarta";

const TASK_TYPE = "11";
const CONTENT_TYPE = "2";

const UA =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36";

function makeTrace() {
  return `${crypto.randomBytes(16).toString("hex")}-${crypto.randomBytes(8).toString("hex")}-1`;
}

function traceHeaders() {
  const trace = makeTrace();
  return {
    "sentry-trace": trace,
    baggage: [
      "sentry-environment=release",
      "sentry-release=5.1.2%20(b60d25c477f43c6dfac4107810f26d442320f4f1)",
      "sentry-public_key=e1bf914f3448d9bc8a10c7e499d17d54",
      `sentry-trace_id=${trace.split("-")[0]}`,
      "sentry-sampled=true",
      "sentry-sample_rate=0.75",
    ].join(","),
  };
}

function baseParams(extra = {}) {
  return new URLSearchParams({
    client_id: CLIENT_ID,
    version: VERSION,
    country_code: COUNTRY_CODE,
    gnum: "",
    client_language: CLIENT_LANGUAGE,
    client_channel_id: "",
    client_timezone: CLIENT_TIMEZONE,
    ...extra,
  });
}

// Simple cookie store for a session
class CookieStore {
  constructor() {
    this.cookies = {};
  }
  set(name, value) {
    this.cookies[name] = value;
  }
  parseCookies(setCookieHeaders) {
    if (!setCookieHeaders) return;
    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const h of headers) {
      const match = h.match(/^([^=]+)=([^;]*)/);
      if (match) this.cookies[match[1].trim()] = match[2].trim();
    }
  }
  toString() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  toJSON() {
    return { ...this.cookies };
  }
  static fromJSON(obj) {
    const store = new CookieStore();
    if (obj) Object.entries(obj).forEach(([k, v]) => store.set(k, v));
    return store;
  }
}

function createSession() {
  const GNUM = crypto.randomUUID();
  const cookies = new CookieStore();
  cookies.set("_sm", GNUM);
  cookies.set("meitustat", encodeURIComponent(JSON.stringify({ wgid: GNUM })));
  return { GNUM, cookies };
}

function makeApi(cookies) {
  const baseHeaders = {
    accept: "*/*",
    origin: BASE_URL,
    referer: `${BASE_URL}/video-enhancer/upload`,
    "user-agent": UA,
    "sec-ch-ua": '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    ab_info: JSON.stringify({ ab_codes: [], version: "1.4.4" }),
  };

  async function apiGet(url, extraHeaders = {}) {
    const res = await fetch(url, {
      method: "GET",
      headers: { ...baseHeaders, ...extraHeaders, cookie: cookies.toString() },
    });
    const sc = res.headers.getSetCookie?.() || [];
    cookies.parseCookies(sc);
    const data = await res.json();
    return { status: res.status, data };
  }

  async function apiPost(url, body, extraHeaders = {}) {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...baseHeaders, ...extraHeaders, cookie: cookies.toString() },
      body,
    });
    const sc = res.headers.getSetCookie?.() || [];
    cookies.parseCookies(sc);
    const data = await res.json();
    return { status: res.status, data };
  }

  return { apiGet, apiPost };
}

// ─── STEP 1: Get upload sign + policy (returns Qiniu upload URL + token for browser) ───
export async function getUploadCredentials(filename) {
  const { GNUM, cookies } = createSession();
  const { apiGet } = makeApi(cookies);

  const suffix = "." + (filename.split(".").pop()?.toLowerCase() || "mp4");
  const params = baseParams({ suffix, type: "temp", count: "1" });
  params.set("gnum", GNUM);

  const res = await apiGet(`${BASE_URL}/api/file/get_maat_sign.json?${params.toString()}`, traceHeaders());
  if (res.status >= 400 || res.data?.code !== 0) {
    throw new Error(`get_maat_sign gagal: ${JSON.stringify(res.data)}`);
  }
  const sign = res.data.data;

  // Get upload policy from strategy server
  const policyParams = new URLSearchParams({
    app: sign.app,
    count: String(sign.count),
    sig: sign.sig,
    sigTime: sign.sig_time,
    sigVersion: sign.sig_version,
    suffix: sign.suffix,
    type: sign.type,
  });

  const policyRes = await fetch(`${STRATEGY_URL}/upload/policy?${policyParams.toString()}`, {
    headers: { accept: "*/*", origin: BASE_URL, referer: `${BASE_URL}/`, "user-agent": UA },
  });
  const policyData = await policyRes.json();
  if (policyRes.status >= 400 || !Array.isArray(policyData) || !policyData[0]?.qiniu) {
    throw new Error(`upload policy gagal: ${JSON.stringify(policyData)}`);
  }
  const qiniu = policyData[0].qiniu;

  return {
    gnum: GNUM,
    cookies: cookies.toJSON(),
    upload: {
      url: qiniu.url,
      token: qiniu.token,
      key: qiniu.key,
    },
  };
}

// ─── STEP 2: After browser uploads, start processing ───
export async function startProcessing(sessionData) {
  const { gnum, cookiesJson, fileKey, filename } = sessionData;
  const cookies = CookieStore.fromJSON(cookiesJson);
  const { apiGet, apiPost } = makeApi(cookies);

  // Get video info
  const infoBody = baseParams({ file_key: fileKey });
  infoBody.set("gnum", gnum);
  await apiPost(
    `${BASE_URL}/api/file/video_cover_and_display_info_ext.json`,
    infoBody.toString(),
    { ...traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }
  );

  // Start transcode
  const transBody = baseParams({ file_key: fileKey });
  transBody.set("gnum", gnum);
  const transRes = await apiPost(
    `${BASE_URL}/api/file/video_trans_start.json`,
    transBody.toString(),
    { ...traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }
  );
  if (transRes.status >= 400 || transRes.data?.code !== 0 || !transRes.data?.data?.id) {
    throw new Error(`transcode start gagal: ${JSON.stringify(transRes.data)}`);
  }

  const taskName = `Enhancer-Ultra HD-${path.parse(filename).name}`;

  return {
    gnum,
    cookies: cookies.toJSON(),
    transcodeId: transRes.data.data.id,
    fileKey,
    taskName,
    phase: "transcode",
  };
}

// ─── STEP 3: Poll progress ───
export async function pollProgress(sessionData) {
  const { gnum, cookies: cookiesJson, transcodeId, fileKey, taskName, phase, msgId, sourceUrl } = sessionData;
  const cookies = CookieStore.fromJSON(cookiesJson);
  const { apiGet, apiPost } = makeApi(cookies);

  // Phase: transcode
  if (phase === "transcode") {
    const params = baseParams({ id: transcodeId });
    params.set("gnum", gnum);
    const res = await apiGet(`${BASE_URL}/api/file/video_trans_query.json?${params.toString()}`, traceHeaders());
    if (res.status >= 400 || res.data?.code !== 0) {
      throw new Error(`transcode query gagal: ${JSON.stringify(res.data)}`);
    }
    const data = res.data.data;
    console.log("[Wink Transcode Query Response]", JSON.stringify(data, null, 2));
    const videoTranscoded = data?.video_transcoded || data?.transcoded_video || data?.transcoded_url || data?.video_url || data?.video || "";

    if (!videoTranscoded) {
      console.log("[Wink] videoTranscoded not found, still transcoding...");
      return { done: false, phase: "transcode", cookies: cookies.toJSON(), _debug_transcode_data: data };
    }
    console.log("[Wink] videoTranscoded found:", videoTranscoded);

    // Transcode done → start delivery
    const video = data?.video || data?.url || data?.source_url || sourceUrl || "";
    const delBody = baseParams({
      type: TASK_TYPE,
      content_type: CONTENT_TYPE,
      source_url: video,
      type_params: JSON.stringify({ is_mirror: 0, orientation_tag: 1, j_420_trans: "1", return_ext: "2" }),
      right_detail: JSON.stringify({
        source: "1", touch_type: "4", function_id: "630", material_id: "63011",
        url: "https://wink.ai/video-enhancer/upload",
      }),
      ext_params: JSON.stringify({ task_name: taskName, records: TASK_TYPE, video_transcoded: videoTranscoded }),
      with_prepare: "1",
    });
    delBody.set("gnum", gnum);

    const delRes = await apiPost(
      `${BASE_URL}/api/meitu_ai/delivery.json`,
      delBody.toString(),
      { ...traceHeaders(), "content-type": "application/x-www-form-urlencoded;charset=UTF-8" }
    );
    if (delRes.status >= 400 || delRes.data?.code !== 0) {
      throw new Error(`delivery gagal: ${JSON.stringify(delRes.data)}`);
    }
    const delData = delRes.data.data || {};
    const firstMsgId = delData.msg_id || delData.prepare_msg_id || "";
    if (!firstMsgId) throw new Error("delivery tidak mengembalikan msg_id");

    return { done: false, phase: "result", msgId: firstMsgId, cookies: cookies.toJSON() };
  }

  // Phase: result
  if (phase === "result") {
    const params = baseParams({ msg_ids: msgId });
    params.set("gnum", gnum);
    const res = await apiGet(
      `${BASE_URL}/api/meitu_ai/query_batch.json?${params.toString()}`,
      { ...traceHeaders(), referer: `${BASE_URL}/video-enhancer/upload` }
    );
    if (res.status >= 400 || res.data?.code !== 0) {
      throw new Error(`query batch gagal: ${JSON.stringify(res.data)}`);
    }
    const data = res.data.data;
    const item = data?.item_list?.[0];

    // Check for msg_id redirect
    const resultValue = item?.result?.result || "";
    const realMsgId = item?.result?.msg_id || item?.msg_id || "";
    let nextMsgId = "";
    if (resultValue && resultValue !== msgId && !resultValue.startsWith("http")) nextMsgId = resultValue;
    else if (realMsgId && realMsgId !== msgId && !realMsgId.startsWith("wpr_")) nextMsgId = realMsgId;

    if (nextMsgId) {
      return { done: false, phase: "result", msgId: nextMsgId, cookies: cookies.toJSON() };
    }

    // Check for result URL
    const media = item?.result?.media_info_list?.[0];
    const url = media?.media_data || item?.result?.result_url || item?.result?.url || "";
    const errorCode = item?.result?.error_code;
    const errorMsg = item?.result?.error_msg;

    if (url && url.startsWith("http") && errorCode === 0) {
      return { done: true, resultUrl: url };
    }
    if (errorCode && errorCode !== 29901 && errorCode !== 0) {
      throw new Error(`task gagal: ${errorCode} ${errorMsg || ""}`);
    }

    return { done: false, phase: "result", msgId, cookies: cookies.toJSON() };
  }

  throw new Error("Unknown phase: " + phase);
}

