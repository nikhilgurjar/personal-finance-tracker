export type TelegramCommandResult =
  | { ok: true; replyText?: string }
  | { ok: false; status: number; error?: string };

/**
 * Minimal Telegram command router.
 * This is a stub to unblock Next.js build when Telegram command handling files are missing.
 */
export function routeTelegramCommand(_text: string): TelegramCommandResult {
  return {
    ok: false,
    status: 501,
    error: 'Telegram command handling not implemented',
  };
}

