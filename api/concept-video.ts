// Vercel serverless function (Node runtime) — production equivalent of the
// local-dev middleware registered in vite.config.ts. Same shared handler.
import { curateConceptVideo } from "../src/server/conceptVideo.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const subject = String(req.query?.subject ?? "");
    const id = String(req.query?.id ?? "");
    if (!subject || !id) {
      res.status(400).json({ error: "Missing subject or id" });
      return;
    }
    const result = await curateConceptVideo(subject, id);
    res.status(200).json(result);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
}
