import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Busca os últimos 50 logs, ordenados do mais recente para o mais antigo
    const logs = await prisma.accessLog.findMany({
      take: 50,
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Formata a data para ficar legível no frontend
    const formattedLogs = logs.map(log => ({
      ...log,
      timestamp: new Date(log.timestamp).toLocaleString('pt-BR'),
    }));

    return NextResponse.json({ logs: formattedLogs });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar logs' }, { status: 500 });
  }
}