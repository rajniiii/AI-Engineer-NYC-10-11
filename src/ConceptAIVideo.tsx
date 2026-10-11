import { useState } from "react"
import type { JourneyId } from "./journeys"

// The combined Gemini + Nimble feature: Gemini reads the real challenge data
// (title/scene/formula/concept, never the answer) and writes a kid-friendly
// explanation plus a search query; Nimble finds a real matching video, shown
// embedded and playable, not just a thumbnail link.

type Result = {
  explanation: string
  searchQuery: string
  video: { youtubeId: string; title: string; url: string } | null
  moreLinks: { title: string; url: string }[]
}

export default function ConceptAIVideo({ subject, questionId }: { subject: JourneyId; questionId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [result, setResult] = useState<Result | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const run = async () => {
    setState("loading")
    try {
      const resp = await fetch(`/api/concept-video?subject=${subject}&id=${questionId}`)
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error || "request failed")
      setResult(data)
      setState("done")
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e))
      setState("error")
    }
  }

  return (
    <div className="concept-ai-video">
      {state === "idle" && (
        <button type="button" className="cv-btn cv-btn-ai" onClick={run}>
          🤖 Ask Pip to find a real video
        </button>
      )}
      {state === "loading" && (
        <p className="cv-caption">Pip is thinking it through and searching for a real video…</p>
      )}
      {state === "error" && <p className="cv-caption">Pip couldn't find one right now: {errorMsg}</p>}
      {state === "done" && result && (
        <div className="cai-result">
          <p className="cai-explanation">{result.explanation}</p>
          {result.video ? (
            <div className="cai-player">
              <iframe
                src={`https://www.youtube.com/embed/${result.video.youtubeId}`}
                title={result.video.title}
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : (
            <p className="cv-caption">No playable video turned up, but here are some links:</p>
          )}
          {result.moreLinks.length > 0 && (
            <div className="cai-more">
              {result.moreLinks.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
