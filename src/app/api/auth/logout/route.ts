import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { addLog } from '@/lib/store';
import { decodeJwt } from 'jose';

export async function GET(req: Request) { // GET ou POST, ambos funcionam, GET é mais fácil p/ link
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  // Opcional: Registrar o Logout no log
  if (token) {
    try {
      const decoded = decodeJwt(token); // Decodifica sem verificar assinatura (mais rápido)
      if (decoded?.email) {
        addLog({ 
          email: decoded.email as string, 
          timestamp: new Date().toLocaleString(), 
          action: 'LOGOUT' 
        });
      }
    } catch (e) {
      // Ignora erro se token for inválido
    }
  }

  // DESTRÓI O COOKIE
  cookieStore.delete('auth_token');

  // Redireciona para o login
  return NextResponse.redirect(new URL('/login', req.url));
}