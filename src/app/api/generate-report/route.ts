import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { decodeJwt } from 'jose';

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação (Mantida igual)
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const decoded = decodeJwt(token);
    const userEmail = decoded.email as string || 'desconhecido';

    // 2. Recebe dados
    const body = await request.json();
    const { companyData } = body;
    const cnpj = companyData.document || companyData.registrationData?.document || "N/A";
    const companyName = companyData.registrationData?.company_name || "Nome não identificado";

    // 3. Configura IA
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const systemPrompt = `
      Você é um Auditor Sênior de Compliance do Grupo Algar (Inteli Diligence).
      Sua tarefa é analisar os dados da empresa e gerar um Parecer de Due Diligence.

      CONTEXTO DOS DADOS:
        - "registrationData": Dados cadastrais.
        - "corporateData": Quadro societário (QSA).
        - "risk": Score de risco (0-100) e probabilidade (ex: "Crítico").
        - "themes": Listas restritivas, processos, mídia negativa.
      
      IMPORTANTE: Você deve retornar APENAS um JSON válido no seguinte formato:
      {
        "riskLevel": "BAIXO" | "MEDIO" | "ALTO",
        "reportText": "O texto completo do parecer aqui (com quebras de linha \\n)..."
      }

      CRITÉRIOS DE RISCO:
      - ALTO: Presença de PEPs (Pessoas Expostas Politicamente), processos criminais, capital social irrisório (< R$ 5k), ou empresa inapta.
      - MEDIO: Processos trabalhistas recentes, endereço residencial, atividade econômica divergente.
      - BAIXO: Empresa regular, sócios idôneos, sem processos relevantes.

      ESTRUTURA DO TEXTO (reportText):
      1. IDENTIFICAÇÃO
      2. ANÁLISE SOCIETÁRIA (Quadro de Sócios e Administradores)
      3. APONTAMENTOS DE RISCO (Liste claramente as Red Flags)
      4. CONCLUSÃO E RECOMENDAÇÃO (Favorable ou Desfavorable)
    `;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analise estes dados JSON:\n${JSON.stringify(companyData)}` }
      ],
      response_format: { type: "json_object" }, // <--- O PULO DO GATO
      temperature: 0.4, 
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Sem resposta da IA");

    // Parse do JSON que a IA gerou
    const result = JSON.parse(content);

    // Retorna para o Frontend já separado
    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Falha ao processar' }, { status: 500 });
  }
}