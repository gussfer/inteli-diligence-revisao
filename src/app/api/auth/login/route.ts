import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { activeCodes, addLog } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    
    // Normaliza para minúsculo para evitar erros de digitação
    const emailLower = email.toLowerCase().trim();
    const codeClean = code.trim();

    const stored = activeCodes.get(emailLower);

    // --- DEBUG NO TERMINAL DO VSCODE ---
    console.log('--- TENTATIVA DE LOGIN ---');
    console.log(`Email recebido: ${emailLower}`);
    console.log(`Código recebido: ${codeClean}`);
    console.log(`Código esperado: ${stored?.code}`);
    console.log(`Expira em: ${stored ? new Date(stored.expires).toLocaleTimeString() : 'N/A'}`);
    // -----------------------------------

    // Validação 1: Código existe?
    if (!stored) {
      console.log('ERRO: Código não encontrado na memória (Servidor reiniciou?)');
      addLog({ email: emailLower, timestamp: new Date().toLocaleString(), action: 'ACCESS_DENIED' });
      return NextResponse.json({ error: 'Código não encontrado. Solicite um novo.' }, { status: 401 });
    }

    // Validação 2: Código bate?
    if (stored.code !== codeClean) {
      console.log('ERRO: Código incorreto');
      addLog({ email: emailLower, timestamp: new Date().toLocaleString(), action: 'ACCESS_DENIED' });
      return NextResponse.json({ error: 'Código incorreto' }, { status: 401 });
    }

    // Validação 3: Expirou?
    if (Date.now() > stored.expires) {
      console.log('ERRO: Código expirado');
      activeCodes.delete(emailLower);
      return NextResponse.json({ error: 'Código expirado' }, { status: 401 });
    }

    // SUCESSO
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({ email: emailLower })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('2h')
      .sign(secret);

    (await cookies()).set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 2, // 2 horas
      path: '/',
    });

    activeCodes.delete(emailLower); // Limpa o código usado
    addLog({ email: emailLower, timestamp: new Date().toLocaleString(), action: 'LOGIN' });
    console.log('SUCESSO: Login realizado');

    return NextResponse.json({ message: 'Login realizado' });

  } catch (error) {
    console.error('Erro interno no login:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}