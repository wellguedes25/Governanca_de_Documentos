export interface FriendlyErrorInfo {
  title: string;
  message: string;
  actionSuggestion: string;
  isRecoverable: boolean;
  technicalDetails?: string;
}

export function formatDatabaseError(rawError: unknown): FriendlyErrorInfo {
  if (!rawError) {
    return {
      title: 'Erro Inesperado',
      message: 'Ocorreu uma falha não identificada.',
      actionSuggestion: 'Tente novamente em instantes.',
      isRecoverable: true,
    };
  }

  const errorStr = typeof rawError === 'string' 
    ? rawError 
    : (rawError as Error)?.message || (typeof rawError === 'object' ? JSON.stringify(rawError) : String(rawError));

  // ORA-00028 / DPI-1080: Conexão encerrada pelo servidor
  if (
    errorStr.includes('ORA-28') || 
    errorStr.includes('ORA-00028') || 
    errorStr.includes('DPI-1080')
  ) {
    return {
      title: 'Sessão com o Banco Encerrada',
      message: 'A conexão com o servidor Oracle expirou por tempo de inatividade ou foi resetada pelo servidor.',
      actionSuggestion: 'Clique em "Tentar Novamente" abaixo para restabelecer a conexão automaticamente.',
      isRecoverable: true,
      technicalDetails: errorStr,
    };
  }

  // Timeout / Conexão perdida no meio da query
  if (
    errorStr.includes('ORA-12170') || 
    errorStr.includes('ETIMEDOUT') || 
    errorStr.toLowerCase().includes('timeout') ||
    errorStr.includes('ORA-03113') ||
    errorStr.includes('ORA-03114')
  ) {
    return {
      title: 'Tempo Limite de Conexão Esgotado',
      message: 'O servidor Oracle demorou muito para responder ou a conexão foi interrompida.',
      actionSuggestion: 'Verifique se você está conectado à VPN ou à rede corporativa e tente novamente.',
      isRecoverable: true,
      technicalDetails: errorStr,
    };
  }

  // Sem Listener / Porta fechada / Servidor Inacessível
  if (
    errorStr.includes('ORA-12541') || 
    errorStr.includes('ECONNREFUSED') ||
    errorStr.includes('ORA-12514')
  ) {
    return {
      title: 'Servidor Oracle Inacessível',
      message: 'Não foi possível alcançar o serviço do banco de dados na porta especificada.',
      actionSuggestion: 'Verifique se o listener do Oracle está ativo ou confirme o host e a porta configurados.',
      isRecoverable: false,
      technicalDetails: errorStr,
    };
  }

  // Erro de Credenciais
  if (errorStr.includes('ORA-01017')) {
    return {
      title: 'Credenciais Inválidas',
      message: 'O usuário ou a senha informados para a conexão com o Oracle estão incorretos.',
      actionSuggestion: 'Acesse o menu de Conexões e atualize as credenciais cadastradas.',
      isRecoverable: false,
      technicalDetails: errorStr,
    };
  }

  // Nenhuma conexão ativa configurada
  if (errorStr.includes('Nenhuma conexão ativa encontrada')) {
    return {
      title: 'Nenhuma Conexão Ativa',
      message: 'Não há um banco de dados ativo selecionado no sistema.',
      actionSuggestion: 'Selecione ou configure uma conexão ativa na aba de Conexões.',
      isRecoverable: false,
      technicalDetails: errorStr,
    };
  }

  // Erro padrão genérico
  return {
    title: 'Falha na Comunicação com o Banco',
    message: 'Ocorreu um erro ao consultar os dados no servidor Oracle.',
    actionSuggestion: 'Tente recarregar os dados. Se o problema persistir, verifique os detalhes técnicos abaixo.',
    isRecoverable: true,
    technicalDetails: errorStr,
  };
}
