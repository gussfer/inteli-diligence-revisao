import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { activeCodes } from '@/lib/store';
import { prisma } from '@/lib/prisma'; // <--- Importamos o banco

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    const emailLower = email.toLowerCase().trim();
    const codeClean = code.trim();

    const stored = activeCodes.get(emailLower);

    // Função auxiliar para gravar log no banco
    const logAccess = async (action: string) => {
      await prisma.accessLog.create({
        data: {
          email: emailLower,
          action: action,
          // ip: req.headers.get('x-forwarded-for') || 'unknown' // (Opcional se quiser pegar IP)
        }
      });
    };

    if (!stored) {
      await logAccess('ACCESS_DENIED_NO_CODE');
      return NextResponse.json({ error: 'Código não encontrado. Solicite novo.' }, { status: 401 });
    }

    if (stored.code !== codeClean) {
      await logAccess('ACCESS_DENIED_WRONG_CODE');
      return NextResponse.json({ error: 'Código incorreto' }, { status: 401 });
    }

    if (Date.now() > stored.expires) {
      activeCodes.delete(emailLower);
      await logAccess('ACCESS_DENIED_EXPIRED');
      return NextResponse.json({ error: 'Código expirado' }, { status: 401 });
    }

    // --- SUCESSO ---
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ email: emailLower })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(secret);

    (await cookies()).set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 2,
      path: '/',
    });

    activeCodes.delete(emailLower);
    
    // Grava o Login com sucesso no banco
    await logAccess('LOGIN_SUCCESS');

    return NextResponse.json({ message: 'Login realizado' });

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}