// Vercel serverless function (Node runtime) — production equivalent of the
// local-dev middleware registered in vite.config.ts. Same shared handler.
import { fetchConceptMedia } from "../src/server/conceptMedia.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const query = String(req.query?.query ?? "");
    if (!query) {
      res.status(400).json({ error: "Missing query" });
      return;
    }
    const items = await fetchConceptMedia(query);
    res.status(200).json({ items });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
}
