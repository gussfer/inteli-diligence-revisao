'use client';

import { useState } from 'react';
import Image from 'next/image';
import algarLogo from '@/assets/logo_algar.png';
import JsonView from '@uiw/react-json-view'; // Visualizador de JSON
import { useRouter } from 'next/navigation'; 

export const UploadPdfReport = () => { // Lembre-se: Sugiro renomear para SearchCompanies futuramente
  const router = useRouter(); 

  // --- NOVOS ESTADOS: Controle de Documento ---
  const [docType, setDocType] = useState<'CNPJ' | 'CPF'>('CNPJ');
  const [documentInput, setDocumentInput] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  
  // Estados de Controle
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);    
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false); // Controle do Download Aliant
  
  // Estados de Dados
  const [companyData, setCompanyData] = useState<any>(null);
  
  // Estados para o Parecer 2.0
  const [reportText, setReportText] = useState('');          
  const [riskLevel, setRiskLevel] = useState('');            
  const [errorMessage, setErrorMessage] = useState('');

  // --- NOVA MÁSCARA DINÂMICA (CPF / CNPJ) ---
  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');

    if (docType === 'CPF') {
      if (value.length > 11) value = value.slice(0, 11);
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d)/, '$1.$2');
      value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      if (value.length > 14) value = value.slice(0, 14);
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    setDocumentInput(value);
  };

  // PASSO 1: Buscar Dados (Aliant)
  const handleConsultData = async () => {
    const cleanDoc = documentInput.replace(/\D/g, '');
    
    // Validação de tamanho com base no tipo selecionado
    if ((docType === 'CPF' && cleanDoc.length !== 11) || (docType === 'CNPJ' && cleanDoc.length !== 14)) {
      setErrorMessage(`Documento inválido. Digite um ${docType} completo.`);
      return;
    }

    setIsLoadingData(true);
    setErrorMessage('');
    setCompanyData(null);
    setReportText(''); 
    setRiskLevel('');  

    try {
      const response = await fetch('/api/consult-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Envia o documento E o tipo (CPF ou CNPJ)
        body: JSON.stringify({ document: documentInput, type: docType }), 
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.details || 'Erro ao consultar.');
      
      setCompanyData(data); 
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erro desconhecido.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // PASSO 2: Gerar Parecer (OpenAI)
  const handleGenerateReport = async () => {
    if (!companyData) return;

    setIsAnalyzing(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyData }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar parecer.');

      setReportText(data.reportText || data.generatedReport || "Erro ao ler texto.");
      setRiskLevel(data.riskLevel || "NÃO CLASSIFICADO");

    } catch (error) {
      console.error(error);
      setErrorMessage('Erro ao gerar análise com IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // BAIXAR PDF ORIGINAL DA ALIANT
  const handleDownloadAliantPdf = async () => {
    const processId = companyData?.process_id || companyData?.id; 

    if (!processId) {
      alert("ID do processo não encontrado nos dados da consulta.");
      return;
    }

    setIsDownloadingPdf(true);

    try {
      const reqResponse = await fetch('/api/aliant/request-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId })
      });

      const reqData = await reqResponse.json();
      if (!reqResponse.ok) throw new Error(reqData.error || 'Erro ao pedir o relatório');

      const reportId = reqData.reportId;
      let isReady = false;
      let attempts = 0;

      while (!isReady && attempts < 12) {
        attempts++;
        
        const downloadResponse = await fetch(`/api/aliant/download-report?id=${reportId}`);
        
        if (downloadResponse.status === 200) {
          const blob = await downloadResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Relatorio_Aliant_${processId}.pdf`; 
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          isReady = true;
        } else {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }

      if (!isReady) {
        alert("O relatório está demorando para ser gerado pela Aliant. Tente novamente mais tarde.");
      }

    } catch (error) {
      console.error(error);
      alert("Erro na operação de download do relatório Aliant.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Função para fazer logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    router.push('/login');
  };

  // Função Auxiliar para Cor do Risco
  const getRiskBadgeColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'ALTO': return 'bg-red-600';
      case 'MEDIO': return 'bg-yellow-500';
      case 'BAIXO': return 'bg-green-600';
      default: return 'bg-gray-500';
    }
  };

  // Função para salvar informações no banco
  const handleFinalize = async () => {
    if (!companyData || !reportText) return;

    setIsSaving(true);

    try {
      const response = await fetch('/api/save-consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyData: companyData,
          reportText: reportText,   
          riskLevel: riskLevel      
        }),
      });

      if (!response.ok) throw new Error('Erro ao salvar');

      alert('✅ Auditoria finalizada e salva com sucesso!');
      
    } catch (error) {
      alert('Erro ao salvar o registro.');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='w-full h-auto bg-white flex flex-col items-center pb-20'>
      {/* Header */}
      <div className='h-72 md:min-h-[400px] w-full flex flex-col gap-6 items-center justify-center bg-gradient-to-l from-[#1E4C78] to-[#1E4C78] relative shadow-lg'>
        <Image src={algarLogo} alt='Logo Algar' width={160} height={20} className="absolute top-4 left-4" />
        
        <button 
          onClick={handleLogout}
          className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-600 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
        >
          Sair / Logout
        </button>
        <h2 className='font-bold text-2xl md:text-4xl text-white mt-12'>🧠 Inteli Diligence</h2>
        
        {/* --- SEÇÃO DE CONSULTA (TOGGLE + FORM) --- */}
        <div className="flex flex-col w-full max-w-lg z-10 gap-2">
          
          {/* BOTÕES DE SELEÇÃO DE DOCUMENTO */}
          <div className="flex bg-white/20 p-1 rounded-lg w-full mb-1">
            <button
              type="button"
              onClick={() => { setDocType('CNPJ'); setDocumentInput(''); setErrorMessage(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                docType === 'CNPJ' ? 'bg-white text-[#1E4C78] shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              🏢 Pessoa Jurídica (CNPJ)
            </button>
            <button
              type="button"
              onClick={() => { setDocType('CPF'); setDocumentInput(''); setErrorMessage(''); }}
              className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${
                docType === 'CPF' ? 'bg-white text-[#1E4C78] shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              👤 Pessoa Física (CPF)
            </button>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault(); 
              handleConsultData(); 
            }}
            className="flex flex-col md:flex-row gap-2 items-center w-full"
          >
            <input
              type='text'
              value={documentInput}
              onChange={handleDocumentChange}
              placeholder={docType === 'CNPJ' ? "00.000.000/0000-00" : "000.000.000-00"}
              className='w-full p-4 rounded-lg text-lg font-bold text-gray-800 outline-none shadow-lg'
            />
            <button 
              type="submit" 
              disabled={isLoadingData || isAnalyzing}
              className='w-full md:w-auto px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition-all'
            >
              {isLoadingData ? 'Buscando...' : 'Consultar'}
            </button>
          </form>
        </div>
      </div>

      {/* Mensagens de Erro */}
      {errorMessage && (
        <div className='mt-8 p-4 bg-red-100 text-red-700 border border-red-300 rounded font-bold'>
          {errorMessage}
        </div>
      )}

      {/* Área de Conteúdo */}
      <div className="w-full max-w-6xl px-4 mt-8 flex flex-col gap-8">
        
        {/* Seção 1: Dados Brutos (JSON) */}
        {companyData && (
          <div className="w-full border rounded-lg shadow-sm overflow-hidden bg-gray-50">
            <div className="bg-gray-200 p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-700">📄 Dados Retornados (Aliant)</h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">JSON</span>
            </div>
            
            <div className="p-4 max-h-[400px] overflow-auto">
              <JsonView value={companyData} collapsed={2} />
            </div>

            {/* Botões de Ação para as próximas etapas */}
            {!reportText && (
              <div className="p-4 bg-white border-t flex flex-col md:flex-row justify-end gap-4">
                
                {/* BOTÃO DOWNLOAD PDF ALIANT */}
                <button
                  onClick={handleDownloadAliantPdf}
                  disabled={isDownloadingPdf || isAnalyzing}
                  className="bg-gray-100 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isDownloadingPdf ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-700 border-t-transparent rounded-full animate-spin"></div>
                      Aguardando PDF...
                    </>
                  ) : (
                    '📄 Baixar Relatório Aliant'
                  )}
                </button>

                {/* BOTÃO DA IA */}
                <button
                  onClick={handleGenerateReport}
                  disabled={isAnalyzing || isDownloadingPdf}
                  className="bg-[#1E4C78] text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analisando Riscos...
                    </>
                  ) : (
                    '🤖 Gerar Parecer com IA'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Seção 2 - Parecer Profissional com Editor */}
        {reportText && (
          <div className="w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-fade-in-up">
            
            {/* Cabeçalho do Parecer */}
            <div className="bg-gray-50 border-b p-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="text-2xl font-bold text-[#1E4C78] flex items-center gap-2">
                📝 Parecer de Auditoria
              </h3>
              
              <div className={`px-6 py-2 rounded-full text-white font-bold shadow-sm tracking-wide ${getRiskBadgeColor(riskLevel)}`}>
                RISCO: {riskLevel || 'EM ANÁLISE'}
              </div>
            </div>

            {/* Corpo do Editor */}
            <div className="p-6">
              <label className="block text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                Conteúdo do Parecer (Editável)
              </label>
              <div className="relative">
                <textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  className="w-full h-[500px] p-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E4C78] focus:border-transparent font-mono text-sm leading-relaxed text-gray-800 bg-gray-50 shadow-inner resize-y"
                />
                <p className="text-xs text-gray-400 mt-2 text-right italic">
                  * Este texto foi pré-gerado por IA. A validação final é responsabilidade do auditor.
                </p>
              </div>
            </div>

            {/* Rodapé de Ações */}
            <div className="bg-gray-100 p-6 flex justify-end gap-4 border-t">
              <button 
                onClick={() => alert("Em breve: Download do PDF formatado (Parecer da IA)")}
                className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 font-bold rounded-lg border border-gray-300 shadow-sm transition-all"
              >
                📄 Baixar PDF do Parecer
              </button>
              
              <button 
                onClick={handleFinalize}
                disabled={isSaving}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? 'Salvando...' : '✅ Validar e Finalizar'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};