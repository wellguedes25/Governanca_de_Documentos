"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  AlertTriangle,
  RotateCw,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

type UserRole = 'ADMIN' | 'ANALISTA';

interface AppUserItem {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsuariosConfigPage() {
  const [users, setUsers] = useState<AppUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUserItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AppUserItem | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const [form, setForm] = useState({
    username: '',
    name: '',
    password: '',
    role: 'ANALISTA' as UserRole,
    active: true,
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.error || 'Erro ao carregar usuários.');
        return;
      }
      setUsers(data.users || []);
    } catch {
      showFeedback('error', 'Falha de comunicação ao buscar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setModalError(null);
    setForm({
      username: '',
      name: '',
      password: '',
      role: 'ANALISTA',
      active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (u: AppUserItem) => {
    setEditingUser(u);
    setModalError(null);
    setForm({
      username: u.username,
      name: u.name,
      password: '',
      role: u.role,
      active: u.active,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!form.name.trim()) {
      setModalError('Informe o nome completo.');
      return;
    }
    if (!editingUser && (!form.username.trim() || form.password.length < 6)) {
      setModalError('Informe login e senha com pelo menos 6 caracteres.');
      return;
    }
    if (editingUser && form.password && form.password.length < 6) {
      setModalError('A nova senha deve possuir ao menos 6 caracteres.');
      return;
    }

    setSaving(true);
    try {
      const method = editingUser ? 'PUT' : 'POST';
      const payload = editingUser
        ? {
            id: editingUser.id,
            name: form.name.trim(),
            role: form.role,
            active: form.active,
            ...(form.password ? { password: form.password } : {}),
          }
        : {
            username: form.username.trim(),
            name: form.name.trim(),
            password: form.password,
            role: form.role,
            active: form.active,
          };

      const res = await fetch('/api/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Não foi possível salvar usuário.');
        return;
      }

      setUsers(data.users || []);
      setModalOpen(false);
      showFeedback('success', editingUser ? 'Usuário atualizado com sucesso!' : 'Novo usuário cadastrado!');
    } catch {
      setModalError('Erro ao salvar usuário.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(deletingUser.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        showFeedback('error', data.error || 'Não foi possível excluir o usuário.');
        setDeletingUser(null);
        return;
      }
      setUsers(data.users || []);
      setDeletingUser(null);
      showFeedback('success', 'Usuário removido com sucesso.');
    } catch {
      showFeedback('error', 'Erro ao excluir usuário.');
    } finally {
      setDeletingLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const active = users.filter((u) => u.active).length;
    return { total, admins, active };
  }, [users]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)] text-[var(--accent-ink)] border border-[var(--tint-olive-border)] mb-2">
            Segurança &amp; RBAC
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] font-[family-name:var(--font-manrope)]">
            Usuários &amp; Controle de Acesso
          </h1>
          <p className="text-xs text-[var(--foreground-secondary)] mt-0.5">
            Gerencie os acessos ao portal e defina quem pode administrar conexões Oracle e configurações.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-full sylva-lime-btn text-xs font-extrabold uppercase tracking-wider cursor-pointer shrink-0"
        >
          <UserPlus size={15} />
          <span>Novo Usuário</span>
        </button>
      </div>

      {feedback && (
        <div
          className={cn(
            'p-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200',
            feedback.type === 'success' ? 'tone-success' : 'tone-danger'
          )}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* KPIs Bento Sylva */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sylva-card-olive rounded-[22px] p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--tint-olive-muted)]">
              Total de Contas
            </p>
            <p className="text-3xl font-extrabold text-[var(--tint-olive-fg)] mt-1">{stats.total}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[var(--tint-olive-btn)] text-[var(--accent-ink)] flex items-center justify-center border border-[var(--tint-olive-border)]">
            <Users size={20} />
          </div>
        </div>

        <div className="sylva-card-slate rounded-[22px] p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--tint-slate-muted)]">
              Administradores
            </p>
            <p className="text-3xl font-extrabold text-[var(--tint-slate-fg)] mt-1">{stats.admins}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-black/10 dark:bg-white/10 text-[var(--tint-slate-fg)] flex items-center justify-center border border-[var(--tint-slate-border)]">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="sylva-card-mocha rounded-[22px] p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--tint-mocha-muted)]">
              Contas Ativas
            </p>
            <p className="text-3xl font-extrabold text-[var(--tint-mocha-fg)] mt-1">{stats.active}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-[var(--tint-mocha-border)]">
            <Shield size={20} />
          </div>
        </div>
      </div>

