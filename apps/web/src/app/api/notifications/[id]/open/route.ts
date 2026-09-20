import { NextResponse } from 'next/server';
import { markRead } from '@/modules/notifications';
import { appUrl } from '@/server/env';
import { getActor } from '@/server/session';

function safePath(path: string | null): string {
  return path && path.startsWith('/') && !path.startsWith('//') ? path : '/notifications';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const actor = await getActor();
  if (!actor.userId) return NextResponse.redirect(new URL('/sign-in', appUrl));

  const link = await markRead(actor, id).catch(() => null);
  return NextResponse.redirect(new URL(safePath(link), appUrl));
}
