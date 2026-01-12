import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);

  // Rotas públicas (Login e APIs de Auth)
  if (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Verifica se tem token
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    // Valida a assinatura do token
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch (error) {
    // Token inválido
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

// Configura quais rotas o middleware vai "vigiar"
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};