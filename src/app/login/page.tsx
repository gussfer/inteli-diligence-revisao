'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import algarLogo from '@/assets/logo_algar.png'; // Garanta que o caminho da logo está certo

export default function LoginPage() {
  const router = useRouter();
  
  // Estados
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'CODE'>('EMAIL'); // Controla qual tela aparece
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 1. Enviar E-mail (Ao apertar Enter no primeiro form)
  const handleSendCode = async () => {
    if (!email) return;
    
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar código');

      setMessage('Código enviado! Verifique seu e-mail.');
      setStep('CODE'); // Muda para a tela de digitar o código
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fazer Login (Ao apertar Enter no segundo form)
  const handleLogin = async () => {
    if (!code) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido');

      router.push('/'); // Redireciona para a Home
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no login');
      setIsLoading(false); // Só para loading se der erro, se der certo deixa rodando até mudar de pág
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
        
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image src={algarLogo} alt="Algar Telecom" width={140} height={50} />
        </div>

        <h1 className="text-2xl font-bold text-[#1E4C78] mb-2">Inteli Diligence 🧠</h1>
        <p className="text-gray-500 mb-6 text-sm">Acesso restrito para Auditoria Interna</p>

        {/* Mensagens de Feedback */}
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded font-bold">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 text-sm rounded font-bold">{message}</div>}

        {/* --- FORMULÁRIO 1: DIGITAR E-MAIL --- */}
        {step === 'EMAIL' && (
          <form 
            onSubmit={(e) => {
              e.preventDefault(); // Impede refresh
              handleSendCode();   // Chama função
            }}
            className="flex flex-col gap-4"
          >
            <div className="text-left">
              <label className="text-xs font-bold text-gray-500 uppercase">E-mail Corporativo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@algarholding.com.br"
                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E4C78] outline-none transition-all text-black bg-white"
              />
            </div>

            <button
              type="submit" // Permite o ENTER
              disabled={isLoading}
              className="w-full bg-[#1E4C78] hover:bg-blue-900 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Enviando...' : 'Receber Código de Acesso'}
            </button>
          </form>
        )}

        {/* --- FORMULÁRIO 2: DIGITAR CÓDIGO --- */}
        {step === 'CODE' && (
          <form 
            onSubmit={(e) => {
              e.preventDefault(); // Impede refresh
              handleLogin();      // Chama função
            }}
            className="flex flex-col gap-4 animate-fade-in-up"
          >
            <div className="text-left">
              <label className="text-xs font-bold text-gray-500 uppercase">Código de Verificação</label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                className="w-full mt-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E4C78] outline-none text-center text-2xl tracking-widest font-mono text-black bg-white"
              />
              <p className="text-xs text-gray-400 mt-2 text-center">
                Enviamos um código para <b>{email}</b>
              </p>
            </div>

            <button
              type="submit" // Permite o ENTER
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Entrando...' : 'Acessar Sistema'}
            </button>

            {/* Botão para voltar se errou o email */}
            <button
              type="button" // Type button NÃO dispara o submit do form
              onClick={() => {
                setStep('EMAIL');
                setError('');
                setMessage('');
                setCode('');
              }}
              className="text-sm text-gray-500 hover:text-[#1E4C78] underline mt-2"
            >
              Voltar / Corrigir E-mail
            </button>
          </form>
        )}

      </div>
    </div>
  );
}