import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { activeCodes } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
    }

    // Gera código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Salva na memória (expira em 5 minutos)
    activeCodes.set(email, {
      code,
      expires: Date.now() + 5 * 60 * 1000
    });

    // Configura o transportador de e-mail
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Ou outro serviço SMTP
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Inteli Diligence" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Seu código de acesso - Inteli Diligence',
      text: `Seu código de verificação é: ${code}`,
      html: `<p>Seu código de verificação é: <b>${code}</b></p><p>Válido por 5 minutos.</p>`,
    });

    return NextResponse.json({ message: 'Código enviado' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao enviar e-mail' }, { status: 500 });
  }
}