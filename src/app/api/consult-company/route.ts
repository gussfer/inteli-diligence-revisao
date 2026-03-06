/*
**********************************
VERSÃO PRODUÇÃO (processId dinâmico)
**********************************
*/

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { document, type } = body;

    if (!document || !type) {
      return NextResponse.json({ error: 'Documento ou tipo não informados' }, { status: 400 });
    }

    // --- AQUI ESTÁ A LÓGICA ATUALIZADA ---
    // Define se é CPF (1) ou CNPJ (2)
    const isCPF = type === 'CPF';
    const personType = isCPF ? 1 : 2;
    
    // Define o workflow correto: 6616 para CPF, 6600 para CNPJ
    const workflowId = isCPF ? 6616 : 6600;
    // -------------------------------------

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
      document: document,
      workflows: [workflowId], // Utiliza o ID dinâmico configurado lá em cima
      forceOpening: true,
      userId: String(userId),
      clientId: String(clientId),
      personWorkflows: [],
      entityWorkflows: [],
      partnerSearch: false,
      personType: personType, // Utiliza o tipo dinâmico configurado lá em cima
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
    
    // Injeta o process_id no retorno para o download do PDF funcionar no Front
    companyFullData.process_id = processId; 

    return NextResponse.json(companyFullData, { status: 200 });

  } catch (error) {
    console.error('Erro na consulta Aliant:', error);
    return NextResponse.json({ 
      error: 'Falha na consulta do fornecedor/parceiro', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

/*
**********************************
VERSÃO HOMOLOGAÇÃO (processId fixo(1714053))
**********************************
*/
// import { NextRequest, NextResponse } from 'next/server';

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { cnpj } = body;

//     const documentCnpj = cnpj; 

//     const API_BASE = process.env.ALIANT_API_URL;
//     const USERNAME = process.env.ALIANT_USERNAME;
//     const PASSWORD = process.env.ALIANT_PASSWORD;

//     if (!API_BASE || !USERNAME || !PASSWORD) {
//       throw new Error('Configurações da API Aliant ausentes.');
//     }

//     // 1. Login
//     const loginRes = await fetch(`${API_BASE}/portal/login`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ username: USERNAME, password: PASSWORD })
//     });
//     if (!loginRes.ok) throw new Error('Erro no Login Aliant');
//     const loginData = await loginRes.json();
//     const token = loginData.token;

//     const authHeaders = {
//       'Authorization': `Bearer ${token}`,
//       'Content-Type': 'application/json'
//     };

//     // 2. User Info
//     const userRes = await fetch(`${API_BASE}/services/user/me`, { headers: authHeaders });
//     if (!userRes.ok) throw new Error('Erro ao obter usuário');
//     const userData = await userRes.json();
//     // const userId = userData.data.usuario.id;
//     // const clientId = userData.data.usuario.idcliente;

//     /* ===============================================================
//       3. START PROCESS (COMENTADO PARA NÃO GASTAR COTA)
//       ===============================================================
//       const processBody = { ... }
//       const processRes = await fetch(...)
//       const processData = await processRes.json();
//       const processId = processData.process_id;
//     */

//     // ===============================================================
//     // MOCK FIXO: Usando o Process ID que você já tem!
//     // ===============================================================
//     const processId = 1714053; 

//     // 4. Get Results (Vai buscar direto os dados desse ID)
//     const resultRes = await fetch(`${API_BASE}/services/process/${processId}`, {
//       method: 'GET',
//       headers: authHeaders
//     });

//     if (!resultRes.ok) throw new Error('Erro ao buscar resultado');
//     const companyFullData = await resultRes.json();

//     // Adicionamos o processId dentro do retorno para garantir que o front-end ache ele na hora de baixar o PDF
//     companyFullData.process_id = processId;

//     // RETORNA APENAS OS DADOS BRUTOS
//     return NextResponse.json(companyFullData, { status: 200 });

//   } catch (error) {
//     console.error('Erro na consulta Aliant:', error);
//     return NextResponse.json({ 
//       error: 'Falha na consulta do fornecedor', 
//       details: error instanceof Error ? error.message : String(error) 
//     }, { status: 500 });
//   }
// }

