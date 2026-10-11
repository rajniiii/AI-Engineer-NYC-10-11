import { useEffect, useRef, useState } from "react"
import ConceptVisual, { hasConceptVisual } from "./ConceptVisual"
import ConceptAIVideo from "./ConceptAIVideo"
import { getJourney, type JourneyId, type Question } from "./journeys"
import type { PipReactionKind } from "./pipBehavior"

export type HelpContext = {
  journeyId: JourneyId
  question: Question
  solved: boolean
}
export default function JourneyPlayer({
  id,
  onBack,
  onContext,
  onReaction,
}: {
  id: JourneyId
  onBack: () => void
  onContext: (context: HelpContext | null) => void
  onReaction: (kind: PipReactionKind, questionId: string) => void
}) {
  const journey = getJourney(id)
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<"correct" | "retry" | null>(null)
  const [complete, setComplete] = useState(false)
  const [learned, setLearned] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const question = journey.questions[step]
  const solved = result === "correct"
  const hasVisual = hasConceptVisual(question.id)
  useEffect(() => {
    title.current?.focus()
  }, [step, complete])
  useEffect(() => {
    setLearned(!hasVisual)
  }, [step, hasVisual])
  useEffect(() => {
    onContext(complete ? null : { journeyId: id, question, solved })
    return () => onContext(null)
  }, [id, question, solved, complete, onContext])

  const check = () => {
    if (selected === null || solved) return
    if (selected === question.correct) {
      setResult("correct")
      onReaction("correct", question.id)
    } else {
      setResult("retry")
      onReaction("retry", question.id)
    }
  }
  const next = () => {
    if (!solved) return
    if (step === journey.questions.length - 1) {
      setComplete(true)
      onReaction("complete", question.id)
    } else {
      setStep(step + 1)
      setSelected(null)
      setResult(null)
    }
  }

  return (
    <main className={`subpage learning-journey accent-${journey.accent}`}>
      <div className="subpage-top">
        <button className="btn btn-outline" type="button" onClick={onBack}>
          ← MISSION HUB
        </button>
        <span className="case-live">
          <i /> JOURNEY {journey.letter}
        </span>
        <span className="case-id">{journey.name}</span>
      </div>
      {complete ? (
        <section
          className="journey-complete panel"
          aria-labelledby="journey-title"
        >
          <span className="completion-badge" aria-hidden="true">
            ★
          </span>
          <span className="eyebrow">
            ALL {journey.questions.length} CHALLENGES SOLVED
          </span>
          <h1 id="journey-title" ref={title} tabIndex={-1}>
            Journey complete!
          </h1>
          <p>
            You finished {journey.title}. You kept going, worked through the
            clues, and made it happen.
          </p>
          <div className="earned-xp">
            +{journey.questions.length * 100} <span>XP EARNED</span>
          </div>
          <button className="btn btn-primary" type="button" onClick={onBack}>
            CHOOSE YOUR NEXT MISSION →
          </button>
        </section>
      ) : (
        <>
          <header className="journey-heading">
            <div>
              <span className="eyebrow">{journey.tag}</span>
              <h1>{journey.title}</h1>
              <p>{journey.intro}</p>
            </div>
            <div
              className="journey-progress"
              aria-label={`${step + (solved ? 1 : 0)} of ${journey.questions.length} challenges solved`}
            >
              {journey.questions.map((item, index) => (
                <i
                  key={item.id}
                  className={
                    index < step || (index === step && solved)
                      ? "done"
                      : index === step
                        ? "current"
                        : ""
                  }
                />
              ))}
              <span>
                {step + 1} / {journey.questions.length}
              </span>
            </div>
          </header>
          <section className={`journey-workspace ${learned ? "" : "learning"}`}>
            <div className="journey-scene panel">
              <div className="journey-scene-top">
                <span>MISSION BRIEF</span>
                <span>0{step + 1}</span>
              </div>
              <span className="journey-symbol" aria-hidden="true">
                {journey.symbol}
              </span>
              <h2>{question.title}</h2>
              <p>{question.scene}</p>
              {hasVisual && (
                <>
                  <ConceptVisual questionId={question.id} />
                  <ConceptAIVideo subject={id} questionId={question.id} />
                </>
              )}
              <div className="journey-formula">
                <small>FIELD NOTE</small>
                <strong>{question.formula}</strong>
              </div>
              {learned ? (
                <span className="journey-hint-label">
                  Need a hint? Ask Pip in the corner.
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary journey-submit"
                  onClick={() => setLearned(true)}
                >
                  Got it — let's try it →
                </button>
              )}
            </div>
            {learned && <div className="journey-question panel">
              <span className="eyebrow">CHALLENGE 0{step + 1}</span>
              <h2 id="journey-title" ref={title} tabIndex={-1}>
                {question.question}
              </h2>
              <div
                className="journey-answers"
                role="group"
                aria-labelledby="journey-title"
              >
                {question.options.map((option, index) => (
                  <button
                    type="button"
                    key={option}
                    disabled={solved}
                    aria-pressed={selected === index}
                    className={`${selected === index ? "selected" : ""} ${
                      solved && selected === index ? "correct" : ""
                    }`}
                    onClick={() => {
                      setSelected(index)
                      setResult(null)
                    }}
                  >
                    <span>{String.fromCharCode(65 + index)}</span>
                    {option}
                    {solved && selected === index && (
                      <b aria-hidden="true">✓</b>
                    )}
                  </button>
                ))}
              </div>
              <div className={`journey-feedback ${result || ""}`} role="status">
                {solved ? (
                  <>
                    <strong>That's it! +100 XP</strong>
                    <p>{question.explanation}</p>
                  </>
                ) : result === "retry" ? (
                  <>
                    <strong>Keep going—you can try again.</strong>
                    <p>Check the field note or ask Pip for a hint.</p>
                  </>
                ) : (
                  <p>Pick an answer, then check it.</p>
                )}
              </div>
              {solved ? (
                <button
                  type="button"
                  className="btn btn-primary journey-submit"
                  onClick={next}
                >
                  {step === journey.questions.length - 1
                    ? "FINISH JOURNEY"
                    : "NEXT CHALLENGE"}{" "}
                  →
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary journey-submit"
                  onClick={check}
                  disabled={selected === null}
                >
                  CHECK ANSWER →
                </button>
              )}
            </div>}
          </section>
        </>
      )}
    </main>
  )
}
