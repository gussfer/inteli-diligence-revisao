import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { activeCodes } from '@/lib/store';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // 1. Verifica permissão no banco
    const user = await prisma.allowedUser.findUnique({
      where: { email: emailLower }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Acesso negado. Usuário não cadastrado.' }, { status: 403 });
    }

    // 2. Gera código
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    activeCodes.set(emailLower, {
      code,
      expires: Date.now() + 5 * 60 * 1000
    });

    // 3. Transporter GMAIL (Mais permissivo para apps de teste)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Seu gmail
        pass: process.env.EMAIL_PASS, // Sua senha de app do gmail
      },
    });

    // 4. Envia o e-mail
    await transporter.sendMail({
      from: `"Inteli Diligence" <${process.env.EMAIL_USER}>`,
      to: emailLower, // Envia PARA o e-mail corporativo da Algar
      subject: 'Código de Acesso - Inteli Diligence',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1E4C78;">Inteli Diligence</h2>
          <p>Seu código de acesso é:</p>
          <div style="background-color: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; width: 200px;">
            ${code}
          </div>
        </div>
      `,
    });

    return NextResponse.json({ message: 'Código enviado' });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro no envio de e-mail' }, { status: 500 });
  }
}