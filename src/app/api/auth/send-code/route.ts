import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { activeCodes } from '@/lib/store'; // Mantemos a memória para o código temporário
import { prisma } from '@/lib/prisma';     // <--- Importamos o banco

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // --- NOVA VERIFICAÇÃO NO BANCO ---
    const user = await prisma.allowedUser.findUnique({
      where: { email: emailLower }
    });

    if (!user || !user.isActive) {
      // Dica de segurança: Às vezes é bom não avisar que o e-mail não existe,
      // mas como é ferramenta interna, vamos avisar para facilitar.
      return NextResponse.json({ error: 'Acesso negado. Usuário não cadastrado ou inativo.' }, { status: 403 });
    }
    // ---------------------------------

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    activeCodes.set(emailLower, {
      code,
      expires: Date.now() + 5 * 60 * 1000
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Inteli Diligence" <${process.env.EMAIL_USER}>`,
      to: emailLower,
      subject: 'Seu código de acesso',
      text: `Seu código: ${code}`,
      html: `<p>Seu código é: <b>${code}</b></p>`,
    });

    return NextResponse.json({ message: 'Código enviado' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 });
  }
}