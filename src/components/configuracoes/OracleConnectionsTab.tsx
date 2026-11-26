"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  Check,
  FlaskConical,
  AlertTriangle,
  CircleCheck,
  CircleX,
  Loader2,
  Eye,
  EyeOff,
  Server,
  HardDrive,
} from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { cn } from '@/lib/utils';

interface DbConnectionItem {
  id: string;
  name: string;
  user: string;
  password?: string;
  connectString: string;
}

interface OracleConnectionsTabProps {
  onConnectionChanged?: () => void;
}

export function OracleConnectionsTab({ onConnectionChanged }: OracleConnectionsTabProps) {
  const { confirmAction, clearCache, setActiveConnInfo } = useUI();

  const [connections, setConnections] = useState<DbConnectionItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [clientPath, setClientPath] = useState('');
  const [formData, setFormData] = useState<Partial<DbConnectionItem>>({
    name: '',
    user: '',
    password: '',
    connectString: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [savingConn, setSavingConn] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const notify = (text: string, type: 'success' | 'error' | 'info' = 'success', duration = 3500) => {
    setFeedback({ text, type });
    if (duration > 0) {
      setTimeout(() => setFeedback(null), duration);
    }
  };

  const loadConnections = useCallback(async () => {
    try {
      const res = await fetch('/api/connections');
      const data = await res.json();
      setConnections(data.connections || []);
      setActiveId(data.activeConnectionId || null);
      setClientPath(data.oracleClientPath || '');
    } catch {
      notify('Falha ao carregar conexões Oracle.', 'error');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const resetForm = () => {
    setFormData({ name: '', user: '', password: '', connectString: '' });
    setShowPassword(false);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.connectString?.trim()) {
      notify('Informe o nome do ambiente e a Connect String Oracle.', 'error');
      return;
    }

    setSavingConn(true);
    try {
      const conn: DbConnectionItem = {
        id: formData.id || `conn-${Date.now()}`,
        name: formData.name.trim(),
        user: formData.user?.trim() || '',
        password: formData.password || '',
        connectString: formData.connectString.trim(),
      };

      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SAVE_CONNECTION', connection: conn }),
      });

      if (!res.ok) throw new Error('Falha ao salvar ambiente Oracle');

      resetForm();
      await loadConnections();
      onConnectionChanged?.();
      notify(formData.id ? 'Ambiente atualizado com sucesso!' : 'Novo ambiente Oracle registrado!');
    } catch {
      notify('Erro ao salvar conexão Oracle.', 'error');
    } finally {
      setSavingConn(false);
    }
  };

  const handleActivate = async (id: string) => {
    setActivatingId(id);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SET_ACTIVE', id }),
      });
      if (!res.ok) throw new Error('Falha ao ativar instância');

      setActiveId(id);
      clearCache();
      setActiveConnInfo(null);
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
      }
      onConnectionChanged?.();
      notify('Instância ativada e cache sincronizado!');
    } catch {
      notify('Erro ao alternar conexão ativa.', 'error');
    } finally {
      setActivatingId(null);
    }
  };

  const handleTestConnection = async (conn: DbConnectionItem) => {
    setTestingId(conn.id);
    notify(`Testando conectividade com ${conn.name}...`, 'info', 0);

    try {
      if (activeId !== conn.id) {
        const activateRes = await fetch('/api/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'SET_ACTIVE', id: conn.id }),
        });
        if (!activateRes.ok) throw new Error('Falha ao selecionar conexão para teste');
        setActiveId(conn.id);
        clearCache();
        setActiveConnInfo(null);
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
        }
        onConnectionChanged?.();
      }

      const res = await fetch('/api/oracle/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'TEST' }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        notify(`Conexão com "${conn.name}" validada com sucesso!`, 'success', 4500);
      } else {
        notify(`Falha ao testar "${conn.name}": ${result.error || 'Erro desconhecido'}`, 'error', 5500);
      }
    } catch {
      notify(`Falha de comunicação ao testar "${conn.name}".`, 'error', 5000);
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (conn: DbConnectionItem) => {
    const confirmed = await confirmAction({
      title: 'Excluir Conexão Oracle',
      description: `Tem certeza que deseja excluir o ambiente "${conn.name}"?`,
      confirmLabel: 'Excluir Conexão',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DELETE_CONNECTION', id: conn.id }),
      });
      if (!res.ok) throw new Error('Falha na resposta do servidor');

      const data = await res.json();
      setConnections(data.connections || []);
      setActiveId(data.activeConnectionId || null);
      if (formData.id === conn.id) {
        resetForm();
      }
      onConnectionChanged?.();
      notify('Conexão removida com sucesso.');
    } catch {
      notify('Erro ao excluir conexão Oracle.', 'error');
    }
  };

  const handleSaveClientPath = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClient(true);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SAVE_CLIENT_PATH', path: clientPath.trim() }),
      });
      if (!res.ok) throw new Error('Falha ao salvar caminho');
      notify('Caminho do Oracle Client salvo! Reinicie o serviço para aplicar.', 'success', 5000);
    } catch {
      notify('Erro ao salvar caminho do Instant Client.', 'error');
    } finally {
      setSavingClient(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="sylva-glass rounded-3xl p-12 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
        <Loader2 size={26} className="animate-spin text-[var(--lime)]" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Carregando instâncias Oracle...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={cn(
            'p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-1',
            feedback.type === 'error'
              ? 'tone-danger'
              : feedback.type === 'info'
                ? 'tone-info'
                : 'tone-success'
          )}
        >
          {feedback.type === 'error' ? (
            <CircleX size={16} className="shrink-0" />
          ) : feedback.type === 'info' ? (
            <Loader2 size={16} className="animate-spin shrink-0" />
          ) : (
            <CircleCheck size={16} className="shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Oracle Client Path (Thick Mode) */}
      <form
        onSubmit={handleSaveClientPath}
        className="sylva-glass rounded-[22px] p-5 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] flex items-center justify-center shrink-0">
              <HardDrive size={15} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                Oracle Client Path (Thick Mode)
              </h3>
              <p className="text-[11px] text-[var(--foreground-secondary)]">
                Diretório local do Oracle Instant Client para suporte completo a CLOB/LOB e tipos nativos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            placeholder="Ex: C:\orant\Client\instantclient_23_0"
            value={clientPath}
            onChange={(e) => setClientPath(e.target.value)}
            className="flex-1 h-10 bg-[var(--card-subtle)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3.5 text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={savingClient}
            className="h-10 px-5 rounded-full sylva-pill text-xs font-bold text-[var(--foreground)] hover:border-[var(--lime)] hover:text-[var(--accent-ink)] transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {savingClient ? 'Salvando...' : 'Configurar Path'}
          </button>
        </div>

        <p className="text-[11px] text-[var(--muted)] flex items-center gap-1.5">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <span>A alteração do binário exige reinicialização do serviço Node.js / Next.js.</span>
        </p>
      </form>

      {/* Main Grid: Form (Left) + Mapped Environments (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form Card */}
        <form
          onSubmit={handleSaveConnection}
          className="sylva-glass rounded-[24px] p-6 space-y-4 border border-[var(--border)]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] flex items-center justify-center">
                {formData.id ? <Edit2 size={15} /> : <Plus size={16} />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                  {formData.id ? 'Editar Ambiente' : 'Novo Ambiente'}
                </h3>
                <p className="text-[11px] text-[var(--muted)]">
                  Credenciais criptografadas em repouso
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                Nome do Ambiente *
              </label>
              <input
                type="text"
                placeholder="PRODUÇÃO / HOMOLOG"
                autoComplete="off"
                value={formData.name || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full h-10 bg-[var(--card-subtle)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3.5 text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                DB User
              </label>
              <input
                type="text"
                placeholder="DBAMV / SYSTEM"
                autoComplete="off"
                value={formData.user || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, user: e.target.value }))}
                className="w-full h-10 bg-[var(--card-subtle)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3.5 text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={formData.password || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full h-10 bg-[var(--card-subtle)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3.5 pr-10 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] p-1 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                Connect String (Oracle Service) *
              </label>
              <input
                type="text"
                placeholder="host:1521/service_name"
                autoComplete="off"
                value={formData.connectString || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, connectString: e.target.value }))
                }
                className="w-full h-10 bg-[var(--card-subtle)] border border-[var(--border)] focus:border-[var(--lime)] rounded-xl px-3.5 text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={savingConn}
              className="flex-1 h-10 px-5 rounded-full sylva-lime-btn text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingConn && <Loader2 size={14} className="animate-spin" />}
              <span>
                {savingConn
                  ? 'Processando...'
                  : formData.id
                    ? 'Salvar Alterações'
                    : 'Registrar Conexão'}
              </span>
            </button>

            {formData.id && (
              <button
                type="button"
                onClick={resetForm}
                className="h-10 px-4 rounded-full sylva-pill text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* Mapped Environments List */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-[var(--lime)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                Ambientes Mapeados
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--card-subtle)] text-[var(--muted)] border border-[var(--border-subtle)] tabular-nums">
              {connections.length} {connections.length === 1 ? 'instância' : 'instâncias'}
            </span>
          </div>

          {connections.length === 0 ? (
            <div className="sylva-glass rounded-3xl p-12 text-center border border-dashed border-[var(--border-strong)] space-y-2">
              <Server size={28} className="mx-auto text-[var(--muted)]" />
              <p className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Nenhuma conexão Oracle cadastrada.
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                Use o formulário ao lado para mapear sua primeira instância DBAMV.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((conn) => {
                const isActive = activeId === conn.id;
                const isSandbox = conn.id === 'demo-sandbox-connection';
                const isTesting = testingId === conn.id;
                const isActivating = activatingId === conn.id;

                return (
                  <div
                    key={conn.id}
                    className={cn(
                      'sylva-glass rounded-[22px] p-4 sm:p-5 border transition-all',
                      isActive
                        ? 'border-[var(--tint-olive-border)] bg-[var(--accent)]/25'
                        : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={cn(
                            'w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 transition-colors',
                            isActive
                              ? 'bg-[var(--accent)] text-[var(--accent-ink)] border-[var(--tint-olive-border)]'
                              : 'bg-[var(--card-subtle)] text-[var(--muted)] border-[var(--border)]'
                          )}
                        >
                          <Database size={20} />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-[var(--foreground)] tracking-tight">
                              {conn.name}
                            </h4>

                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--lime)] text-[var(--lime-ink)]">
                                <Check size={10} strokeWidth={3} />
                                Target Ativo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tone-neutral border">
                                Standby
                              </span>
                            )}

                            {isSandbox && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tone-info border">
                                Sandbox
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-mono text-[var(--foreground-secondary)] truncate">
                            {conn.user ? `${conn.user}@` : ''}
                            <span className="text-[var(--muted)]">{conn.connectString}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleTestConnection(conn)}
                          disabled={isTesting}
                          title="Testar Conectividade e Latência"
                          className="h-9 w-9 rounded-full sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--accent-ink)] hover:border-[var(--lime)] transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isTesting ? (
                            <Loader2 size={15} className="animate-spin text-[var(--lime)]" />
                          ) : (
                            <FlaskConical size={15} />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormData(conn);
                            setShowPassword(false);
                          }}
                          title="Editar Ambiente"
                          className="h-9 w-9 rounded-full sylva-pill flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-all cursor-pointer"
                        >
                          <Edit2 size={15} />
                        </button>

                        {!formData.id && !isActive && (
                          <button
                            type="button"
                            onClick={() => handleActivate(conn.id)}
                            disabled={isActivating}
                            className="h-9 px-4 rounded-full sylva-pill text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--lime)] hover:text-[var(--lime-ink)] hover:border-transparent transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isActivating ? 'Ativando...' : 'Ativar'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(conn)}
                          title="Excluir Conexão"
                          className="h-9 w-9 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-rose-500 hover:border-rose-500/30 transition-all cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
