// lib/logger.ts
// Environment-aware logger:
//   LOCAL DEV  → writes to logs/ai.log (file-based, human-readable, auto-rotates)
//   PRODUCTION → uses console.* so logs appear in Vercel dashboard under Functions → Logs

import fs from "fs"
import path from "path"

const IS_PROD = process.env.NODE_ENV === "production" || !!process.env.VERCEL

// ─── File logger (dev only) ───────────────────────────────────────────────────

const LOG_DIR = path.join(process.cwd(), "logs")
const LOG_FILE = path.join(LOG_DIR, "ai.log")
const MAX_LOG_BYTES = 2 * 1024 * 1024 // 2 MB — rotate after this

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
}

function rotateIfNeeded() {
  try {
    if (fs.statSync(LOG_FILE).size > MAX_LOG_BYTES) {
      fs.renameSync(LOG_FILE, LOG_FILE + ".old")
    }
  } catch { /* file doesn't exist yet */ }
}

function writeToFile(level: string, tag: string, message: string, meta?: Record<string, unknown>) {
  try {
    ensureLogDir()
    rotateIfNeeded()
    const ts = new Date().toISOString()
    const metaStr = meta ? " " + JSON.stringify(meta) : ""
    fs.appendFileSync(LOG_FILE, `${ts} [${level}] [${tag}] ${message}${metaStr}\n`, "utf8")
  } catch { /* never crash the app due to logging */ }
}

// ─── Console logger (Vercel/prod) ────────────────────────────────────────────
// Vercel captures stdout from serverless functions → visible in dashboard under
// Deployments → select deployment → Functions tab → click a function → Logs

function writeToConsole(level: "INFO" | "WARN" | "ERROR", tag: string, message: string, meta?: Record<string, unknown>) {
  const prefix = `[${tag}] ${message}`
  if (level === "ERROR") console.error(prefix, meta ?? "")
  else if (level === "WARN") console.warn(prefix, meta ?? "")
  else console.info(prefix, meta ?? "")
}

// ─── Unified write ────────────────────────────────────────────────────────────

function write(level: "INFO" | "WARN" | "ERROR", tag: string, message: string, meta?: Record<string, unknown>) {
  if (IS_PROD) {
    writeToConsole(level, tag, message, meta)
  } else {
    writeToFile(level, tag, message, meta)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  info:  (tag: string, message: string, meta?: Record<string, unknown>) => write("INFO",  tag, message, meta),
  warn:  (tag: string, message: string, meta?: Record<string, unknown>) => write("WARN",  tag, message, meta),
  error: (tag: string, message: string, meta?: Record<string, unknown>) => write("ERROR", tag, message, meta),

  /** Shorthand to log how many records per collection were fetched */
  slice: (tag: string, slice: Record<string, any[]>, extra?: Record<string, unknown>) => {
    const counts = Object.fromEntries(Object.entries(slice).map(([k, v]) => [k, v.length]))
    write("INFO", tag, "data slice fetched", { ...counts, ...extra })
  },
}

