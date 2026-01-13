import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma'; // Importa o banco

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    const emailLower = email.toLowerCase().trim();
    const codeClean = code.trim();

    // --- MUDANÇA AQUI: Busca no Banco de Dados ---
    const validCode = await prisma.verificationCode.findFirst({
      where: {
        email: emailLower,
        code: codeClean,
        expiresAt: {
          gt: new Date() // Garante que a data de expiração é MAIOR que agora (não venceu)
        }
      }
    });

    if (!validCode) {
      // Se não achou, ou o código tá errado ou venceu
      return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 401 });
    }

    // Se achou, deleta o código para não ser usado duas vezes (segurança)
    await prisma.verificationCode.delete({
      where: { id: validCode.id }
    });
    // ---------------------------------------------

    // Gera o Token JWT (Mantido igual)
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
    
    // Log de acesso (Mantido igual)
    await prisma.accessLog.create({
        data: { email: emailLower, action: 'LOGIN_SUCCESS' }
    });

    return NextResponse.json({ message: 'Login realizado' });

  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}