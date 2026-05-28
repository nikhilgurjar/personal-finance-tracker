import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from './lib/serverAuth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public access to:
  // - Manifest file (PWA config)
  // - Service worker
  // - Public assets
  // - Auth endpoints
  // - Home page (login page)
  if (
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/sw') ||
    pathname.startsWith('/public/') ||
    pathname.startsWith('/api/auth/') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // For all other routes, check authentication
  const user = await getCurrentUser();

  if (!user && pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
