import { useCallback, useEffect, useRef, useState } from "react"
import { ComponentProps, Streamlit, withStreamlitConnection } from "streamlit-component-lib"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnnotationEntry {
  start: number
  end: number
  value: string
}

interface LabelConfig {
  color: string
  annotation: AnnotationEntry[]
}

type LabelDict = Record<string, LabelConfig>

interface Args {
  text: string
  label_dict: LabelDict
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Walk the text nodes inside `container` in document order, accumulating
 * character counts until we reach `targetNode`, then add `offsetInNode`.
 * This maps a DOM selection endpoint to a flat string index.
 */
function getDomCharOffset(
  container: Element,
  targetNode: Node,
  offsetInNode: number
): number {
  let total = 0
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node === targetNode) return total + offsetInNode
    total += node.textContent?.length ?? 0
  }
  // Fallback — shouldn't happen with well-formed renders
  return total + offsetInNode
}

function hasOverlap(start: number, end: number, labelDict: LabelDict): boolean {
  for (const { annotation } of Object.values(labelDict)) {
    for (const ann of annotation) {
      if (start < ann.end && end > ann.start) return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// Text segmentation for rendering
// ---------------------------------------------------------------------------

interface PlainSegment {
  kind: "plain"
  start: number
  end: number
  text: string
}

interface AnnotatedSegment {
  kind: "annotated"
  start: number
  end: number
  text: string
  label: string
  color: string
  annIdx: number
}

type Segment = PlainSegment | AnnotatedSegment

function buildSegments(text: string, labelDict: LabelDict): Segment[] {
  type FlatAnn = AnnotationEntry & { label: string; color: string; annIdx: number }

  const flat: FlatAnn[] = []
  for (const [label, { color, annotation }] of Object.entries(labelDict)) {
    annotation.forEach((ann, annIdx) => flat.push({ ...ann, label, color, annIdx }))
  }
  flat.sort((a, b) => a.start - b.start)

  const segments: Segment[] = []
  let pos = 0

  for (const ann of flat) {
    if (pos > ann.start) continue // skip overlapping (invariant: shouldn't occur)
    if (ann.start > pos) {
      segments.push({ kind: "plain", start: pos, end: ann.start, text: text.slice(pos, ann.start) })
    }
    segments.push({
      kind: "annotated",
      start: ann.start,
      end: ann.end,
      text: text.slice(ann.start, ann.end),
      label: ann.label,
      color: ann.color,
      annIdx: ann.annIdx,
    })
    pos = ann.end
  }

  if (pos < text.length) {
    segments.push({ kind: "plain", start: pos, end: text.length, text: text.slice(pos) })
  }

  return segments
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AnnotatorComponent({ args }: ComponentProps) {
  const { text, label_dict } = args as Args

  const [labelDict, setLabelDict] = useState<LabelDict>(() => {
    const init: LabelDict = {}
    for (const [label, cfg] of Object.entries(label_dict)) {
      init[label] = { color: cfg.color, annotation: cfg.annotation ?? [] }
    }
    return init
  })

  const [activeLabel, setActiveLabel] = useState<string | null>(null)
  const [status, setStatus] = useState("Select an entity, then highlight text.")

  const containerRef = useRef<HTMLDivElement>(null)
  // Track which annotated span the mousedown landed on, to detect pure clicks.
  const mouseDownTargetRef = useRef<{ label: string; annIdx: number } | null>(null)

  // Notify Streamlit whenever our annotation state changes.
  useEffect(() => {
    Streamlit.setComponentValue(labelDict)
  }, [labelDict])

  // Auto-resize the iframe after every render.
  useEffect(() => {
    Streamlit.setFrameHeight()
  })

  // ------------------------------------------------------------------
  // State mutations
  // ------------------------------------------------------------------

  const addAnnotation = useCallback((label: string, ann: AnnotationEntry) => {
    setLabelDict((prev) => {
      const cfg = prev[label]
      const sorted = [...cfg.annotation, ann].sort((a, b) => a.start - b.start)
      return { ...prev, [label]: { ...cfg, annotation: sorted } }
    })
  }, [])

  const removeAnnotation = useCallback((label: string, annIdx: number) => {
    setLabelDict((prev) => {
      const cfg = prev[label]
      return {
        ...prev,
        [label]: { ...cfg, annotation: cfg.annotation.filter((_, i) => i !== annIdx) },
      }
    })
  }, [])

  // ------------------------------------------------------------------
  // Mouse handlers
  // ------------------------------------------------------------------

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = e.target as HTMLElement
    const label = el.getAttribute("data-label")
    const idx = el.getAttribute("data-ann-idx")
    mouseDownTargetRef.current =
      label !== null && idx !== null ? { label, annIdx: parseInt(idx, 10) } : null
  }, [])

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const selection = window.getSelection()
      const selectedText = selection?.toString() ?? ""

      // No drag — treat as a click on an annotated span (remove it).
      if (!selectedText) {
        const el = e.target as HTMLElement
        const label = el.getAttribute("data-label")
        const idx = el.getAttribute("data-ann-idx")
        const down = mouseDownTargetRef.current
        if (
          label !== null &&
          idx !== null &&
          down?.label === label &&
          down.annIdx === parseInt(idx, 10)
        ) {
          removeAnnotation(label, parseInt(idx, 10))
          setStatus(`Removed annotation from "${label}".`)
        }
        selection?.removeAllRanges()
        return
      }

      // There is a selection. If no entity is active, reject and hint.
      if (!activeLabel) {
        setStatus("Select an entity first.")
        selection?.removeAllRanges()
        return
      }

      const container = containerRef.current
      if (!container || !selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      let start = getDomCharOffset(container, range.startContainer, range.startOffset)
      let end = getDomCharOffset(container, range.endContainer, range.endOffset)
      if (start > end) [start, end] = [end, start]

      // Trim leading/trailing whitespace.
      while (start < end && /\s/.test(text[start])) start++
      while (end > start && /\s/.test(text[end - 1])) end--

      if (start >= end) {
        selection.removeAllRanges()
        return
      }

      // Expand to full word boundaries when selection starts or ends mid-word.
      if (/\w/.test(text[start])) {
        while (start > 0 && /\w/.test(text[start - 1])) start--
      }
      if (end > 0 && /\w/.test(text[end - 1])) {
        while (end < text.length && /\w/.test(text[end])) end++
      }

      // Reject overlapping spans.
      if (hasOverlap(start, end, labelDict)) {
        setStatus("Warning: span overlaps an existing annotation.")
        selection.removeAllRanges()
        return
      }

      const value = text.slice(start, end)
      addAnnotation(activeLabel, { start, end, value })
      setStatus(`"${value}" → ${activeLabel}`)
      selection.removeAllRanges()
    },
    [activeLabel, labelDict, text, addAnnotation, removeAnnotation]
  )

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const segments = buildSegments(text, labelDict)

  return (
    <div style={{ fontFamily: "sans-serif", padding: "8px 12px" }}>
      {/* Entity legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
        {Object.entries(labelDict).map(([label, { color }]) => {
          const isActive = activeLabel === label
          return (
            <button
              key={label}
              onClick={() => setActiveLabel(isActive ? null : label)}
              style={{
                background: color,
                color: "#fff",
                border: isActive ? "2px solid #000" : "2px solid transparent",
                borderRadius: "4px",
                padding: "4px 12px",
                cursor: "pointer",
                fontWeight: isActive ? "bold" : "normal",
                transform: isActive ? "scale(1.05)" : "scale(1)",
                transition: "transform 0.1s, border-color 0.1s",
                textShadow: "0 1px 2px rgba(0,0,0,0.4)",
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Annotatable text area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: "1.9",
          fontSize: "14px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          padding: "12px",
          cursor: "text",
          userSelect: "text",
        }}
      >
        {segments.map((seg, i) =>
          seg.kind === "annotated" ? (
            <span
              key={i}
              data-start={seg.start}
              data-end={seg.end}
              data-label={seg.label}
              data-ann-idx={seg.annIdx}
              title={`${seg.label} — click to remove`}
              style={{
                backgroundColor: seg.color,
                borderRadius: "3px",
                padding: "1px 3px",
                cursor: "pointer",
                color: "#fff",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
            >
              {seg.text}
            </span>
          ) : (
            <span key={i} data-start={seg.start} data-end={seg.end}>
              {seg.text}
            </span>
          )
        )}
      </div>

      {/* Status line */}
      <div
        style={{
          marginTop: "6px",
          fontSize: "12px",
          color: "#666",
          minHeight: "16px",
          fontStyle: "italic",
        }}
      >
        {status}
      </div>
    </div>
  )
}

export default withStreamlitConnection(AnnotatorComponent)
