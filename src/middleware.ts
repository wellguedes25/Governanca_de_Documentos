import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

// Rotas públicas que não exigem validação prévia de conexão
const PUBLIC_PATHS = [
  '/connect',
  '/api/auth/connect',
  '/api/auth/session',
  '/api/auth/disconnect',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permite acesso imediato a rotas públicas
  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path));

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionToken);
  const isAuthenticated = !!session;

  // Se já estiver autenticado e tentar acessar /connect ou /, redireciona para o dashboard
  if (isAuthenticated && (pathname === '/connect' || pathname === '/')) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Se não estiver autenticado:
  if (!isAuthenticated && !isPublicPath) {
    // Para endpoints de API de negócio, retorna 401 em vez de redirect HTML
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          error: 'Sessão não autorizada ou expirada.',
          code: 'UNAUTHENTICATED',
          message: 'Realize a conexão no portal antes de consultar dados.' 
        },
        { status: 401 }
      );
    }

    // Para páginas da aplicação, redireciona para a tela de conexão
    const connectUrl = new URL('/connect', request.url);
    if (pathname !== '/') {
      connectUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(connectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Intercepta todas as requisições exceto assets estáticos do Next.js e arquivos de imagem
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)',
  ],
};
