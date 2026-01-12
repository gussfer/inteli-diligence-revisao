'use client';

import { useState } from 'react';
import Image from 'next/image';
import algarLogo from '@/assets/logo_algar.png';
import JsonView from '@uiw/react-json-view'; // Visualizador de JSON
import { useRouter } from 'next/navigation'; // <--- Importe o useRouter

export const UploadPdfReport = () => {
  const [cnpj, setCnpj] = useState('');
  const router = useRouter(); // <--- Instancie o router
  
  // Estados de Controle
  const [isLoadingData, setIsLoadingData] = useState(false); // Carregando Aliant
  const [isAnalyzing, setIsAnalyzing] = useState(false);     // Carregando OpenAI
  
  // Estados de Dados
  const [companyData, setCompanyData] = useState<any>(null); // JSON bruto
  const [report, setReport] = useState('');                  // Parecer final
  const [errorMessage, setErrorMessage] = useState('');

  // Máscara CNPJ
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    setCnpj(value);
  };

  // PASSO 1: Buscar Dados (Aliant)
  const handleConsultData = async () => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      setErrorMessage('CNPJ inválido.');
      return;
    }

    setIsLoadingData(true);
    setErrorMessage('');
    setCompanyData(null);
    setReport('');

    try {
      const response = await fetch('/api/consult-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpj }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.details || 'Erro ao consultar.');
      
      setCompanyData(data); // Salva o JSON para exibir
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
        body: JSON.stringify({ companyData }), // Envia o JSON que já temos no front
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao gerar parecer.');

      setReport(data.generatedReport);
    } catch (error) {
      setErrorMessage('Erro ao gerar análise com IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Função para fazer logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    router.push('/login');
  };

  return (
    <div className='w-full h-auto bg-white flex flex-col items-center pb-20'>
      {/* Header */}
      <div className='h-72 md:min-h-[400px] w-full flex flex-col gap-10 items-center justify-center bg-gradient-to-l from-[#1E4C78] to-[#1E4C78] relative shadow-lg'>
        <Image src={algarLogo} alt='Logo Algar' width={160} height={20} className="absolute top-4 left-4" />
        {/* BOTÃO DE LOGOUT (NOVO) */}
        <button 
          onClick={handleLogout}
          className="absolute top-4 right-4 bg-red-500/80 hover:bg-red-600 text-white text-sm font-bold px-4 py-2 rounded transition-colors"
        >
          Sair / Logout
        </button>
        <h2 className='font-bold text-2xl md:text-4xl text-white mt-10'>🧠 Inteli Diligence</h2>
        
        <div className="flex flex-col md:flex-row gap-2 items-center w-full max-w-lg z-10">
          <input
            type='text'
            value={cnpj}
            onChange={handleCnpjChange}
            placeholder="00.000.000/0000-00"
            className='w-full p-4 rounded-lg text-lg font-bold text-gray-800 outline-none shadow-lg'
          />
          <button 
            onClick={handleConsultData}
            disabled={isLoadingData || isAnalyzing}
            className='w-full md:w-auto px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition-all'
          >
            {isLoadingData ? 'Buscando...' : 'Consultar'}
          </button>
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
              {/* Componente para visualizar JSON de forma bonita */}
              <JsonView value={companyData} collapsed={2} />
            </div>

            {/* Botão de Ação para a próxima etapa */}
            {!report && (
              <div className="p-4 bg-white border-t flex justify-end">
                <button
                  onClick={handleGenerateReport}
                  disabled={isAnalyzing}
                  className="bg-[#1E4C78] text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-900 transition-colors flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Analisando...
                    </>
                  ) : (
                    '🤖 Gerar Parecer com IA'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Seção 2: Parecer da IA */}
        {report && (
          <div className='w-full p-8 text-black bg-white rounded-lg shadow-md border-l-8 border-[#1E4C78] animate-fade-in-up'>
            <h3 className="text-2xl font-bold mb-6 text-[#1E4C78] flex items-center gap-2">
              📝 Parecer da Auditoria
            </h3>
            <div className="prose max-w-none">
              <pre className='whitespace-pre-wrap font-sans text-gray-800 leading-relaxed text-base'>
                {report}
              </pre>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};