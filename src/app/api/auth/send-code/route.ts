import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  console.log("--- INÍCIO DO PROCESSO DE ENVIO ---"); // LOG 1

  try {
    const { email } = await req.json();
    const emailLower = email.toLowerCase().trim();
    console.log("Email recebido:", emailLower); // LOG 2

    // 1. Verifica User
    const user = await prisma.allowedUser.findUnique({
      where: { email: emailLower }
    });

    if (!user || !user.isActive) {
      console.log("Usuário não encontrado ou inativo"); // LOG ERRO
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Código Gerado:", code); // LOG 3

    // 2. Salva no Banco (AQUI ESTÁ O MISTÉRIO)
    console.log("Tentando salvar no banco..."); // LOG 4
    
    // Limpa anteriores
    await prisma.verificationCode.deleteMany({
      where: { email: emailLower }
    });

    // Cria novo
    const savedCode = await prisma.verificationCode.create({
      data: {
        email: emailLower,
        code: code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
    
    console.log("Salvo no banco com sucesso! ID:", savedCode.id); // LOG 5

    // 3. Envia Email
    console.log("Preparando envio de email..."); // LOG 6
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
      subject: 'Código de Verificação',
      html: `<p>Seu código: <b>${code}</b></p>`,
    });
    
    console.log("Email enviado!"); // LOG 7

    return NextResponse.json({ message: 'Código enviado' });

  } catch (error) {
    console.error('ERRO FATAL:', error); // LOG ERRO FATAL
    return NextResponse.json({ error: 'Erro no envio.' }, { status: 500 });
  }
}