import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma'; // Importa o banco
import { decodeJwt } from 'jose';      // Para ler quem é o usuário

export async function POST(request: NextRequest) {
  try {
    // 1. Segurança: Identificar quem está pedindo
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    
    // Decodifica o token para pegar o e-mail (sem verificar assinatura de novo pra ganhar tempo, pois o middleware já barrou se fosse inválido)
    const decoded = decodeJwt(token);
    const userEmail = decoded.email as string || 'desconhecido';

    // 2. Receber dados
    const body = await request.json();
    const { companyData } = body;

    if (!companyData) {
      return NextResponse.json({ error: 'Dados da empresa não fornecidos.' }, { status: 400 });
    }

    // Tenta extrair o CNPJ e Nome do JSON complexo da Aliant para facilitar a busca no banco depois
    // (Ajuste esses caminhos conforme o JSON real da Aliant se mudar)
    const cnpj = companyData.document || companyData.registrationData?.document || "N/A";
    const companyName = companyData.registrationData?.company_name || "Nome não identificado";

    // 3. Gerar Parecer com OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const systemPrompt = 
`Você é um assistente sênior da Auditoria Interna do Grupo Algar.
Sua função é analisar os dados técnicos da API Aliant e redigir um parecer executivo. Sem negritos.

CONTEXTO DOS DADOS:
- "registrationData": Dados cadastrais.
- "corporateData": Quadro societário (QSA).
- "risk": Score de risco (0-100) e probabilidade (ex: "Crítico").
- "themes": Listas restritivas, processos, mídia negativa.

ESTRUTURA DO PARECER:
1. IDENTIFICAÇÃO (Razão social, CNPJ, Fundação).
2. ANÁLISE DE RISCO (Score, Classificação e Motivos).
3. QUADRO SOCIETÁRIO (Principais nomes).
4. PONTOS DE ATENÇÃO (Processos, Dívidas, Sanções).
5. CONCLUSÃO (Recomendação de contratação).

Se não houver dados de risco, mencione isso explicitamente.`;

    const userPrompt = `Analise estes dados:\n\n${JSON.stringify(companyData, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 2500
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Sem análise gerada.';

    // 4. SALVAR NO BANCO DE DADOS (AUDITORIA)
    await prisma.consultation.create({
      data: {
        cnpj: String(cnpj),           // Garante que é string
        companyName: String(companyName).substring(0, 100), // Limita tamanho por segurança
        rawJson: companyData,         // Salva o JSON completo da Aliant
        aiReport: aiResponse,         // Salva o texto gerado pela IA
        requestedBy: userEmail,       // Salva quem pediu
      }
    });

    return NextResponse.json({ generatedReport: aiResponse }, { status: 200 });

  } catch (error) {
    console.error('Erro na geração/salvamento:', error);
    return NextResponse.json({ error: 'Falha ao processar solicitação' }, { status: 500 });
  }
}