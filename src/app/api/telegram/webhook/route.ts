import { NextRequest, NextResponse } from 'next/server';
import { TelegramUpdate } from '@/lib/telegram';
import { findUserByTelegramId, sendTelegramMessage } from '@/lib/telegram';
import { executeCommand } from '@/lib/telegramCommands';

/**
 * Verify webhook signature
 * Telegram sends X-Telegram-Bot-Api-Secret-Token header
 */
function verifyWebhookSignature(req: NextRequest): boolean {
  const token = req.headers.get('x-telegram-bot-api-secret-token');
  const expectedToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expectedToken) {
    console.warn('TELEGRAM_WEBHOOK_SECRET not configured');
    return false;
  }

  return token === expectedToken;
}

/**
 * POST /api/telegram/webhook
 * Receives updates from Telegram Bot
 */
export async function POST(req: NextRequest) {
  // Verify webhook signature
  if (!verifyWebhookSignature(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const update: TelegramUpdate = await req.json();

    // Ignore non-message updates for now
    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const telegramUserId = message.from.id;
    const text = message.text || '';
    const username = message.from.username;

    // Find linked Firebase user
    const firebaseUserId = await findUserByTelegramId(telegramUserId);

    if (!firebaseUserId) {
      await sendTelegramMessage(
        chatId,
        '⚠️ Your Telegram account is not linked to a Finance Tracker account.\n\n' +
        'Please visit the Finance Tracker app and link your Telegram ID in settings.'
      );
      return NextResponse.json({ ok: true });
    }

    // Parse command or regular message
    if (text.startsWith('/')) {
      const [commandRaw, ...argsList] = text.split(/\s+/);
      const command = commandRaw.slice(1);
      const args = argsList.join(' ');

      await executeCommand(command, args, firebaseUserId, telegramUserId, chatId, username);
    } else {
      // For regular messages, show help
      await sendTelegramMessage(
        chatId,
        '💬 Send a command to proceed.\n\nUse /help to see available commands.'
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/telegram/webhook
 * Health check
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: 'ok' });
}
