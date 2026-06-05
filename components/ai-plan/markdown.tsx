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
        <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
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
        <p key={i} className="font-bold text-foreground mt-3 mb-1 text-sm">
          {line.slice(4)}
        </p>
      )
      i++
      continue
    }
    if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="font-bold text-foreground text-base mt-4 mb-1.5 border-b border-border/40 pb-1">
          {line.slice(3)}
        </p>
      )
      i++
      continue
    }
    if (line.startsWith("# ")) {
      elements.push(
        <p key={i} className="font-bold text-foreground text-lg mt-2 mb-2">
          {line.slice(2)}
        </p>
      )
      i++
      continue
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <div key={i} className="flex gap-2 items-start">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      )
      i++
      continue
    }
    const numbered = line.match(/^(\d+)\.\s(.+)/)
    if (numbered) {
      elements.push(
        <div key={i} className="flex gap-2 items-start">
          <span className="text-primary font-bold shrink-0 w-5">{numbered[1]}.</span>
          <span>{formatInline(numbered[2])}</span>
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
        const headers = tableLines[0].split("|").slice(1, -1).map(s => s.trim())
        const rows = tableLines.slice(2).map(r => r.split("|").slice(1, -1).map(s => s.trim()))
        
        elements.push(
          <div key={`table-${startIndex}`} className="my-4 overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border/40">
                  <tr>
                    {headers.map((h, idx) => (
                      <th key={idx} className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-muted/20 transition-colors">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-3">
                          {cellIdx === 0 ? <span className="font-medium text-foreground">{formatInline(cell)}</span> : formatInline(cell)}
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
        tableLines.forEach((tl, idx) => {
          elements.push(
            <p key={`fallback-tbl-${startIndex}-${idx}`} className="font-mono text-xs text-muted-foreground overflow-x-auto">
              {tl}
            </p>
          )
        })
      }
      continue
    }
    
    elements.push(<p key={i}>{formatInline(line)}</p>)
    i++
  }

  return <div className={`space-y-0.5 text-sm leading-relaxed ${className ?? ""}`}>{elements}</div>
}