      {/* Card Principal de Listagem */}
      <div className="bg-[var(--card-solid)] border border-[var(--border)] rounded-[24px] overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por usuário, nome ou perfil..."
              className="w-full h-10 bg-[var(--card-subtle)] border border-[var(--border)] rounded-full pl-9 pr-4 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
            />
          </div>

          <span className="text-[11px] font-medium text-[var(--muted)]">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuário exibido' : 'usuários exibidos'}
          </span>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center gap-2.5 text-xs text-[var(--muted)]">
            <RotateCw size={16} className="animate-spin text-[var(--accent-ink)]" />
            <span>Carregando controle de usuários...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] bg-[var(--card-subtle)]/50">
                  <th className="py-3.5 px-5">Usuário</th>
                  <th className="py-3.5 px-4">Perfil</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Atualizado em</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--card-subtle)]/60 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[var(--accent)] border border-[var(--tint-olive-border)] text-[var(--accent-ink)] flex items-center justify-center font-extrabold text-xs shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--foreground)]">{u.name}</div>
                          <div className="text-[11px] font-mono text-[var(--muted)]">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                          u.role === 'ADMIN'
                            ? 'bg-[var(--accent)] border-[var(--tint-olive-border)] text-[var(--accent-ink)]'
                            : 'tone-info'
                        )}
                      >
                        {u.role === 'ADMIN' ? 'Administrador' : 'Analista'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                          u.active ? 'tone-success' : 'tone-danger'
                        )}
                      >
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] font-mono text-[var(--muted)]">
                      {new Date(u.updatedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="h-8 px-3 rounded-full sylva-pill text-[11px] font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingUser(u)}
                          className="h-8 w-8 rounded-full sylva-pill text-[var(--muted)] hover:text-rose-500 hover:border-rose-500/30 inline-flex items-center justify-center cursor-pointer"
                          title="Excluir usuário"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Central Amplo (Criar / Editar Usuário) */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[var(--card-solid)] border border-[var(--border)] rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[var(--lime)] text-[var(--lime-ink)] flex items-center justify-center">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[var(--foreground)]">
                    {editingUser ? `Editar Usuário @${editingUser.username}` : 'Cadastrar Novo Usuário'}
                  </h2>
                  <p className="text-[11px] text-[var(--muted)]">
                    Defina credenciais de entrada e nível de permissão no sistema.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full sylva-pill flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl tone-danger border text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {!editingUser && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                    Login de Acesso *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: maria.silva"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
                    className="w-full h-10 bg-[var(--card-subtle)] border border-[var(--border)] rounded-xl px-3.5 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Dra. Maria Clara Silva"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full h-10 bg-[var(--card-subtle)] border border-[var(--border)] rounded-xl px-3.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                  {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha Inicial *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder="Mínimo de 6 caracteres"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full h-10 bg-[var(--card-subtle)] border border-[var(--border)] rounded-xl px-3.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                    Perfil de Acesso
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                    className="w-full h-10 bg-[var(--card-subtle)] border border-[var(--border)] rounded-xl px-3 text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                  >
                    <option value="ANALISTA">Analista (Uso Operacional)</option>
                    <option value="ADMIN">Administrador (Total)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                    Status da Conta
                  </label>
                  <select
                    value={form.active ? 'ATIVO' : 'INATIVO'}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === 'ATIVO' }))}
                    className="w-full h-10 bg-[var(--card-subtle)] border border-[var(--border)] rounded-xl px-3 text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:border-[var(--lime)]"
                  >
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo (Bloqueado)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 px-4 rounded-full sylva-pill text-xs font-bold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-full sylva-lime-btn text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <RotateCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{saving ? 'Salvando...' : 'Salvar Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Customizado Sylva de Confirmação de Exclusão */}
      {deletingUser && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeletingUser(null)}
        >
          <div
            className="w-full max-w-md bg-[var(--card-solid)] border border-[var(--border)] rounded-[24px] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl tone-danger border flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[var(--foreground)]">
                  Excluir usuário &quot;{deletingUser.name}&quot;?
                </h3>
                <p className="text-xs text-[var(--foreground-secondary)] mt-1 leading-relaxed">
                  O login <span className="font-mono font-bold">@{deletingUser.username}</span> perderá acesso imediato ao portal. Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="h-9 px-4 rounded-full sylva-pill text-xs font-bold text-[var(--foreground-secondary)] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingLoading}
                className="h-9 px-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {deletingLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
