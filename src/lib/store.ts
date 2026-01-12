// src/lib/store.ts

// 1. Definimos os tipos
type VerificationCode = {
  code: string;
  expires: number;
};

type AccessLog = {
  email: string;
  timestamp: string;
  action: 'LOGIN' | 'LOGOUT' | 'ACCESS_DENIED';
};

// 2. Definimos a interface do objeto Global para o TypeScript não reclamar
declare global {
  var _activeCodes: Map<string, VerificationCode> | undefined;
  var _accessLogs: AccessLog[] | undefined;
}

// 3. Inicializamos as variáveis globais se elas ainda não existirem
// Isso garante que, mesmo se o arquivo recarregar, o valor antigo é mantido.
if (!global._activeCodes) {
  global._activeCodes = new Map<string, VerificationCode>();
}

if (!global._accessLogs) {
  global._accessLogs = [];
}

// 4. Exportamos referências para usar no resto do app
export const activeCodes = global._activeCodes;
export const accessLogs = global._accessLogs;

export function addLog(log: AccessLog) {
  if (!accessLogs) return;
  
  accessLogs.unshift(log);
  // Mantém apenas os últimos 100 registros para não lotar a memória
  if (accessLogs.length > 100) {
    accessLogs.pop();
  }
}