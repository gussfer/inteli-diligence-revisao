// Frontend atualizado sincronizado com backend PDF + OpenAI

'use client';

import { ChangeEvent, useState } from 'react';
import Image from 'next/image';
import algarLogo from '@/assets/logo_algar.png';

export const UploadPdfReport = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [report, setReport] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorMessage('Por favor, envie apenas arquivos PDF.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setReport('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Resposta com erro:', response.status, responseText);
        throw new Error(`Falha ao processar o arquivo: ${response.statusText}`);
      }

      const data = JSON.parse(responseText);
      setReport(data.generatedReport);
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      setErrorMessage('Erro ao gerar relatório. Verifique o backend ou tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className='w-full h-auto bg-white flex flex-col justify-center items-center gap-4'>
      <div className='h-72 md:min-h-[600px] p-8 md:p-10 w-full flex flex-col gap-14 items-center justify-center bg-gradient-to-l from-[#1E4C78] to-[#1E4C78] via-[#1E4C78]'>
        <Image src={algarLogo} alt='Logo Algar' width={160} height={20} style={{ position: 'absolute', top: 10, left: 10, padding: '10px' }} />
        <h2 className='font-bold text-2xl md:text-4xl text-white'>🧠 Bem-vindo ao Inteli Diligence 🧠</h2>
        <p className='mt-[-30px] text-[20px] font-bold'>Envie o relatório em PDF para gerar o parecer automaticamente</p>
        <input
          type='file'
          accept='application/pdf'
          onChange={handleFileUpload}
          className='mt-[-20px] text-[15px] font-bold'
        />
      </div>
      {isProcessing && (
        <div className='h-28 w-full flex items-center justify-center'>
          <div className='w-12 h-12 border-8 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
        </div>
      )}

      {errorMessage && (
        <div className='w-full text-center text-red-500 font-bold'>{errorMessage}</div>
      )}

      {report && (
        <div className='w-full max-w-[900px] p-8 text-black bg-gray-50 rounded-lg shadow-sm'>
          <pre className='whitespace-pre-wrap'>{report}</pre>
        </div>
      )}
    </div>
  );
};
