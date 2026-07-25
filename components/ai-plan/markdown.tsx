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
        <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono break-all [overflow-wrap:anywhere]">
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

/** Detect if a line is a horizontal rule */
function isHorizontalRule(line: string): boolean {
  const trimmed = line.trim()
  return /^[-*_]{3,}$/.test(trimmed) || /^(- ){3,}$/.test(trimmed)
}

/** Detect emoji at the start of heading text */
function extractHeadingEmoji(text: string): { emoji: string | null; rest: string } {
  const emojiMatch = text.match(/^([\p{Emoji}\u200d\uFE0F]+\s*)/u)
  if (emojiMatch) {
    return { emoji: emojiMatch[1].trim(), rest: text.slice(emojiMatch[1].length) }
  }
  return { emoji: null, rest: text }
}

export function MarkdownContent({ text, className, compact }: { text: string; className?: string; compact?: boolean }) {
  const lines = text.split("\n")
  const elements: React.ReactElement[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // ─── Horizontal Rule ───
    if (isHorizontalRule(line)) {
      elements.push(
        <div key={i} className="my-3 border-t border-border/40" />
      )
      i++
      continue
    }

    // ─── H1 ───
    if (line.startsWith("# ")) {
      const { emoji, rest } = extractHeadingEmoji(line.slice(2))
      elements.push(
        <div key={i} className="mt-4 mb-2">
          <p className="font-extrabold text-foreground text-lg break-words flex items-center gap-1.5">
            {emoji && <span className="text-xl">{emoji}</span>}
            {formatInline(rest)}
          </p>
        </div>
      )
      i++
      continue
    }

    // ─── H2: Section headers with accent bar ───
    if (line.startsWith("## ")) {
      const raw = line.slice(3)
      const { emoji, rest } = extractHeadingEmoji(raw)
      elements.push(
        <div key={i} className="mt-5 mb-2 rounded-lg bg-gradient-to-r from-primary/8 via-primary/4 to-transparent px-3 py-2 border-l-[3px] border-primary/50">
          <p className="font-bold text-foreground text-[15px] break-words flex items-center gap-1.5">
            {emoji && <span className="text-base">{emoji}</span>}
            {formatInline(rest)}
          </p>
        </div>
      )
      i++
      continue
    }

    // ─── H3 ───
    if (line.startsWith("### ")) {
      elements.push(
        <p key={i} className="font-bold text-foreground mt-3 mb-1 text-sm break-words">
          {formatInline(line.slice(4))}
        </p>
      )
      i++
      continue
    }

    // ─── Sub-bullets (indented: "  - " or "   - ") ───
    if (/^\s{2,}- /.test(line)) {
      const content = line.replace(/^\s+- /, "")
      elements.push(
        <div key={i} className="flex gap-1.5 items-start min-w-0 pl-4">
          <span className="text-muted-foreground mt-0.5 shrink-0 text-[10px]">◦</span>
          <span className="min-w-0 break-words text-[13px]">{formatInline(content)}</span>
        </div>
      )
      i++
      continue
    }

    // ─── Top-level bullets ───
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

    // ─── Numbered lists ───
    const numbered = line.match(/^(\d+)\.\s(.+)/)
    if (numbered) {
      elements.push(
        <div key={i} className="flex gap-2 items-start min-w-0">
          <span className="text-primary font-bold shrink-0 w-5 text-right">{numbered[1]}.</span>
          <span className="min-w-0 break-words">{formatInline(numbered[2])}</span>
        </div>
      )
      i++
      continue
    }

    // ─── Blank line ───
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-1.5" />)
      i++
      continue
    }

    // ─── Blockquote (> ) ───
    if (line.startsWith("> ")) {
      const quoteLines: string[] = []
      const startIndex = i
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <div key={`quote-${startIndex}`} className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">
          {quoteLines.map((ql, idx) => (
            <p key={idx} className="break-words">{formatInline(ql)}</p>
          ))}
        </div>
      )
      continue
    }

    // ─── Tables ───
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

        // Detect if last row is a "Total" row for special styling
        const lastRow = rows[rows.length - 1]
        const isTotalRow = (idx: number) => {
          if (idx !== rows.length - 1) return false
          const firstCell = lastRow?.[0]?.toLowerCase() ?? ""
          return firstCell.includes("total") || firstCell.includes("sum") || firstCell.startsWith("**total")
        }

        elements.push(
          <div
            key={`table-${startIndex}`}
            className="my-3 w-full rounded-xl border border-border/60 bg-background shadow-sm overflow-hidden"
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
                        className="px-3 py-2.5 font-semibold whitespace-nowrap text-xs uppercase tracking-wider"
                      >
                        {formatInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={
                        isTotalRow(rowIdx)
                          ? "bg-muted/40 font-bold border-t-2 border-border/60"
                          : "hover:bg-muted/15 transition-colors"
                      }
                    >
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className={`px-3 py-2 align-top ${
                            cellIdx === 0 ? "font-medium text-foreground" : ""
                          } ${
                            /^[₹\d]/.test(cell) ? "whitespace-nowrap tabular-nums" : "break-words max-w-[240px]"
                          } ${
                            isTotalRow(rowIdx) ? "font-bold" : ""
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
        // Fallback: render as monospace
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

    // ─── Fenced code blocks (``` … ```) ───
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      const startIndex = i
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // consume closing ```
      elements.push(
        <div key={`code-${startIndex}`} className="my-2 rounded-lg overflow-hidden border border-border/40 w-full">
          {lang && (
            <div className="px-3 py-1 bg-muted/80 border-b border-border/40">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{lang}</span>
            </div>
          )}
          <div className="overflow-x-auto bg-muted/30 w-full">
            <pre className="px-4 py-3 text-xs font-mono leading-relaxed text-foreground whitespace-pre">
              {codeLines.join("\n")}
            </pre>
          </div>
        </div>
      )
      continue
    }

    // ─── Alert/callout lines (⚠️, 🚨, ⚡, 💡) ───
    const alertMatch = line.match(/^(⚠️|🚨|⚡|💡)\s*(.+)/)
    if (alertMatch) {
      const iconColorMap: Record<string, string> = {
        "⚠️": "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400",
        "🚨": "border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-400",
        "⚡": "border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-400",
        "💡": "border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
      }
      const classes = iconColorMap[alertMatch[1]] ?? "border-muted bg-muted/20"
      elements.push(
        <div key={i} className={`rounded-lg border px-3 py-2 my-2 text-xs sm:text-sm ${classes}`}>
          <span className="mr-1.5">{alertMatch[1]}</span>
          {formatInline(alertMatch[2])}
        </div>
      )
      i++
      continue
    }

    // ─── Regular paragraph ───
    elements.push(
      <p key={i} className="break-words min-w-0 whitespace-pre-wrap">
        {formatInline(line)}
      </p>
    )
    i++
  }

  return (
    <div className={`space-y-0.5 text-sm leading-relaxed w-full min-w-0 overflow-hidden break-words [overflow-wrap:anywhere] ${className ?? ""}`}>
      {elements}
    </div>
  )
}