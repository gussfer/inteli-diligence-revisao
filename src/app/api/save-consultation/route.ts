import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decodeJwt } from 'jose';

export async function POST(request: NextRequest) {
  try {
    // 1. Quem está salvando?
    const token = request.cookies.get('auth_token')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    
    const decoded = decodeJwt(token);
    const userEmail = decoded.email as string || 'desconhecido';

    // 2. Recebe os dados JÁ EDITADOS pelo auditor
    const body = await request.json();
    const { companyData, reportText, riskLevel } = body;

    if (!companyData || !reportText) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Extrai dados básicos para colunas de busca
    const cnpj = companyData.document || companyData.registrationData?.document || "N/A";
    const companyName = companyData.registrationData?.company_name || "Nome não identificado";

    // 3. AGORA SIM, SALVA NO BANCO
    const savedRecord = await prisma.consultation.create({
      data: {
        cnpj: String(cnpj),
        companyName: String(companyName).substring(0, 100),
        rawJson: companyData,        // O JSON original da Aliant
        aiReport: reportText,        // O texto FINAL (editado)
        riskLevel: riskLevel,        // O risco validado
        requestedBy: userEmail,
      }
    });

    return NextResponse.json({ success: true, id: savedRecord.id }, { status: 201 });

  } catch (error) {
    console.error('Erro ao salvar:', error);
    return NextResponse.json({ error: 'Erro ao salvar no banco' }, { status: 500 });
  }
}