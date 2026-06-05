"use client"

import React from "react"

function formatInline(text: string): (string | React.ReactElement)[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|₹[\d,]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono break-all">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (/^₹[\d,]+/.test(part)) {
      return (
        <span key={i} className="font-semibold text-emerald-500">
          {part}
        </span>
      )
    }
    return part
  })
}

export function MarkdownContent({ text, className }: { text: string; className?: string }) {
  const lines = text.split("\n")
  const elements: React.ReactElement[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith("### ")) {
      elements.push(
        <p key={i} className="font-bold text-foreground mt-3 mb-1 text-sm break-words">
          {line.slice(4)}
        </p>
      )
      i++
      continue
    }
    if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="font-bold text-foreground text-base mt-4 mb-1.5 border-b border-border/40 pb-1 break-words">
          {line.slice(3)}
        </p>
      )
      i++
      continue
    }
    if (line.startsWith("# ")) {
      elements.push(
        <p key={i} className="font-bold text-foreground text-lg mt-2 mb-2 break-words">
          {line.slice(2)}
        </p>
      )
      i++
      continue
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <div key={i} className="flex gap-2 items-start min-w-0">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span className="min-w-0 break-words">{formatInline(line.slice(2))}</span>
        </div>
      )
      i++
      continue
    }
    const numbered = line.match(/^(\d+)\.\s(.+)/)
    if (numbered) {
      elements.push(
        <div key={i} className="flex gap-2 items-start min-w-0">
          <span className="text-primary font-bold shrink-0 w-5">{numbered[1]}.</span>
          <span className="min-w-0 break-words">{formatInline(numbered[2])}</span>
        </div>
      )
      i++
      continue
    }
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-1.5" />)
      i++
      continue
    }
    if (line.trim().startsWith("|")) {
      const tableLines: string[] = []
      const startIndex = i
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim())
        i++
      }

      if (tableLines.length > 2 && tableLines[1].includes("---")) {
        const headers = tableLines[0].split("|").slice(1, -1).map((s) => s.trim())
        const rows = tableLines.slice(2).map((r) => r.split("|").slice(1, -1).map((s) => s.trim()))
        const colCount = headers.length

        elements.push(
          <div
            key={`table-${startIndex}`}
            className="my-3 w-full rounded-xl border border-border/60 bg-background shadow-sm overflow-hidden"
            // The outer div clips; inner div scrolls only horizontally when needed
          >
            <div className="w-full overflow-x-auto">
              <table
                className="w-full text-xs sm:text-sm text-left"
                style={{ minWidth: colCount > 3 ? `${colCount * 110}px` : undefined }}
              >
                <thead className="bg-muted/50 text-muted-foreground border-b border-border/40">
                  <tr>
                    {headers.map((h, idx) => (
                      <th
                        key={idx}
                        className="px-3 py-2.5 font-medium whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-muted/20 transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className={`px-3 py-2.5 align-top ${
                            // First col: slightly bolder, allow wrapping for long labels
                            cellIdx === 0 ? "font-medium text-foreground" : ""
                          } ${
                            // Numeric/currency cells: no-wrap so ₹ values don't break mid-number
                            /^[₹\d]/.test(cell) ? "whitespace-nowrap" : "break-words max-w-[240px]"
                          }`}
                        >
                          {cellIdx === 0 ? (
                            <span className="font-medium text-foreground">{formatInline(cell)}</span>
                          ) : (
                            formatInline(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      } else {
        // Fallback: render as monospace but still scroll-safe
        elements.push(
          <div
            key={`fallback-tbl-${startIndex}`}
            className="my-2 w-full overflow-x-auto rounded-lg bg-muted/30 p-2"
          >
            {tableLines.map((tl, idx) => (
              <p key={idx} className="font-mono text-xs text-muted-foreground whitespace-pre">
                {tl}
              </p>
            ))}
          </div>
        )
      }
      continue
    }

    // Regular paragraph — allow long words/URLs to wrap
    elements.push(
      <p key={i} className="break-words min-w-0">
        {formatInline(line)}
      </p>
    )
    i++
  }

  return (
    <div className={`space-y-0.5 text-sm leading-relaxed w-full min-w-0 overflow-hidden ${className ?? ""}`}>
      {elements}
    </div>
  )
}