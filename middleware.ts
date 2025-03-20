import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);
  
  // Add request ID header for tracing
  requestHeaders.set('x-request-id', crypto.randomUUID());
  
  // Add timeout header for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Set a generous API timeout but still with a limit
    requestHeaders.set('x-api-timeout', '30000'); // 30 seconds
  }
  
  // Get response for the request
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Set max-age cache header for static assets
  if (request.nextUrl.pathname.includes('/_next/static')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  return response;
}

// Match all API routes and page routes
export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 