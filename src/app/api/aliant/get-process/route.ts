import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const processId = req.nextUrl.searchParams.get('id');

    if (!processId) {
      return NextResponse.json({ error: 'ID do processo não informado' }, { status: 400 });
    }

    const API_BASE = process.env.ALIANT_API_URL;
    const USERNAME = process.env.ALIANT_USERNAME;
    const PASSWORD = process.env.ALIANT_PASSWORD;

    if (!API_BASE || !USERNAME || !PASSWORD) {
      throw new Error('Configurações da API Aliant ausentes.');
    }

    // 1. Login na Aliant
    const loginRes = await fetch(`${API_BASE}/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    
    if (!loginRes.ok) throw new Error('Erro no Login Aliant');
    const { token } = await loginRes.json();

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Buscar o Processo pelo ID
    const resultRes = await fetch(`${API_BASE}/services/process/${processId}`, {
      method: 'GET',
      headers: authHeaders
    });

    if (!resultRes.ok) throw new Error('Erro ao buscar resultado do processo na Aliant');
    
    const processData = await resultRes.json();
    processData.process_id = processId; // Injeta o ID para garantir

    return NextResponse.json(processData, { status: 200 });

  } catch (error) {
    console.error('Erro na busca do histórico Aliant:', error);
    return NextResponse.json({ error: 'Falha ao buscar o histórico' }, { status: 500 });
  }
}