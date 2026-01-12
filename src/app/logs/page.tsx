'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/auth/logs').then(res => res.json()).then(data => setLogs(data.logs));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#1E4C78]">Log de Acessos</h1>
          <Link href="/" className="bg-gray-200 px-4 py-2 rounded text-sm font-bold text-gray-700">Voltar para Home</Link>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#1E4C78] text-white">
              <tr>
                <th className="p-4">Data/Hora</th>
                <th className="p-4">Usuário</th>
                <th className="p-4">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y text-black">
              {logs.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-gray-500">Nenhum registro ainda.</td></tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="p-4 text-sm">{log.timestamp}</td>
                    <td className="p-4 font-medium">{log.email}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.action === 'LOGIN' ? 'bg-green-100 text-green-800' : 
                        log.action === 'ACCESS_DENIED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}