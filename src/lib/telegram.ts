import type { NextRequest } from 'next/server';

export type TelegramWebhookResult =
  | { ok: true; response?: Record<string, unknown> }
  | { ok: false; status: number; response?: Record<string, unknown> };

/**
 * Minimal Telegram webhook handler.
 * This is a stub to unblock Next.js build when Telegram integration files are missing.
 */
export async function handleTelegramWebhook(
  _req: NextRequest,
): Promise<TelegramWebhookResult> {
  return {
    ok: false,
    status: 501,
    response: { error: 'Telegram webhook not implemented' },
  };
}

