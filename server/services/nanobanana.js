const API_URL = "https://apis.snowping.eu.cc/api/imageai/nanobanana";

export async function editImage(imageUrl, prompt) {
  const params = new URLSearchParams({ url: imageUrl, prompt });
  const response = await fetch(`${API_URL}?${params.toString()}`);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Edit image API error: ${response.status} ${text.slice(0, 300)}`);
  }

  const json = await response.json();

  if (json.status !== 200 || !json.result?.image) {
    throw new Error(json.error || `API gagal: ${JSON.stringify(json).slice(0, 300)}`);
  }

  return { imageUrl: json.result.image };
}
