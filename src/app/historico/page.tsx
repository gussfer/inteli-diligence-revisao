'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import algarLogo from '@/assets/logo_algar.png';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const JsonView = dynamic(() => import('@uiw/react-json-view'), { ssr: false });

export default function HistoricoPage() {
  const router = useRouter();

  // processHistory: Lista que vem do seu Banco de Dados (rápido)
  const [processHistory, setProcessHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  // aliantData: JSON que vem da Aliant quando clica em um item (pesado)
  const [aliantData, setAliantData] = useState<any | null>(null);
  const [isLoadingAliant, setIsLoadingAliant] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // 1. Busca os IDs do Banco de Dados ao abrir a página
  useEffect(() => {
    const fetchHistoryFromDB = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await fetch('/api/history');
        const data = await res.json();
        setProcessHistory(data);
      } catch (error) {
        console.error("Erro ao carregar do DB", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistoryFromDB();
  }, []);

  // 2. Busca o JSON completo na Aliant quando o usuário CLICA em um item da lista
  const handleSelectProcess = async (processId: number) => {
    setIsLoadingAliant(true);
    setAliantData(null);
    try {
      const res = await fetch(`/api/aliant/get-process?id=${processId}`);
      const data = await res.json();
      setAliantData(data);
    } catch (error) {
      alert("Erro ao buscar detalhes na Aliant.");
    } finally {
      setIsLoadingAliant(false);
    }
  };

  // Função de Download de PDF
  const handleDownloadPdf = async (processId: string) => {
    setIsDownloadingPdf(true);
    try {
      const reqRes = await fetch('/api/aliant/request-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId })
      });
      const reqData = await reqRes.json();
      if (!reqRes.ok) throw new Error(reqData.error);

      let isReady = false;
      let attempts = 0;

      while (!isReady && attempts < 12) {
        attempts++;
        const dlRes = await fetch(`/api/aliant/download-report?id=${reqData.reportId}`);
        
        if (dlRes.status === 200) {
          const blob = await dlRes.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Relatorio_Historico_${processId}.pdf`; 
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          isReady = true;
        } else {
          await new Promise(res => setTimeout(res, 5000));
        }
      }
      if (!isReady) alert("O relatório está demorando. Tente novamente mais tarde.");
    } catch (error) {
      console.error(error);
      alert("Erro ao baixar PDF.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className='w-full min-h-screen bg-gray-100 flex flex-col items-center pb-20'>
      
      <div className='w-full bg-[#1E4C78] p-6 shadow-md flex justify-between items-center'>
        <div className="flex items-center gap-4">
          <Image src={algarLogo} alt='Logo Algar' width={120} height={20} className="bg-white p-1 rounded" />
          <h1 className="text-white font-bold text-xl border-l border-white/30 pl-4 hidden md:block">
            Histórico de Consultas
          </h1>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded font-semibold transition-colors"
        >
          ← Nova Consulta
        </button>
      </div>

      <div className="w-full max-w-7xl px-4 mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: LISTA DO BANCO DE DADOS */}
        <div className="md:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
          <div className="bg-gray-50 p-4 border-b">
            <h2 className="font-bold text-gray-700">📋 Banco de Dados ({processHistory.length})</h2>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2">
            {isLoadingHistory ? (
              <div className="p-8 text-center text-gray-400">Carregando DB...</div>
            ) : processHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Nenhum histórico encontrado.</div>
            ) : (
              processHistory.map((item) => {
                const isSelected = aliantData?.process_id == item.processId;
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => handleSelectProcess(item.processId)}
                    className={`p-4 mb-2 border rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'border-[#1E4C78] bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-white bg-gray-800 px-2 py-1 rounded">
                        ID: {item.processId}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="font-bold text-gray-800 text-sm">
                      {item.docType}: {item.document}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: DADOS DA ALIANT */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[600px] flex flex-col">
          {isLoadingAliant ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-8 h-8 border-4 border-[#1E4C78] border-t-transparent rounded-full animate-spin mb-4"></div>
              Buscando JSON na Aliant...
            </div>
          ) : aliantData ? (
            <>
              <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                <h2 className="font-bold text-[#1E4C78]">
                  Detalhes do Processo: {aliantData.process_id}
                </h2>
                
                <button
                  onClick={() => handleDownloadPdf(aliantData.process_id)}
                  disabled={isDownloadingPdf}
                  className="bg-gray-800 text-white px-4 py-2 rounded text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDownloadingPdf ? '⏳ Gerando...' : '📄 Baixar PDF'}
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
                <JsonView 
                  value={aliantData} 
                  collapsed={2} 
                  style={{ backgroundColor: 'transparent' }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-4">👈</span>
              <p>Selecione um processo na lista para carregar o JSON</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}