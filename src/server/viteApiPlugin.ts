import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { runScan } from "./scanHandler";
import { recordAnswer, fetchHistory } from "./db";
import { fetchConceptMedia } from "./conceptMedia";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

/** Mounts /api/scan, /api/answer, /api/history, /api/concept-media on the Vite dev server so the
 * frontend can call them with no separate backend process — mirrors the
 * api/*.ts Vercel functions used in production. */
export function apiScanMiddleware(): Plugin {
  return {
    name: "api-scan-middleware",
    configureServer(server) {
      server.middlewares.use("/api/scan", async (req: IncomingMessage, res: ServerResponse, next) => {
        if (req.method !== "POST") return next();
        try {
          const { image, mimeType } = JSON.parse((await readBody(req)) || "{}");
          if (!image || !mimeType) return sendJson(res, 400, { error: "Missing image or mimeType" });
          sendJson(res, 200, await runScan(image, mimeType));
        } catch (e: any) {
          sendJson(res, 500, { error: String(e?.message ?? e) });
        }
      });

      server.middlewares.use("/api/answer", async (req: IncomingMessage, res: ServerResponse, next) => {
        if (req.method !== "POST") return next();
        try {
          const { id, selectedIndex, isCorrect } = JSON.parse((await readBody(req)) || "{}");
          if (typeof id !== "number" || typeof selectedIndex !== "number") {
            return sendJson(res, 400, { error: "Missing id or selectedIndex" });
          }
          await recordAnswer(id, selectedIndex, Boolean(isCorrect));
          sendJson(res, 200, { ok: true });
        } catch (e: any) {
          sendJson(res, 500, { error: String(e?.message ?? e) });
        }
      });

      server.middlewares.use("/api/history", async (req: IncomingMessage, res: ServerResponse, next) => {
        if (req.method !== "GET") return next();
        try {
          sendJson(res, 200, await fetchHistory(30));
        } catch (e: any) {
          sendJson(res, 500, { error: String(e?.message ?? e) });
        }
      });

      server.middlewares.use("/api/concept-media", async (req: IncomingMessage, res: ServerResponse, next) => {
        if (req.method !== "GET") return next();
        try {
          const query = new URL(req.url || "", "http://x").searchParams.get("query") || "";
          if (!query) return sendJson(res, 400, { error: "Missing query" });
          sendJson(res, 200, { items: await fetchConceptMedia(query) });
        } catch (e: any) {
          sendJson(res, 500, { error: String(e?.message ?? e) });
        }
      });
    },
  };
}
