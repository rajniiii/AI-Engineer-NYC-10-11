import { useState } from "react"

// "See it in real life": on request, searches Nimble for real photos/videos of
// the concept (not the quiz's exact numbers) and shows up to 3, YouTube results
// first since those come back with a real thumbnail.

type MediaItem = { title: string; url: string; snippet: string; thumbnail: string | null }

const QUERY: Record<string, string> = {
  force: "force and pushing something science video for kids",
  speed: "speed and racing science video for kids",
  energy: "energy and power science video for kids",
  derivative: "rate of change real world example video for kids",
  integral: "adding up over time area under a graph video for kids",
  slope: "constant vs changing signal science video for kids",
  "base-pairs": "DNA base pairing video for kids",
  "altered-record": "comparing data records for changes explained simply",
  integrity: "what is a hash file fingerprint explained simply",
}

export function hasConceptMedia(questionId: string) {
  return questionId in QUERY
}

export default function ConceptMedia({ questionId }: { questionId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [items, setItems] = useState<MediaItem[]>([])
  const query = QUERY[questionId]
  if (!query) return null

  const search = async () => {
    setState("loading")
    try {
      const resp = await fetch(`/api/concept-media?query=${encodeURIComponent(query)}`)
      if (!resp.ok) throw new Error("search failed")
      const data = await resp.json()
      const found: MediaItem[] = data.items || []
      found.sort((a, b) => (b.thumbnail ? 1 : 0) - (a.thumbnail ? 1 : 0))
      setItems(found.slice(0, 3))
      setState("done")
    } catch {
      setState("error")
    }
  }

  return (
    <div className="concept-media">
      {state === "idle" && (
        <button type="button" className="cv-btn" onClick={search}>
          🔍 See it in real life
        </button>
      )}
      {state === "loading" && <p className="cv-caption">Looking for real examples…</p>}
      {state === "error" && <p className="cv-caption">Couldn't find real examples right now.</p>}
      {state === "done" && items.length === 0 && <p className="cv-caption">No real examples found right now.</p>}
      {state === "done" && items.length > 0 && (
        <div className="cm-grid">
          {items.map((item) => (
            <a key={item.url} className="cm-card" href={item.url} target="_blank" rel="noopener noreferrer">
              {item.thumbnail ? (
                <img src={item.thumbnail} alt="" loading="lazy" />
              ) : (
                <span className="cm-card-fallback" aria-hidden="true">🔗</span>
              )}
              <small>{item.title}</small>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
