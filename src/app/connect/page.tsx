"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Database,
  ShieldCheck,
  Server,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Layers,
  ChevronDown,
  Search,
  Check,
  Lock,
  Zap,
  Sun,
  Moon,
  Plus,
  X,
  Sparkles,
  User,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUI } from '@/context/UIContext';
import { formatDatabaseError, FriendlyErrorInfo } from '@/lib/error-formatter';

interface ConnectionItem {
  id: string;
  name: string;
  user: string;
  host: string;
  isDemo?: boolean;
}

interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'ANALISTA';
}

async function parseJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      error: `Erro HTTP ${res.status}: resposta inesperada do servidor.`,
      technicalDetails: text.slice(0, 300),
    };
  }
}

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setDocVersion, theme, toggleTheme } = useUI();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  // Etapa horizontal: 'login' (Slide 1) <-> 'connect' (Slide 2)
  const [step, setStep] = useState<'login' | 'connect'>('login');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccessBanner, setLoginSuccessBanner] = useState(false);
  const [enteringDemo, setEnteringDemo] = useState(false);
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);

  // Estado da etapa 2 (Conexões Oracle / Sandbox & Motor)
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<'V3' | 'V2'>('V3');
  const [loadingList, setLoadingList] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [errorInfo, setErrorInfo] = useState<FriendlyErrorInfo | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingConn, setCreatingConn] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newConnForm, setNewConnForm] = useState({
    name: '',
    user: '',
    password: '',
    connectString: '',
  });

  // Carrega conexões disponíveis
  useEffect(() => {
    let mounted = true;
    async function loadConnections() {
      try {
        const res = await fetch('/api/auth/connect');
        const data = await parseJsonSafe(res);
        if (!res.ok) throw new Error(data.error || 'Falha ao listar conexões.');
        if (mounted) {
          setConnections(data.connections || []);
          if (data.defaultActiveId) {
            setSelectedConnId(data.defaultActiveId);
          } else if (data.connections?.length > 0) {
            setSelectedConnId(data.connections[0].id);
          }
        }
      } catch (err: unknown) {
        if (mounted) {
          setErrorInfo(formatDatabaseError(err));
        }
      } finally {
        if (mounted) setLoadingList(false);
      }
    }
    loadConnections();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginUsername.trim() || !loginPassword) {
      setLoginError('Informe seu usuário e senha para continuar.');
      return;
    }

    setAuthenticating(true);
    try {
      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'LOGIN',
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Usuário ou senha inválidos.');
        return;
      }

      setAuthUser(data.user);
      setLoginSuccessBanner(true);
      setErrorInfo(null);

      // Pequena pausa para exibir a confirmação visual antes do slide horizontal
      setTimeout(() => {
        setStep('connect');
        setLoginSuccessBanner(false);
      }, 320);
    } catch (err: any) {
      setLoginError(err.message || 'Falha ao validar credenciais.');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleSwitchUser = () => {
    setStep('login');
    setAuthUser(null);
    setShowCreateForm(false);
    setCreateError(null);
    setErrorInfo(null);
    setConnectionSuccess(false);
    setLoginSuccessBanner(false);
  };

  const handleEnterDemo = async () => {
    setLoginError(null);
    setEnteringDemo(true);
    try {
      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DEMO_ACCESS',
          version: 'V3',
        }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Não foi possível iniciar o ambiente de demonstração.');
        setEnteringDemo(false);
        return;
      }

      setDocVersion('V3');
      setLoginSuccessBanner(true);
      setTimeout(() => {
        router.push(redirectTarget);
        router.refresh();
      }, 400);
    } catch (err: any) {
      setLoginError(err.message || 'Falha ao iniciar o modo demonstração.');
      setEnteringDemo(false);
    }
  };

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newConnForm.name.trim() || !newConnForm.user.trim() || !newConnForm.password || !newConnForm.connectString.trim()) {
      setCreateError('Preencha Nome, Usuário, Senha e Connect String para salvar.');
      return;
    }

    setCreatingConn(true);
    try {
      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_CONNECTION',
          authUsername: loginUsername.trim(),
          authPassword: loginPassword,
          ...newConnForm,
        }),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setCreateError(data.error || 'Não foi possível cadastrar a conexão.');
        return;
      }

      const created: ConnectionItem = data.connection;
      setConnections((prev) => {
        const real = prev.filter((c) => !c.isDemo);
        const demos = prev.filter((c) => c.isDemo);
        return [...real, created, ...demos];
      });
      setSelectedConnId(created.id);
      setNewConnForm({ name: '', user: '', password: '', connectString: '' });
      setShowCreateForm(false);
      setErrorInfo(null);
    } catch (err: any) {
      setCreateError(err.message || 'Erro de comunicação ao salvar a conexão.');
    } finally {
      setCreatingConn(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedConnId || !authUser) return;

    setConnecting(true);
    setErrorInfo(null);
    setConnectionSuccess(false);

    try {
      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: selectedConnId,
          version: selectedVersion,
          username: loginUsername.trim(),
          password: loginPassword,
        }),
      });

      const data = await parseJsonSafe(res);

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          setStep('login');
          setLoginError(data.error || 'Sessão expirada. Faça login novamente.');
          setConnecting(false);
          return;
        }
        const friendly = data.friendlyError || formatDatabaseError(data.error);
        setErrorInfo(friendly);
        setConnecting(false);
        return;
      }

      setConnectionSuccess(true);
      setDocVersion(selectedVersion);

      setTimeout(() => {
        router.push(redirectTarget);
        router.refresh();
      }, 650);
    } catch (err: unknown) {
      setErrorInfo(formatDatabaseError(err));
      setConnecting(false);
    }
  };

  const filteredConnections = connections.filter((conn) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      conn.name.toLowerCase().includes(q) ||
      conn.user.toLowerCase().includes(q) ||
      conn.host.toLowerCase().includes(q)
    );
  });

  const isAdmin = authUser?.role === 'ADMIN';

  return (
    <div className="min-h-screen sylva-canvas text-[var(--foreground)] flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden">
      {/* Alternador Flutuante Light / Dark Mode */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-20 h-9 px-3.5 rounded-full sylva-pill flex items-center gap-2 text-xs font-semibold text-[var(--foreground-secondary)] hover:text-[var(--foreground)] cursor-pointer shadow-xs"
        title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
      >
        {theme === 'dark' ? (
          <>
            <Sun size={14} className="text-[var(--accent-ink)]" />
            <span className="hidden sm:inline">Modo Claro</span>
          </>
        ) : (
          <>
            <Moon size={14} className="text-[var(--foreground)]" />
            <span className="hidden sm:inline">Modo Escuro</span>
          </>
        )}
      </button>

      {/* Main Executive Asymmetric Container */}
      <div className="w-full max-w-5xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Coluna Esquerda: Identidade Sylva & Confiança Clínica */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--lime)] text-[var(--lime-ink)] flex items-center justify-center shadow-[0_6px_22px_rgba(204,243,82,0.32)] shrink-0">
              <ShieldCheck size={24} strokeWidth={2.4} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] leading-none font-[family-name:var(--font-manrope)]">
                  Goverdoc <span className="text-[var(--accent-ink)] font-black uppercase text-sm tracking-wider">PRO</span>
                </span>
              </div>
              <p className="text-xs font-medium text-[var(--muted)]">
                Governança Clínica &amp; Prontuário Eletrônico
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)] leading-tight relative pb-2">
              Acesso seguro ao motor de governança de prontuários.
              <span className="absolute left-0 bottom-0 h-[3px] w-16 rounded-full bg-[var(--lime)]" />
            </h1>
            <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">
              Autentique suas credenciais institucionais para selecionar ou configurar a instância Oracle com segurança.
            </p>
          </div>

          {/* 3 Cards Tinted Bento Sylva */}
          <div className="space-y-2.5">
            <div className="sylva-card-olive flex items-start gap-3 rounded-2xl p-3.5">
              <div className="w-9 h-9 rounded-xl bg-[var(--tint-olive-btn)] text-[var(--accent-ink)] flex items-center justify-center shrink-0 border border-[var(--tint-olive-border)]">
                <Zap size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--tint-olive-fg)]">Handshake Fail-Fast &amp; Read-Only</p>
                <p className="text-[11px] text-[var(--tint-olive-muted)] leading-snug mt-0.5">
                  Validação Oracle imediata com bloqueio automático contra escrita no banco.
                </p>
              </div>
            </div>

            <div className="sylva-card-slate flex items-start gap-3 rounded-2xl p-3.5">
              <div className="w-9 h-9 rounded-xl bg-black/10 dark:bg-white/10 text-[var(--tint-slate-fg)] flex items-center justify-center shrink-0 border border-[var(--tint-slate-border)]">
                <Lock size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--tint-slate-fg)]">Controle por Perfil (RBAC) &amp; AES-256</p>
                <p className="text-[11px] text-[var(--tint-slate-muted)] leading-snug mt-0.5">
                  Separação entre Administrador e Analista com sessão HttpOnly criptografada.
                </p>
              </div>
            </div>

            <div className="sylva-card-mocha flex items-start gap-3 rounded-2xl p-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-[var(--tint-mocha-border)]">
                <Layers size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--tint-mocha-fg)]">Dual-Engine V3/V2 &amp; Sandbox Demo</p>
                <p className="text-[11px] text-[var(--tint-mocha-muted)] leading-snug mt-0.5">
                  Governança HTML5/Flex e modo demonstração isolado com dados fictícios.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Painel Interativo Sylva Dock em 2 Etapas (Deslizamento Lateral) */}
        <div className="lg:col-span-7">
          <div className="w-full sylva-dock rounded-[28px] border border-[var(--border)] shadow-2xl overflow-hidden transition-all">
            <div className="h-1 w-full bg-gradient-to-r from-[var(--lime)] via-[var(--sky)] to-[var(--sand)]" />

            {/* Indicador de Etapas no Topo do Card */}
            <div className="px-5 sm:px-7 pt-4 pb-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all',
                    step === 'login'
                      ? 'bg-[var(--accent)] border-[var(--tint-olive-border)] text-[var(--accent-ink)]'
                      : 'tone-success border'
                  )}
                >
                  {step === 'connect' ? <Check size={11} strokeWidth={3} /> : <span>01</span>}
                  <span>Login</span>
                </span>
                <span className="w-4 h-[1px] bg-[var(--border-strong)]" />
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all',
                    step === 'connect'
                      ? 'bg-[var(--accent)] border-[var(--tint-olive-border)] text-[var(--accent-ink)]'
                      : 'bg-[var(--card-subtle)] border-[var(--border)] text-[var(--muted)]'
                  )}
                >
                  <span>02</span>
                  <span>Ambiente Oracle</span>
                </span>
              </div>

              {step === 'connect' && authUser && (
                <button
                  type="button"
                  onClick={handleSwitchUser}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                >
                  <ArrowLeft size={12} />
                  <span>Trocar usuário</span>
                </button>
              )}
            </div>

            {/* Trilha Horizontal com Deslizamento Suave (Slide 1 -> Slide 2) */}
            <div className="overflow-hidden">
              <div
                className={cn(
                  'flex w-[200%] items-start transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  step === 'connect' ? '-translate-x-1/2' : 'translate-x-0'
                )}
              >
                {/* ================== SLIDE 1: LOGIN DO USUÁRIO ================== */}
                <div
                  aria-hidden={step !== 'login'}
                  className={cn(
                    'w-1/2 shrink-0 p-5 sm:p-7 transition-opacity duration-300',
                    step !== 'login' && 'opacity-0 pointer-events-none select-none'
                  )}
                >
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent-ink)]">
                        <KeyRound size={14} />
                        <span>Etapa 1 • Identificação</span>
                      </div>
                      <h2 className="text-lg font-extrabold text-[var(--foreground)] tracking-tight">
                        Entre com suas credenciais
                      </h2>
                      <p className="text-xs text-[var(--foreground-secondary)]">
                        Após autenticar, você poderá escolher a base Oracle, o modo demonstração ou criar conexões.
                      </p>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                          Usuário
                        </label>
                        <div className="relative">
                          <User
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                          />
                          <input
                            type="text"
                            autoComplete="username"
                            placeholder="ex: admin ou analista"
                            value={loginUsername}
                            onChange={(e) => {
                              setLoginUsername(e.target.value);
                              setLoginError(null);
                            }}
                            className="w-full h-11 bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl pl-10 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)] transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-secondary)]">
                          Senha
                        </label>
                        <div className="relative">
                          <Lock
                            size={15}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                          />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="Digite sua senha de acesso"
                            value={loginPassword}
                            onChange={(e) => {
                              setLoginPassword(e.target.value);
                              setLoginError(null);
                            }}
                            className="w-full h-11 bg-[var(--card-solid)] border border-[var(--border)] rounded-2xl pl-10 pr-11 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)] transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] p-1 cursor-pointer"
                            title={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                          >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Atalhos discretos apenas em ambiente local de desenvolvimento */}
                    {process.env.NODE_ENV !== 'production' && (
                      <div className="p-3 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="text-[var(--muted)] font-medium">Acesso inicial padrão (dev):</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setLoginUsername('admin');
                              setLoginPassword('admin123');
                              setLoginError(null);
                            }}
                            className="px-2.5 py-1 rounded-full sylva-pill text-[10px] font-bold text-[var(--accent-ink)] hover:border-[var(--lime)] cursor-pointer"
                          >
                            Admin (admin)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLoginUsername('analista');
                              setLoginPassword('analista123');
                              setLoginError(null);
                            }}
                            className="px-2.5 py-1 rounded-full sylva-pill text-[10px] font-bold text-[var(--foreground-secondary)] hover:border-[var(--border-strong)] cursor-pointer"
                          >
                            Analista (analista)
                          </button>
                        </div>
                      </div>
                    )}

                    {loginError && (
                      <div className="p-3.5 rounded-2xl tone-danger border text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span className="font-medium">{loginError}</span>
                      </div>
                    )}

                    {loginSuccessBanner && (
                      <div className="p-3.5 rounded-2xl tone-success border text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                        <CheckCircle2 size={16} className="shrink-0" />
                        <span className="font-bold">
                          {enteringDemo
                            ? 'Ambiente Sandbox pronto! Entrando na demonstração...'
                            : 'Login confirmado! Carregando ambientes...'}
                        </span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={authenticating || enteringDemo || loginSuccessBanner}
                      className="w-full h-12 rounded-full sylva-lime-btn font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
                    >
                      {authenticating ? (
                        <>
                          <RotateCw size={16} className="animate-spin" />
                          <span>Validando Credenciais...</span>
                        </>
                      ) : (
                        <>
                          <span>Autenticar e Avançar</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </Button>

                    {/* Acesso Direto ao Sandbox (Sem Login) */}
                    <div className="pt-1 space-y-3">
                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                        <span className="h-[1px] flex-1 bg-[var(--border-subtle)]" />
                        <span>ou acesse sem cadastro</span>
                        <span className="h-[1px] flex-1 bg-[var(--border-subtle)]" />
                      </div>

                      <button
                        type="button"
                        onClick={handleEnterDemo}
                        disabled={authenticating || enteringDemo || loginSuccessBanner}
                        className="w-full p-3.5 rounded-2xl bg-[var(--card-subtle)] hover:bg-[var(--card-hover)] border border-[var(--border)] hover:border-[var(--tone-info-border)] text-left transition-all flex items-center justify-between gap-3 cursor-pointer group disabled:opacity-60"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl tone-info border flex items-center justify-center shrink-0">
                            {enteringDemo ? (
                              <RotateCw size={16} className="animate-spin" />
                            ) : (
                              <Sparkles size={16} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-extrabold text-[var(--foreground)]">
                                Explorar Demonstração (Sem Login)
                              </span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border tone-info">
                                SANDBOX • DADOS FICTÍCIOS
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                              2 unidades e 10 documentos fictícios • Sem expor dados reais
                            </p>
                          </div>
                        </div>

                        <ArrowRight
                          size={15}
                          className="shrink-0 text-[var(--muted)] group-hover:text-[var(--foreground)] group-hover:translate-x-0.5 transition-all"
                        />
                      </button>
                    </div>
                  </form>
                </div>

                {/* ================== SLIDE 2: CONEXÃO ORACLE / SANDBOX ================== */}
                <div
                  aria-hidden={step !== 'connect'}
                  className={cn(
                    'w-1/2 shrink-0 p-5 sm:p-7 transition-opacity duration-300',
                    step !== 'connect' && 'opacity-0 pointer-events-none select-none'
                  )}
                >
                  {/* Crachá do Usuário Autenticado */}
                  {authUser && (
                    <div className="mb-5 p-3 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border)] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[var(--lime)] text-[var(--lime-ink)] flex items-center justify-center font-extrabold text-xs shrink-0">
                          {authUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--foreground)] truncate">{authUser.name}</div>
                          <div className="text-[10px] font-mono text-[var(--muted)] truncate">@{authUser.username}</div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0',
                          isAdmin
                            ? 'bg-[var(--accent)] border-[var(--tint-olive-border)] text-[var(--accent-ink)]'
                            : 'tone-info'
                        )}
                      >
                        {isAdmin ? 'Administrador' : 'Analista'}
                      </span>
                    </div>
                  )}

                  {/* Sessão 1: Seleção de Conexão Oracle */}
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                        <Database size={15} className="text-[var(--accent-ink)]" />
                        1. Ambiente de Dados (Oracle)
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-[var(--muted)]">
                          {connections.filter((c) => !c.isDemo).length}{' '}
                          {connections.filter((c) => !c.isDemo).length === 1 ? 'base real' : 'bases reais'}
                        </span>
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateForm((v) => !v);
                              setCreateError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider sylva-pill text-[var(--accent-ink)] hover:border-[var(--lime)] cursor-pointer transition-all"
                          >
                            {showCreateForm ? <X size={11} /> : <Plus size={11} />}
                            <span>{showCreateForm ? 'Cancelar' : 'Nova Conexão'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-medium text-[var(--muted)] flex items-center gap-1">
                            <Lock size={10} /> Somente leitura
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Formulário Inline de Criação de Conexão (Exclusivo ADMIN) */}
                    {isAdmin && showCreateForm && (
                      <form
                        onSubmit={handleCreateConnection}
                        className="p-3.5 rounded-2xl bg-[var(--card-subtle)] border border-[var(--border-strong)] space-y-2.5 animate-in fade-in duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground)]">
                            Cadastrar Instância Oracle
                          </span>
                          <span className="text-[10px] text-[var(--muted)]">Criptografia AES-256</span>
                        </div>

                        {createError && (
                          <div className="p-2 rounded-xl tone-danger border text-[11px] font-medium">
                            {createError}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Nome (ex: PRODUÇÃO)"
                            value={newConnForm.name}
                            onChange={(e) => setNewConnForm((f) => ({ ...f, name: e.target.value }))}
                            className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                          />
                          <input
                            type="text"
                            placeholder="Usuário (ex: DBAMV)"
                            value={newConnForm.user}
                            onChange={(e) => setNewConnForm((f) => ({ ...f, user: e.target.value }))}
                            className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                          />
                          <input
                            type="password"
                            placeholder="Senha Oracle"
                            value={newConnForm.password}
                            onChange={(e) => setNewConnForm((f) => ({ ...f, password: e.target.value }))}
                            className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                          />
                          <input
                            type="text"
                            placeholder="host:1521/servico"
                            value={newConnForm.connectString}
                            onChange={(e) => setNewConnForm((f) => ({ ...f, connectString: e.target.value }))}
                            className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs font-mono text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)]"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-0.5">
                          <button
                            type="submit"
                            disabled={creatingConn}
                            className="px-4 py-1.5 rounded-full sylva-lime-btn text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {creatingConn ? <RotateCw size={12} className="animate-spin" /> : <Check size={12} />}
                            <span>{creatingConn ? 'Salvando...' : 'Salvar Conexão'}</span>
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Barra de Pesquisa Rápida */}
                    {!loadingList && connections.length > 2 && (
                      <div className="relative">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Pesquisar por nome, SCAN host ou usuário..."
                          className="w-full bg-[var(--card-solid)] border border-[var(--border)] rounded-full pl-9 pr-8 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--lime)] transition-all"
                        />
                        {searchTerm && (
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] px-1 py-0.5 rounded transition-colors cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}

                    {loadingList ? (
                      <div className="p-5 bg-[var(--card-subtle)] border border-[var(--border)] rounded-2xl flex items-center justify-center gap-2.5 text-xs text-[var(--muted)]">
                        <RotateCw size={14} className="animate-spin text-[var(--accent-ink)]" />
                        <span>Carregando conexões cadastradas...</span>
                      </div>
                    ) : connections.length === 0 ? (
                      <div className="p-4 tone-warning border rounded-2xl text-xs flex items-center gap-2.5">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>Nenhuma conexão cadastrada no sistema.</span>
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto space-y-2 pr-1 select-none scrollbar-thin">
                        {filteredConnections.map((conn) => {
                          const isSelected = selectedConnId === conn.id;
                          return (
                            <button
                              key={conn.id}
                              type="button"
                              onClick={() => {
                                setSelectedConnId(conn.id);
                                setErrorInfo(null);
                              }}
                              className={cn(
                                'w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group',
                                isSelected
                                  ? 'bg-[var(--accent)] border-[var(--tint-olive-border)] ring-1 ring-[var(--lime)]/40 text-[var(--foreground)] shadow-xs'
                                  : 'bg-[var(--card-subtle)] border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--card-hover)] text-[var(--foreground-secondary)]'
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                                    isSelected
                                      ? 'bg-[var(--lime)] text-[var(--lime-ink)]'
                                      : 'bg-[var(--card-solid)] border border-[var(--border)] text-[var(--muted)] group-hover:text-[var(--foreground)]'
                                  )}
                                >
                                  {conn.isDemo ? <Sparkles size={16} /> : <Server size={16} />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                      className={cn(
                                        'text-xs font-bold truncate',
                                        isSelected ? 'text-[var(--foreground)]' : 'text-[var(--foreground-secondary)]'
                                      )}
                                    >
                                      {conn.name}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold text-[var(--accent-ink)] bg-[var(--card-solid)] border border-[var(--border)]">
                                      {conn.user}
                                    </span>
                                    {conn.isDemo && (
                                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border tone-info">
                                        SANDBOX • DADOS MOCKADOS
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[var(--muted)] font-mono truncate mt-0.5" title={conn.host}>
                                    {conn.host}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0 ml-3">
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-[var(--lime)] flex items-center justify-center text-[var(--lime-ink)] shadow-xs">
                                    <Check size={12} strokeWidth={3} />
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-[var(--border-strong)] group-hover:border-[var(--lime)]" />
                                )}
                              </div>
                            </button>
                          );
                        })}

                        {searchTerm && filteredConnections.length === 0 && (
                          <div className="p-4 text-center text-xs text-[var(--muted)] bg-[var(--card-subtle)] rounded-2xl border border-dashed border-[var(--border)]">
                            Nenhuma conexão encontrada para &quot;{searchTerm}&quot;.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Sessão 2: Seleção de Motor de Documentos */}
                  <div className="space-y-3 mb-5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
                      <Layers size={15} className="text-[var(--accent-ink)]" />
                      2. Motor de Documentos Clínicos
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Motor V3 */}
                      <button
                        type="button"
                        onClick={() => setSelectedVersion('V3')}
                        className={cn(
                          'p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer group',
                          selectedVersion === 'V3'
                            ? 'bg-[var(--accent)] border-[var(--tint-olive-border)] ring-1 ring-[var(--lime)]/40 shadow-xs'
                            : 'bg-[var(--card-subtle)] border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--card-hover)]'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--foreground)]">V3 // HTML5</span>
                            <Badge className="text-[9px] px-1.5 py-0">Atual</Badge>
                          </div>
                          {selectedVersion === 'V3' && <CheckCircle2 size={15} className="text-[var(--accent-ink)] shrink-0" />}
                        </div>
                        <p className="text-[11px] text-[var(--foreground-secondary)] leading-snug">
                          Editor clínico moderno, layout responsivo e assinatura digital.
                        </p>
                      </button>

                      {/* Motor V2 */}
                      <button
                        type="button"
                        onClick={() => setSelectedVersion('V2')}
                        className={cn(
                          'p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer group',
                          selectedVersion === 'V2'
                            ? 'tone-warning border ring-1 ring-amber-400/30 shadow-xs'
                            : 'bg-[var(--card-subtle)] border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--card-hover)]'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--foreground)]">V2 // FLEX</span>
                            <Badge variant="warning" className="text-[9px] px-1.5 py-0">
                              Legado
                            </Badge>
                          </div>
                          {selectedVersion === 'V2' && <CheckCircle2 size={15} className="text-[var(--tone-warning-fg)] shrink-0" />}
                        </div>
                        <p className="text-[11px] text-[var(--foreground-secondary)] leading-snug">
                          Documentação legada para histórico e controle de migração.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Feedback de Erro Amigável */}
                  {errorInfo && (
                    <div className="mb-5 p-4 rounded-2xl tone-danger border text-xs animate-in fade-in duration-200">
                      <div className="flex items-start gap-3">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <h5 className="font-bold">{errorInfo.title}</h5>
                          <p className="opacity-90 leading-relaxed">{errorInfo.message}</p>
                          <p className="font-semibold">{errorInfo.actionSuggestion}</p>
                        </div>
                      </div>

                      {errorInfo.technicalDetails && (
                        <div className="mt-3 pt-3 border-t border-[var(--tone-danger-border)]">
                          <button
                            type="button"
                            onClick={() => setShowTechDetails(prev => !prev)}
                            className="flex items-center gap-1 text-[11px] font-semibold hover:underline transition-colors cursor-pointer"
                          >
                            <ChevronDown className={cn('w-3 h-3 transition-transform', showTechDetails && 'rotate-180')} />
                            <span>{showTechDetails ? 'Ocultar detalhes técnicos' : 'Ver detalhe técnico do banco'}</span>
                          </button>

                          {showTechDetails && (
                            <div className="mt-2 p-2.5 bg-black/30 dark:bg-black/50 text-white rounded-xl font-mono text-[10px] break-all select-all">
                              {errorInfo.technicalDetails}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feedback de Sucesso */}
                  {connectionSuccess && (
                    <div className="mb-5 p-4 rounded-2xl tone-success border text-xs flex items-center gap-3 animate-in fade-in duration-200">
                      <CheckCircle2 size={18} className="shrink-0" />
                      <div>
                        <p className="font-bold">Conexão validada com sucesso!</p>
                        <p className="opacity-90">Inicializando ambiente e redirecionando...</p>
                      </div>
                    </div>
                  )}

                  {/* Botão de Conectar */}
                  <Button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting || connectionSuccess || !selectedConnId || connections.length === 0}
                    className="w-full h-12 rounded-full sylva-lime-btn font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {connecting ? (
                      <>
                        <RotateCw size={16} className="animate-spin" />
                        <span>Testando Conexão com Oracle...</span>
                      </>
                    ) : connectionSuccess ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Ambiente Conectado</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>
                          {connections.find((c) => c.id === selectedConnId)?.isDemo
                            ? 'Entrar no Modo Demonstração'
                            : 'Validar e Entrar no Sistema'}
                        </span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé informativo */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)]"></span>
              Sessão Criptografada AES-256
            </span>
            <span>•</span>
            <span>Política SQL Read-Only</span>
            <span>•</span>
            <span>Governança Clínica MV</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen sylva-canvas text-[var(--muted)] flex items-center justify-center text-xs">
          Carregando portal de conexão...
        </div>
      }
    >
      <ConnectPageContent />
    </Suspense>
  );
}
