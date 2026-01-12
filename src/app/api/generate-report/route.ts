import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    // Recebe os dados JSON que já estão no frontend
    const body = await request.json();
    const { companyData } = body;

    if (!companyData) {
      return NextResponse.json({ error: 'Dados da empresa não fornecidos.' }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const systemPrompt = 
`Você é um assistente sênior da Auditoria Interna do Grupo Algar.
Sua função é analisar os dados técnicos da API Aliant e redigir um parecer executivo.

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

    return NextResponse.json({ generatedReport: aiResponse }, { status: 200 });

  } catch (error) {
    console.error('Erro na OpenAI:', error);
    return NextResponse.json({ error: 'Falha ao gerar parecer IA' }, { status: 500 });
  }
}