// Server-side only (Node). Reads NIMBLE_API_KEY from process.env — never import
// from client code. Finds real-world photos/videos of a concept via Nimble web
// search, for the "See it in real life" strip under a Learn step's visual.

export interface MediaItem {
  title: string;
  url: string;
  snippet: string;
  thumbnail: string | null;
}

const YOUTUBE_ID = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/;

function thumbnailFor(url: string): string | null {
  const match = url.match(YOUTUBE_ID);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

export async function fetchConceptMedia(query: string): Promise<MediaItem[]> {
  const apiKey = process.env.NIMBLE_API_KEY;
  const url = process.env.NIMBLE_SEARCH_URL || "https://sdk.nimbleway.com/v2/search";
  if (!apiKey || !query) return [];

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        search_depth: "standard",
        max_results: 5,
        focus: "general",
        output_format: "plain_text",
      }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const results: any[] = data?.results ?? [];
    return results.slice(0, 5).map((r) => ({
      title: r.title || query,
      url: r.url || "",
      snippet: (r.description || r.content || "").slice(0, 160).trim(),
      thumbnail: thumbnailFor(r.url || ""),
    }));
  } catch {
    return [];
  }
}
