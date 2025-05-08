import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // WebSocket handling is disabled, we're connecting directly to the backend
  /* 
  if (request.nextUrl.pathname.startsWith('/ws')) {
    const backendWsUrl = 'ws://localhost:8000';
    const url = request.nextUrl.clone();
    url.host = new URL(backendWsUrl).host;
    return NextResponse.rewrite(url);
  }
  */
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
}; 