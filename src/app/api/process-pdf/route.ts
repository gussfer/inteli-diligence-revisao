import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo não enviado corretamente' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ⇩ carregamento dinâmico de pdf-parse
    const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'Chave da API OpenAI não configurada no servidor' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const systemPrompt = 
`Você é um assistente da Auditoria interna do Grupo Algar e tem a responsabilidade de realizar uma avaliação due diligence para avaliar a possível contratação de fornecedores a partir de informações contidas em documentos PDF.
Sua análise Due Diligence deve:
1. Ler e interpretar o conteúdo do PDF enviado.
2. Avaliar possíveis riscos, alertas ou informações sensíveis encontradas.
3. Retornar um parecer com a seguinte estrutura:

SUMÁRIO EXECUTIVO
Visão geral das informações relevantes contidas no PDF, evidenciando o nome da Empresa pesquisada;
Principais pontos de atenção;
Nível de risco geral (Baixo, Médio, Alto) explicando o porquê.

ANÁLISE DETALHADA
Resumo detalhado das evidências encontradas.

RECOMENDAÇÃO E CONCLUSÃO
Recomendações objetivas e bem fundamentadas com base no conteúdo analisado.`;

    const userPrompt = `Por favor, analise o seguinte conteúdo extraído do PDF e gere o Parecer da Auditoria Interna:\n\n${fullText}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 2000
    });

    const aiResponse = completion.choices[0]?.message?.content || 'Não foi possível gerar uma análise.';

    return NextResponse.json({ generatedReport: aiResponse }, { status: 200 });
  } catch (error) {
    console.error('Erro ao processar PDF ou gerar relatório:', error);
    return NextResponse.json({ error: 'Erro ao processar PDF ou gerar relatório', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}