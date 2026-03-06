import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { document, type } = body;

    if (!document || !type) {
      return NextResponse.json({ error: 'Documento ou tipo não informados' }, { status: 400 });
    }

    // --- PADRONIZAÇÃO DE DADOS ---
    // Remove tudo que não for número (pontos, traços, barras) para padronizar o banco de dados
    const cleanDocument = document.replace(/\D/g, '');

    // Define se é CPF (1) ou CNPJ (2)
    const isCPF = type === 'CPF';
    const personType = isCPF ? 1 : 2;
    
    // Define o workflow correto: 6616 para CPF, 6600 para CNPJ
    const workflowId = isCPF ? 6616 : 6600;

    const API_BASE = process.env.ALIANT_API_URL;
    const USERNAME = process.env.ALIANT_USERNAME;
    const PASSWORD = process.env.ALIANT_PASSWORD;

    if (!API_BASE || !USERNAME || !PASSWORD) {
      throw new Error('Configurações da API Aliant ausentes.');
    }

    // ===============================================================
    // 1. VERIFICA SE O DOCUMENTO JÁ FOI CONSULTADO ANTES (NO BANCO)
    // ===============================================================
    const existingRecord = await prisma.processHistory.findFirst({
      where: { document: cleanDocument }, // Usa apenas os números para a busca
      orderBy: { createdAt: 'desc' }
    });

    // ===============================================================
    // 2. FAZ LOGIN NA ALIANT (Sempre precisamos do Token para buscar)
    // ===============================================================
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

    let processId; 

    // ===============================================================
    // 3. DECISÃO: REAPROVEITAR (ECONOMIZAR) OU CRIAR NOVO PROCESSO
    // ===============================================================
    if (existingRecord) {
      
      // CACHE HIT: O documento já existe! Vamos usar o ID salvo.
      processId = existingRecord.processId;
      console.log(`[ECONOMIA] Reutilizando processId ${processId} para o documento ${cleanDocument}`);
      
    } else {
      
      // CACHE MISS: Documento novo. Precisamos gastar uma requisição de criação.
      console.log(`[NOVA CONSULTA] Criando novo processo para o documento ${cleanDocument}`);
      
      // 3.1 Pegar Infos do Usuário
      const userRes = await fetch(`${API_BASE}/services/user/me`, { headers: authHeaders });
      if (!userRes.ok) throw new Error('Erro ao obter usuário');
      const userData = await userRes.json();
      const userId = userData.data.usuario.id;
      const clientId = userData.data.usuario.idcliente;

      // 3.2 Iniciar novo processo na Aliant
      const processBody = {
        document: document, // A Aliant aceita com pontuação, então enviamos o que veio do front
        workflows: [workflowId], 
        forceOpening: true,
        userId: String(userId),
        clientId: String(clientId),
        personWorkflows: [],
        entityWorkflows: [],
        partnerSearch: false,
        personType: personType, 
        webhook_url: "https://webhook.site/placeholder"
      };

      const processRes = await fetch(`${API_BASE}/services/process`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(processBody)
      });

      if (!processRes.ok) throw new Error('Erro ao iniciar processo');
      const processData = await processRes.json();
      processId = processData.process_id;

      // 3.3 Salvar o novo processo no banco de dados para economizar no futuro
      try {
        await prisma.processHistory.upsert({
          where: { processId: Number(processId) },
          update: {}, 
          create: {
            processId: Number(processId),
            document: cleanDocument, // Salva APENAS os números limpos no banco
            docType: type
          }
        });
      } catch (dbError) {
        console.error("Aviso: Erro ao salvar novo histórico no banco.", dbError);
      }
    }

    // ===============================================================
    // 4. BUSCAR OS RESULTADOS DA ALIANT E DEVOLVER PRO FRONT-END
    // ===============================================================
    const resultRes = await fetch(`${API_BASE}/services/process/${processId}`, {
      method: 'GET',
      headers: authHeaders
    });

    if (!resultRes.ok) throw new Error('Erro ao buscar resultado do processo na Aliant');
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