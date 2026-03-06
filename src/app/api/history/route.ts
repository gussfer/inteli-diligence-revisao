import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const processes = await prisma.ProcessHistory.findMany({
      orderBy: { createdAt: 'desc' } // Mostra os mais recentes primeiro
    });
    return NextResponse.json(processes);
  } catch (error) {
    console.error("Erro ao buscar histórico no DB:", error);
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 });
  }
}