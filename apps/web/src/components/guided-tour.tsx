import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

/**
 * Lightweight shepherd-style walkthrough: a dimmed overlay with a spotlight
 * cut around the current target and a small card explaining it. No external
 * dependency — positioning is plain rects, styling is design tokens.
 */

export interface TourStep {
  body: string
  /** CSS selector for the element to spotlight */
  target: string
  title: string
}

interface GuidedTourProps {
  onFinish: () => void
  open: boolean
  steps: TourStep[]
}

/** Auto-opens once per storageKey; `start` replays it on demand. */
export function useTour(storageKey: string): {
  finish: () => void
  open: boolean
  start: () => void
} {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setOpen(true)
    }
  }, [storageKey])

  const finish = useCallback(() => {
    localStorage.setItem(storageKey, "done")
    setOpen(false)
  }, [storageKey])

  const start = useCallback(() => setOpen(true), [])

  return { open, start, finish }
}

const SPOTLIGHT_PADDING = 6
const CARD_WIDTH = 320
const CARD_EDGE_MARGIN = 16
const CARD_ESTIMATED_HEIGHT = 180

interface SpotRect {
  height: number
  left: number
  top: number
  width: number
}

function rectFor(selector: string): SpotRect | null {
  const el = document.querySelector(selector)
  if (!el) {
    return null
  }
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return null
  }
  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  }
}

export function GuidedTour({ open, steps, onFinish }: GuidedTourProps) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<SpotRect | null>(null)
  // Steps whose targets exist right now (views differ by state, e.g. an empty
  // canvas has a premise card but no expand buttons)
  const [visibleSteps, setVisibleSteps] = useState<TourStep[]>([])

  useEffect(() => {
    if (!open) {
      return
    }
    const available = steps.filter((candidate) => document.querySelector(candidate.target))
    setVisibleSteps(available)
    setIndex(0)
    if (available.length === 0) {
      onFinish()
    }
  }, [open, steps, onFinish])

  const step = visibleSteps.at(index)

  useEffect(() => {
    if (!(open && step)) {
      return
    }
    const measure = () => setRect(rectFor(step.target))
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [open, step])

  useEffect(() => {
    if (!open) {
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onFinish()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onFinish])

  if (!(open && step && rect)) {
    return null
  }

  const isLast = index === visibleSteps.length - 1

  // Card below the target when it fits, above otherwise; clamped horizontally
  const cardTop =
    rect.top + rect.height + 12 + CARD_ESTIMATED_HEIGHT < window.innerHeight
      ? rect.top + rect.height + 12
      : Math.max(CARD_EDGE_MARGIN, rect.top - CARD_ESTIMATED_HEIGHT - 12)
  const cardLeft = Math.min(
    Math.max(rect.left, CARD_EDGE_MARGIN),
    window.innerWidth - CARD_WIDTH - CARD_EDGE_MARGIN
  )

  return (
    <div aria-label={step.title} role="dialog">
      {/* Spotlight: the box-shadow dims everything except the target */}
      <div
        className="pointer-events-none fixed z-[60] rounded-lg border-2 border-primary transition-all duration-300"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
        }}
      />

      <div
        className="fixed z-[61] rounded-xl border bg-background p-4 shadow-xl transition-all duration-300"
        style={{ top: cardTop, left: cardLeft, width: CARD_WIDTH }}
      >
        <div className="mb-1 text-muted-foreground text-xs">
          {index + 1} of {visibleSteps.length}
        </div>
        <h3 className="font-semibold text-sm">{step.title}</h3>
        <p className="mt-1 text-muted-foreground text-sm leading-relaxed">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <Button onClick={onFinish} size="sm" type="button" variant="ghost">
            Skip
          </Button>
          <div className="flex gap-2">
            {index > 0 && (
              <Button
                onClick={() => setIndex((i) => i - 1)}
                size="sm"
                type="button"
                variant="outline"
              >
                Back
              </Button>
            )}
            <Button
              onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
              size="sm"
              type="button"
            >
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
