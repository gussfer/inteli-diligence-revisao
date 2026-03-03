import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const reportId = req.nextUrl.searchParams.get('id');

    if (!reportId) {
      return NextResponse.json({ error: 'ID do relatório não informado' }, { status: 400 });
    }

    // Variáveis do .env
    const API_BASE = process.env.ALIANT_API_URL;
    const USERNAME = process.env.ALIANT_USERNAME;
    const PASSWORD = process.env.ALIANT_PASSWORD;

    // 1. Faz o Login para obter o Token (precisamos do token para o download também)
    const loginRes = await fetch(`${API_BASE}/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    if (!loginRes.ok) throw new Error('Erro no Login Aliant ao tentar baixar PDF');
    const { token } = await loginRes.json();

    // 2. Tentar baixar o PDF
    const downloadUrl = `${API_BASE}/downloadReport/${reportId}`;

    const downloadRes = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Imitar um navegador (User-Agent) às vezes evita bloqueios de segurança em APIs Java
        'User-Agent': 'Mozilla/5.0'
      }
    });

    // Se o status NÃO for 200, significa que o PDF ainda está sendo gerado ou não foi achado.
    // Retornamos 202 (Accepted) para o frontend saber que tem que continuar esperando.
    if (!downloadRes.ok) {
      return NextResponse.json({ status: 'PENDING' }, { status: 202 });
    }

    // Pega o binário do PDF
    const pdfBlob = await downloadRes.blob();

    // Devolve para o navegador
    return new NextResponse(pdfBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Relatorio_Aliant_Processo_${reportId}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Erro no download do PDF Aliant:', error);
    return NextResponse.json({ error: 'Erro interno ao baixar PDF' }, { status: 500 });
  }
}