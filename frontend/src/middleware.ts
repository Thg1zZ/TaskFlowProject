import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Lê o cookie "token" criado pelo backend
  const token = request.cookies.get('token');

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isAuthRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register';

  let response = NextResponse.next();

  if (isProtectedRoute && !token) {
    response = NextResponse.redirect(new URL('/login', request.url));
  } else if (isAuthRoute && token) {
    response = NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Security headers obrigatórios
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // [ASVS 14.4.3] Content-Security-Policy que inclui recursos necessários para o Google Identity Services e Google Fonts
  const csp = "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "img-src 'self' data: blob: https:; " +
              "frame-src 'self' https://accounts.google.com; " +
              "connect-src 'self' http: https: ws: wss: https://accounts.google.com;";
  response.headers.set('Content-Security-Policy', csp);
  
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
