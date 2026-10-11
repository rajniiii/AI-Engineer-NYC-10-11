// Server-side only (Node). Reads GEMINI_API_KEY and NIMBLE_API_KEY from
// process.env — never import from client code.
//
// Combines both AI keys on the real quiz data in src/data/journeys.json:
// Gemini reads the challenge (title/scene/formula/concept — NOT the answer)
// and writes a kid-friendly explanation plus a search query for a real
// demonstration video; Nimble then finds that real video.
import journeysData from "../data/journeys.json";

type Journey = { id: string; questions: { id: string; title: string; scene: string; formula: string; concept: string }[] };

export interface ConceptVideoResult {
  explanation: string;
  searchQuery: string;
  video: { youtubeId: string; title: string; url: string } | null;
  moreLinks: { title: string; url: string }[];
}

class RetryableError extends Error {}

function getFallbackModels(): string[] {
  const raw = process.env.GEMINI_FALLBACK_MODELS || "gemini-flash-latest,gemini-3.5-flash,gemini-3.1-flash-lite";
  return raw.split(",").map((m) => m.trim()).filter(Boolean);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callModel(model: string, apiKey: string, body: unknown, attempts = 2): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    let resp: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      resp = await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch {
      lastErr = new RetryableError(`timeout/network error calling ${model}`);
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (resp.status === 402 || resp.status === 429 || resp.status === 503) {
      lastErr = new RetryableError(`${resp.status} from ${model}`);
      if (attempt < attempts - 1) await sleep(Math.min(1500 * 2 ** attempt, 6000));
      continue;
    }
    if (!resp.ok) throw new Error(`${resp.status} from ${model}: ${await resp.text().catch(() => "")}`);
    return resp;
  }
  throw lastErr ?? new Error(`failed calling ${model}`);
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    explanation: { type: "STRING" },
    search_query: { type: "STRING" },
  },
  required: ["explanation", "search_query"],
};

async function askGemini(question: { title: string; scene: string; formula: string; concept: string }): Promise<{ explanation: string; searchQuery: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Set GEMINI_API_KEY in your environment first.");
  const primary = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const models = [primary, ...getFallbackModels().filter((m) => m !== primary)];

  const prompt = `You are a warm science guide for an 8-year-old. Here is a challenge's setup (NOT its answer):
Title: ${question.title}
Scene: ${question.scene}
Formula/field note: ${question.formula}
Underlying concept: ${question.concept}

Write:
1. "explanation": 2 short sentences explaining the underlying idea in everyday words an 8-year-old would understand. Use a different, simple real-world example than the scene above (do not restate the scene's exact numbers). Never state the challenge's numeric answer.
2. "search_query": a short (5-8 word) web search query, ending in the word "video", to find a free, real children's science video on YouTube that demonstrates this general concept with relatable real-world examples.`;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.4 },
  };

  let resp: Response | null = null;
  const errors: string[] = [];
  for (const model of models) {
    try {
      resp = await callModel(model, apiKey, body);
      break;
    } catch (e) {
      errors.push(String(e));
    }
  }
  if (!resp) throw new Error(`All Gemini models rate-limited/unavailable: ${errors.join("; ")}`);
  const data = await resp.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || "").join("");
  if (!text) throw new Error("Gemini returned no text");
  const parsed = JSON.parse(text);
  return { explanation: parsed.explanation, searchQuery: parsed.search_query };
}

const YOUTUBE_ID = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/;

async function searchNimble(query: string): Promise<{ title: string; url: string }[]> {
  const apiKey = process.env.NIMBLE_API_KEY;
  const url = process.env.NIMBLE_SEARCH_URL || "https://sdk.nimbleway.com/v2/search";
  if (!apiKey) return [];
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, search_depth: "standard", max_results: 5, focus: "general", output_format: "plain_text" }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    const results: any[] = data?.results ?? [];
    return results.slice(0, 5).map((r) => ({ title: r.title || query, url: r.url || "" }));
  } catch {
    return [];
  }
}

export function findQuestion(subject: string, questionId: string) {
  const journey = (journeysData as Journey[]).find((j) => j.id === subject);
  return journey?.questions.find((q) => q.id === questionId) ?? null;
}

export async function curateConceptVideo(subject: string, questionId: string): Promise<ConceptVideoResult> {
  const question = findQuestion(subject, questionId);
  if (!question) throw new Error(`Unknown question ${subject}/${questionId}`);

  const { explanation, searchQuery } = await askGemini(question);
  let results = await searchNimble(searchQuery);
  let withIds = results.map((r) => ({ ...r, youtubeId: r.url.match(YOUTUBE_ID)?.[1] ?? null }));

  if (!withIds.some((r) => r.youtubeId)) {
    results = await searchNimble(`${searchQuery} youtube`);
    withIds = results.map((r) => ({ ...r, youtubeId: r.url.match(YOUTUBE_ID)?.[1] ?? null }));
  }

  const video = withIds.find((r) => r.youtubeId);
  const moreLinks = withIds.filter((r) => r.url !== video?.url).slice(0, 3);

  return {
    explanation,
    searchQuery,
    video: video ? { youtubeId: video.youtubeId!, title: video.title, url: video.url } : null,
    moreLinks,
  };
}
