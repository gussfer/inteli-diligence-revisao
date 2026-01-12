'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import algarLogo from '@/assets/logo_algar.png';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1 = Digitar Email, 2 = Digitar Código
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao enviar e-mail.');
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, code })
      });
      if (!res.ok) throw new Error('Código incorreto ou expirado.');
      
      router.push('/'); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full flex flex-col items-center gap-6">
        <div className='bg-[#1E4C78] p-4 w-full rounded-t-lg flex justify-center'>
            <Image src={algarLogo} alt="Algar" width={120} height={20} />
        </div>
        
        <h2 className="text-2xl font-bold text-[#1E4C78]">Acesso Restrito</h2>

        {error && <div className="text-red-500 text-sm font-bold">{error}</div>}

        {step === 1 ? (
          <>
            <input 
              type="email" 
              placeholder="Digite seu e-mail" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // ADICIONEI 'text-black' e 'bg-white' AQUI ABAIXO:
              className="w-full p-3 border rounded focus:border-[#1E4C78] outline-none text-black bg-white"
            />
            <button 
              onClick={handleSendCode}
              disabled={loading || !email}
              className="w-full bg-[#1E4C78] text-white p-3 rounded font-bold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Receber Código'}
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-600 text-center text-sm">Enviamos um código para <b>{email}</b></p>
            <input 
              type="text" 
              placeholder="000000" 
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              // ADICIONEI 'text-black' e 'bg-white' AQUI TAMBÉM:
              className="w-full p-3 border rounded text-center text-2xl tracking-widest focus:border-[#1E4C78] outline-none text-black bg-white"
            />
            <button 
              onClick={handleVerifyCode}
              disabled={loading || code.length < 6}
              className="w-full bg-green-600 text-white p-3 rounded font-bold hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Validando...' : 'Entrar'}
            </button>
            <button onClick={() => setStep(1)} className="text-xs text-gray-500 underline">Voltar / Corrigir E-mail</button>
          </>
        )}
      </div>
    </div>
  );
}