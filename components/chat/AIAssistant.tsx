"use client"

// components/chat/AIAssistant.tsx
// Floating AI chat widget — bottom-right corner of the dashboard.
// v2: memoised localData, conversation history, retry on error, localStorage persistence.

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useFinanceData } from "@/hooks/use-finance-data"
import { cn } from "@/lib/utils"
import {
  Sparkles, X, Send, Bot, User,
  Zap, Brain, AlertCircle, RotateCcw, Trash2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  provider?: "gemini" | "groq" | "cache"
  intent?: string
  error?: boolean
  timestamp: Date
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm **Finio AI**, your personal finance assistant 👋\n\nAsk me anything about your finances — expenses, income, goals, SIPs, or balances. I only look at the data relevant to your question.",
  timestamp: new Date(),
}

const SUGGESTIONS = [
  "How much did I spend this month?",
  "What's my total monthly income?",
  "How close am I to my goals?",
  "Show my active SIPs",
  "What's my net balance?",
  "Who owes me money?",
]

const STORAGE_KEY = "finio-chat-v2"
const MAX_STORED_MESSAGES = 20

// ─── Lightweight markdown renderer ───────────────────────────────────────────

function renderMarkdown(text: string): React.ReactElement {
  const lines = text.split("\n")
  const elements: React.ReactElement[] = []

  lines.forEach((line, i) => {
    if (line.startsWith("### ")) {
      elements.push(
        <p key={i} className="font-bold text-foreground mt-2 mb-0.5">
          {line.slice(4)}
        </p>
      )
      return
    }
    if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="font-bold text-foreground text-base mt-2 mb-0.5">
          {line.slice(3)}
        </p>
      )
      return
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <div key={i} className="flex gap-1.5 items-start">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span>{formatInline(line.slice(2))}</span>
        </div>
      )
      return
    }
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
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />)
      return
    }
    elements.push(<p key={i}>{formatInline(line)}</p>)
  })

  return <div className="space-y-0.5 text-sm leading-relaxed">{elements}</div>
}

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

// ─── Provider badge ───────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider?: "gemini" | "groq" | "cache" }) {
  if (!provider) return null
  const config = {
    gemini: { label: "Gemini",  classes: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
    groq:   { label: "Groq",    classes: "bg-orange-500/10 border-orange-500/20 text-orange-400" },
    cache:  { label: "Cached",  classes: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  }
  const { label, classes } = config[provider]
  return (
    <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border", classes)}>
      <Zap className="h-2 w-2" />
      {label}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { accounts, expenses, goals, savings, sips, debts, income, user, isDemo } =
    useFinanceData()

  // ── Memoise localData so it doesn't cause sendMessage to re-create on every render
  const localData = useMemo(
    () => ({ accounts, expenses, goals, savings, sips, debts, income }),
    [accounts, expenses, goals, savings, sips, debts, income]
  )

  // ── Persist & restore chat history ───────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed: Message[] = JSON.parse(saved).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
        if (parsed.length > 1) setMessages(parsed)
      }
    } catch {
      // ignore malformed storage
    }
  }, [])

  useEffect(() => {
    try {
      const toSave = messages.slice(-MAX_STORED_MESSAGES)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
    } catch {
      // ignore storage quota errors
    }
  }, [messages])

  // ── Scroll to bottom when chat opens or new message arrives ──────────────────
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      setTimeout(() => inputRef.current?.focus(), 100)
      setHasNewMessage(false)
    }
  }, [open, messages])

  // ── Core send logic ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text?: string) => {
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
        // Build conversation history (exclude the welcome message and the just-added user msg)
        const history = messages
          .filter((m) => m.id !== "welcome" && !m.error)
          .slice(-6)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            uid: user?.uid ?? null,
            isDemo,
            localData: isDemo ? localData : undefined,
            history,
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
            content: `Sorry, I ran into an error: **${err.message}**`,
            error: true,
            timestamp: new Date(),
          },
        ])
      } finally {
        setLoading(false)
      }
    },
    [input, loading, user, isDemo, localData, open, messages]
  )

  // ── Retry: re-send the user message that preceded an error response ───────────
  const retryMessage = useCallback(
    (errorMsgId: string) => {
      const idx = messages.findIndex((m) => m.id === errorMsgId)
      if (idx <= 0) return
      const prevUserMsg = messages[idx - 1]
      if (prevUserMsg?.role !== "user") return
      // Remove the error message, then re-send
      setMessages((prev) => prev.filter((m) => m.id !== errorMsgId))
      sendMessage(prevUserMsg.content)
    },
    [messages, sendMessage]
  )

  // ── Clear all messages ────────────────────────────────────────────────────────
  const clearMessages = useCallback(() => {
    setMessages([WELCOME_MESSAGE])
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating Trigger Button ─────────────────────────────────── */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 flex flex-col items-start gap-2">
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
          {!open && (
            <span className="absolute inset-0 rounded-full animate-ping bg-violet-500 opacity-20" />
          )}
        </button>
      </div>

      {/* ── Chat Panel ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed bottom-24 left-4 sm:left-6 z-50 w-[370px] max-w-[calc(100vw-2rem)]",
          "flex flex-col rounded-2xl border border-border/60 shadow-2xl",
          "bg-background/90 backdrop-blur-xl",
          "transition-all duration-300 ease-in-out origin-bottom-left",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
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

          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground font-medium mr-1">Live</span>
            {/* Clear history button */}
            {messages.length > 1 && (
              <button
                onClick={clearMessages}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                aria-label="Clear chat history"
                title="Clear chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
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
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold",
                  msg.role === "user"
                    ? "bg-gradient-to-br from-blue-500 to-cyan-500"
                    : "bg-gradient-to-br from-violet-600 to-purple-700"
                )}
              >
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  "flex flex-col gap-1 max-w-[85%]",
                  msg.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2.5 text-sm",
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-tr-sm"
                      : msg.error
                      ? "bg-destructive/10 border border-destructive/20 text-foreground rounded-tl-sm"
                      : "bg-muted/60 border border-border/40 text-foreground rounded-tl-sm"
                  )}
                >
                  {msg.role === "assistant"
                    ? renderMarkdown(msg.content)
                    : msg.content}
                </div>

                <div className="flex items-center gap-1.5 px-1">
                  {msg.provider && <ProviderBadge provider={msg.provider} />}
                  <span className="text-[9px] text-muted-foreground">
                    {msg.timestamp.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {/* Retry button for error messages */}
                  {msg.error && (
                    <button
                      onClick={() => retryMessage(msg.id)}
                      className="flex items-center gap-0.5 text-[9px] text-destructive hover:text-destructive/80 transition-colors ml-1"
                      aria-label="Retry"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      Retry
                    </button>
                  )}
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
                  <span
                    className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions (only on fresh chat) */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-2">
              Try asking
            </p>
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
              style={{ fieldSizing: "content" } as React.CSSProperties}
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
              aria-label="Send message"
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