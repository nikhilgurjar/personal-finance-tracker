"use client"

import React from "react"
// components/chat/AIAssistant.tsx
// Floating AI chat widget — bottom-right corner of the dashboard.
// Gemini primary + Groq fallback. Shows which model answered.

import { useState, useRef, useEffect, useCallback } from "react"
import { useFinanceData } from "@/hooks/use-finance-data"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Sparkles, X, Send, ChevronDown, Bot, User,
  Zap, Brain, AlertCircle, Minimize2
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  provider?: "gemini" | "groq"
  intent?: string
  error?: boolean
  timestamp: Date
}

// ─── Lightweight markdown renderer ───────────────────────────────────────────

function renderMarkdown(text: string): React.ReactElement {
  const lines = text.split("\n")
  const elements: React.ReactElement[] = []

  lines.forEach((line, i) => {
    // Headings
    if (line.startsWith("### ")) {
      elements.push(<p key={i} className="font-bold text-foreground mt-2 mb-0.5">{line.slice(4)}</p>)
      return
    }
    if (line.startsWith("## ")) {
      elements.push(<p key={i} className="font-bold text-foreground text-base mt-2 mb-0.5">{line.slice(3)}</p>)
      return
    }
    // Bullet points
    if (line.startsWith("- ") || line.startsWith("• ")) {
      const content = line.slice(2)
      elements.push(
        <div key={i} className="flex gap-1.5 items-start">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span>{formatInline(content)}</span>
        </div>
      )
      return
    }
    // Numbered lists
    const numbered = line.match(/^(\d+)\.\s(.+)/)
    if (numbered) {
      elements.push(
        <div key={i} className="flex gap-1.5 items-start">
          <span className="text-primary font-bold shrink-0 w-4">{numbered[1]}.</span>
          <span>{formatInline(numbered[2])}</span>
        </div>
      )
      return
    }
    // Empty line = spacer
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />)
      return
    }
    // Regular paragraph
    elements.push(<p key={i}>{formatInline(line)}</p>)
  })

  return <div className="space-y-0.5 text-sm leading-relaxed">{elements}</div>
}

function formatInline(text: string): (string | React.ReactElement)[] {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|₹[\d,]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>
    }
    if (/^₹[\d,]+/.test(part)) {
      return <span key={i} className="font-semibold text-emerald-500">{part}</span>
    }
    return part
  })
}

// ─── Provider badge ───────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider?: "gemini" | "groq" }) {
  if (!provider) return null
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
      provider === "gemini"
        ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
        : "bg-orange-500/10 border-orange-500/20 text-orange-400"
    )}>
      <Zap className="h-2 w-2" />
      {provider === "gemini" ? "Gemini" : "Groq"}
    </span>
  )
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "How much did I spend this month?",
  "What's my total monthly income?",
  "How close am I to my goals?",
  "Show my active SIPs",
  "What's my net balance?",
  "Who owes me money?",
]

// ─── Main component ───────────────────────────────────────────────────────────

export function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm **Finio AI**, your personal finance assistant 👋\n\nAsk me anything about your finances — expenses, income, goals, SIPs, or balances. I only look at the data relevant to your question.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { accounts, expenses, goals, savings, sips, debts, income, user, isDemo } = useFinanceData()

  // Build local data bag to pass to API in demo mode
  const localData = { accounts, expenses, goals, savings, sips, debts, income }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (open) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 100)
      setHasNewMessage(false)
    }
  }, [open, messages, scrollToBottom])

  const sendMessage = useCallback(async (text?: string) => {
    const question = (text ?? input).trim()
    if (!question || loading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          uid: user?.uid ?? null,
          isDemo,
          localData: isDemo ? localData : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong")
      }

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        provider: data.provider,
        intent: data.intent,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMsg])

      if (!open) setHasNewMessage(true)
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Sorry, I ran into an error: **${err.message}**\n\nMake sure your GEMINI_API_KEY and GROQ_API_KEY are set in .env.local`,
          error: true,
          timestamp: new Date(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading, user, isDemo, localData, open])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* ── Floating Trigger Button ─────────────────────────────────── */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-2">
        {/* New message indicator */}
        {hasNewMessage && !open && (
          <div className="animate-bounce bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
            New response ✨
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300",
            "bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700",
            "hover:scale-110 hover:shadow-purple-500/30 hover:shadow-2xl",
            "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
            open && "rotate-45 scale-95"
          )}
          aria-label="Toggle AI Assistant"
        >
          {open ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Brain className="h-6 w-6 text-white" />
          )}
          {/* Pulse ring */}
          {!open && (
            <span className="absolute inset-0 rounded-full animate-ping bg-violet-500 opacity-20" />
          )}
        </button>
      </div>

      {/* ── Chat Panel ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed bottom-24 right-4 sm:right-6 z-50 w-[370px] max-w-[calc(100vw-2rem)]",
          "flex flex-col rounded-2xl border border-border/60 shadow-2xl",
          "bg-background/90 backdrop-blur-xl",
          "transition-all duration-300 ease-in-out origin-bottom-right",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
        )}
        style={{ maxHeight: "calc(100vh - 160px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-blue-600/10 via-violet-600/10 to-purple-700/10 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-violet-600">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-none">Finio AI</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Gemini · Groq fallback</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground font-medium">Live</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2.5",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold",
                msg.role === "user"
                  ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                  : "bg-gradient-to-br from-violet-600 to-purple-700"
              )}>
                {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>

              {/* Bubble */}
              <div className={cn(
                "flex flex-col gap-1 max-w-[85%]",
                msg.role === "user" ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "rounded-2xl px-3.5 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-tr-sm"
                    : msg.error
                    ? "bg-destructive/10 border border-destructive/20 text-foreground rounded-tl-sm"
                    : "bg-muted/60 border border-border/40 text-foreground rounded-tl-sm"
                )}>
                  {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                </div>
                <div className="flex items-center gap-1.5 px-1">
                  {msg.provider && <ProviderBadge provider={msg.provider} />}
                  <span className="text-[9px] text-muted-foreground">
                    {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-purple-700">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-muted/60 border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (only shown when no messages beyond welcome) */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">Try asking</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 border-t border-border/40 shrink-0">
          <div className="flex items-end gap-2 bg-muted/40 border border-border/50 rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none max-h-28 leading-relaxed"
              style={{ fieldSizing: "content" } as any}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
                input.trim() && !loading
                  ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white hover:scale-110"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  )
}
