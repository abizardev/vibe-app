const UA =
  "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36";

export async function tiktokDownloader(url) {
  if (!url) {
    throw new Error("URL TikTok kosong");
  }

  const params = new URLSearchParams({ url, hd: "1" });

  const response = await fetch("https://www.tikwm.com/api/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
    },
    body: params,
  });

  const json = await response.json();

  if (json.code !== 0 || !json.data) {
    return {
      Status: false,
      Code: json.code || 500,
      msg: json.msg || "Failed to fetch TikTok data",
      data: null,
    };
  }

  const d = json.data;

  return {
    Status: true,
    Code: 200,
    data: {
      id: d.id,
      title: d.title || "",
      cover: d.cover || d.origin_cover || "",
      duration: d.duration || 0,
      play: d.play || "",
      hdplay: d.hdplay || "",
      wmplay: d.wmplay || "",
      music: d.music || "",
      music_info: d.music_info || {},
      author: d.author || {},
      digg_count: d.digg_count || 0,
      comment_count: d.comment_count || 0,
      share_count: d.share_count || 0,
      play_count: d.play_count || 0,
      images: d.images || null,
    },
  };
}
