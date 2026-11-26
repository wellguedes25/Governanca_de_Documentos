const CACHE_KEY_PREFIXES = [
  'sylva_cache_',
  'oracle_documentos_data_',
  'dashboard_cache_',
  'lineage_',
  'profile_',
  'meta_',
  'actions_',
  'rules_',
  'fields_',
];

/**
 * Grava com segurança no sessionStorage sem quebrar o fluxo da aplicação caso a cota (~5 MB) seja atingida.
 * Ao detectar QuotaExceededError, remove caches antigos antes de tentar uma segunda gravação.
 */
export function safeSessionSetItem(key: string, serialized: string): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return false;
  }

  try {
    window.sessionStorage.setItem(key, serialized);
    return true;
  } catch {
    // Limpa caches antigos diferentes da chave atual e tenta uma nova gravação
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const existingKey = window.sessionStorage.key(i);
        if (!existingKey || existingKey === key) continue;
        if (CACHE_KEY_PREFIXES.some((prefix) => existingKey.startsWith(prefix))) {
          keysToRemove.push(existingKey);
        }
      }

      for (const oldKey of keysToRemove) {
        window.sessionStorage.removeItem(oldKey);
      }

      window.sessionStorage.setItem(key, serialized);
      return true;
    } catch (retryErr) {
      console.warn(`[safeSessionSetItem] Não foi possível salvar "${key}" no sessionStorage (cota excedida):`, retryErr);
      return false;
    }
  }
}
