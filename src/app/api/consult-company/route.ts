import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cnpj } = body;

    const documentCnpj = cnpj; // Mantém a pontuação conforme seu teste

    const API_BASE = process.env.ALIANT_API_URL;
    const USERNAME = process.env.ALIANT_USERNAME;
    const PASSWORD = process.env.ALIANT_PASSWORD;

    if (!API_BASE || !USERNAME || !PASSWORD) {
      throw new Error('Configurações da API Aliant ausentes.');
    }

    // 1. Login
    const loginRes = await fetch(`${API_BASE}/portal/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    if (!loginRes.ok) throw new Error('Erro no Login Aliant');
    const loginData = await loginRes.json();
    const token = loginData.token;

    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. User Info
    const userRes = await fetch(`${API_BASE}/services/user/me`, { headers: authHeaders });
    if (!userRes.ok) throw new Error('Erro ao obter usuário');
    const userData = await userRes.json();
    const userId = userData.data.usuario.id;
    const clientId = userData.data.usuario.idcliente;

    // 3. Start Process
    const processBody = {
      document: documentCnpj,
      workflows: [6600], // alterar para 6600 em produção
      forceOpening: true,
      userId: String(userId),
      clientId: String(clientId),
      personWorkflows: [],
      entityWorkflows: [],
      partnerSearch: false,
      personType: 2,
      webhook_url: "https://webhook.site/placeholder"
    };

    const processRes = await fetch(`${API_BASE}/services/process`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(processBody)
    });

    if (!processRes.ok) throw new Error('Erro ao iniciar processo');
    const processData = await processRes.json();
    const processId = processData.process_id;

    // 4. Get Results
    const resultRes = await fetch(`${API_BASE}/services/process/${processId}`, {
      method: 'GET',
      headers: authHeaders
    });

    if (!resultRes.ok) throw new Error('Erro ao buscar resultado');
    const companyFullData = await resultRes.json();

    // RETORNA APENAS OS DADOS BRUTOS
    return NextResponse.json(companyFullData, { status: 200 });

  } catch (error) {
    console.error('Erro na consulta Aliant:', error);
    return NextResponse.json({ 
      error: 'Falha na consulta do fornecedor', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}