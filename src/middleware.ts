import { NextRequest, NextResponse } from 'next/server';
// ❌ REMOVE THIS IMPORT:
// import { getCurrentUser } from './lib/serverAuth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public access
  if (
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/sw') ||
    pathname.startsWith('/public/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // ✅ Check for the existence of the cookie directly from the request
  const session = request.cookies.get('session')?.value;

  // If there's no session cookie, redirect to login
  if (!session && pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|public).*)'],
};