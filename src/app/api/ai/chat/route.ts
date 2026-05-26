import { authAdmin } from '@/lib/firebaseAdmin';
import { generateChatResponse } from '@/lib/ai';
import { NextRequest, NextResponse } from 'next/server';

async function getUserId(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = await authAdmin.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { message, history = [] } = await req.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
    }

    const result = await generateChatResponse(userId, message.trim(), history);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in AI chat:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
