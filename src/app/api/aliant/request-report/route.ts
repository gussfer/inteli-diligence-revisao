import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { processId } = await req.json();

    if (!processId) {
      return NextResponse.json({ error: 'ProcessId não informado' }, { status: 400 });
    }

    // Variáveis do .env
    const API_BASE = process.env.ALIANT_API_URL;
    const USERNAME = process.env.ALIANT_USERNAME;
    const PASSWORD = process.env.ALIANT_PASSWORD;

    if (!API_BASE || !USERNAME || !PASSWORD) {
      throw new Error('Configurações da API Aliant ausentes.');
    }

    // 1. Faz o Login para obter o Token
    const loginRes = await fetch(`${API_BASE}/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    if (!loginRes.ok) throw new Error('Erro no Login Aliant ao solicitar PDF');
    const { token } = await loginRes.json();

    // 2. Solicita o Relatório
    // A doc pede GET e os parâmetros soltos na URL. Colocamos um webhook "dummy" (falso) pois usaremos polling.
    const dummyWebhook = "https://google.com"; 
    const requestUrl = `${API_BASE}/services/process/${processId}/report?type=full&language=pt&${dummyWebhook}`;

    const reportRes = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await reportRes.json();

    if (!reportRes.ok || data.status !== 'Success') {
      throw new Error(data.message || 'Erro ao solicitar PDF na Aliant');
    }

    // Retornamos o ID do relatório para o Front-end fazer o acompanhamento
    return NextResponse.json({ 
      success: true, 
      reportId: data.data.id 
    });

  } catch (error) {
    console.error('Erro na solicitação de PDF Aliant:', error);
    return NextResponse.json({ error: 'Erro interno ao solicitar PDF' }, { status: 500 });
  }
}