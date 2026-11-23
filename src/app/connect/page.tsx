"use client";

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Database, 
  ShieldCheck, 
  Server, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCw, 
  Layers,
  ChevronDown,
  Search,
  Check,
  Lock,
  Zap
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
}

function ConnectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setDocVersion } = useUI();
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<'V3' | 'V2'>('V3');
  const [loadingList, setLoadingList] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [errorInfo, setErrorInfo] = useState<FriendlyErrorInfo | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);

  // Carrega conexões disponíveis
  useEffect(() => {
    let mounted = true;
    async function loadConnections() {
      try {
        const res = await fetch('/api/auth/connect');
        if (!res.ok) throw new Error('Falha ao listar conexões.');
        const data = await res.json();
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

  const handleConnect = async () => {
    if (!selectedConnId) return;

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
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const friendly = data.friendlyError || formatDatabaseError(data.error);
        setErrorInfo(friendly);
        setConnecting(false);
        return;
      }

      // Sucesso no Handshake
      setConnectionSuccess(true);
      setDocVersion(selectedVersion);

      setTimeout(() => {
        router.push(redirectTarget);
        router.refresh();
      }, 700);

    } catch (err: unknown) {
      setErrorInfo(formatDatabaseError(err));
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#041516] text-teal-50 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden selection:bg-emerald-500 selection:text-[#031415]">
      {/* Background Dot-Grid Texture & Contained Clinical Green Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-80"
        style={{
          backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.09) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#074E52]/30 via-[#041516]/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#0D9488]/10 blur-3xl pointer-events-none rounded-full" />

      {/* Main Executive Asymmetric Container */}
      <div className="w-full max-w-5xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        
        {/* Coluna Esquerda: Identidade & Confiança Clínica */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl shadow-black/50 ring-1 ring-emerald-400/25 shrink-0">
              <Image
                src="/brand/goverdoc-icon.png"
                alt="Goverdoc Pro"
                width={56}
                height={56}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-2xl font-extrabold tracking-tight !text-white leading-none"
                  style={{ color: '#ffffff' }}
                >
                  Goverdoc <span className="text-emerald-400 font-black">Pro</span>
                </span>
                <Badge variant="outline" className="text-[10px] font-bold bg-[#074E52]/60 text-emerald-300 border-[#0D9488]/40 px-2 py-0.5 uppercase tracking-wide">
                  Gateway Clínico • DBAMV
                </Badge>
              </div>
              <p className="text-xs font-medium text-emerald-200/70">
                Governança Clínica
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h1
              className="text-2xl sm:text-3xl font-extrabold tracking-tight !text-white leading-tight"
              style={{ color: '#ffffff' }}
            >
              Acesso seguro ao motor de governança de prontuários.
            </h1>
            <p className="text-sm text-teal-100/70 leading-relaxed">
              Valide a instância Oracle e o motor do editor clínico para iniciar sua sessão com integridade.
            </p>
          </div>

          {/* 3 Indicadores Compactos de Confiança */}
          <div className="space-y-2.5">
            <div className="flex items-start gap-3 bg-[#061C1E]/80 border border-[#103336] rounded-2xl p-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#074E52]/60 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/15">
                <Zap size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Handshake Fail-Fast Oracle</p>
                <p className="text-[11px] text-teal-100/65 leading-snug mt-0.5">
                  Validação imediata de conectividade DBAMV antes da entrada.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#061C1E]/80 border border-[#103336] rounded-2xl p-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#074E52]/60 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/15">
                <Lock size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Sessão Criptografada AES-256</p>
                <p className="text-[11px] text-teal-100/65 leading-snug mt-0.5">
                  Credenciais isoladas em cookie seguro HttpOnly durante a sessão.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#061C1E]/80 border border-[#103336] rounded-2xl p-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#074E52]/60 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/15">
                <Layers size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white">Dual-Engine Editor V3 &amp; V2</p>
                <p className="text-[11px] text-teal-100/65 leading-snug mt-0.5">
                  Governança unificada para HTML5 moderno e legado Flex.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Painel Interativo de Conexão & Motor */}
        <div className="lg:col-span-7">
          <div className="w-full bg-[#071F21]/95 border border-[#12393C] rounded-3xl shadow-2xl shadow-black/50 ring-1 ring-white/[0.04] overflow-hidden backdrop-blur-xl transition-all">
            <div className="h-[3px] w-full bg-gradient-to-r from-[#074E52] via-[#0D9488] to-emerald-400" />
            
            <div className="p-5 sm:p-7">
              {/* Sessão 1: Seleção de Conexão Oracle */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-teal-50 flex items-center gap-2">
                    <Database size={15} className="text-emerald-400" />
                    1. Ambiente de Dados (Oracle)
                  </label>
                  <span className="text-[11px] font-medium text-teal-200/60">
                    {connections.length} {connections.length === 1 ? 'base configurada' : 'bases configuradas'}
                  </span>
                </div>

                {/* Barra de Pesquisa Rápida para Múltiplas Conexões */}
                {!loadingList && connections.length > 2 && (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-200/50 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Pesquisar por nome, SCAN host ou usuário..."
                      className="w-full bg-[#041516] border border-[#153E41] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-teal-200/40 focus:outline-none focus:border-emerald-400/70 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-teal-200/60 hover:text-white px-1 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {loadingList ? (
                  <div className="p-5 bg-[#041516]/70 border border-[#12373A] rounded-2xl flex items-center justify-center gap-2.5 text-xs text-teal-200/70">
                    <RotateCw size={14} className="animate-spin text-emerald-400" />
                    <span>Carregando conexões cadastradas...</span>
                  </div>
                ) : connections.length === 0 ? (
                  <div className="p-4 bg-amber-950/30 border border-amber-700/40 rounded-2xl text-xs text-amber-200 flex items-center gap-2.5">
                    <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                    <span>Nenhuma conexão cadastrada no sistema. Configure em Conexões.</span>
                  </div>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 select-none scrollbar-thin">
                    {connections
                      .filter((conn) => {
                        if (!searchTerm.trim()) return true;
                        const q = searchTerm.toLowerCase();
                        return (
                          conn.name.toLowerCase().includes(q) ||
                          conn.user.toLowerCase().includes(q) ||
                          conn.host.toLowerCase().includes(q)
                        );
                      })
                      .map((conn) => {
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
                              "w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group",
                              isSelected
                                ? "bg-[#074E52]/40 border-emerald-400/70 ring-1 ring-emerald-400/20 text-white shadow-sm shadow-black/30"
                                : "bg-[#041516]/70 border-[#12373A] hover:border-[#1E565B] hover:bg-[#09292C] text-teal-100/80"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                isSelected ? "bg-emerald-500/20 text-emerald-300" : "bg-[#0B2D30] text-teal-200/60 group-hover:text-emerald-200"
                              )}>
                                <Server size={16} />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-xs font-bold truncate", isSelected ? "text-white" : "text-teal-50")}>
                                    {conn.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-emerald-200 bg-[#074E52]/60 border border-emerald-400/15">
                                    {conn.user}
                                  </span>
                                </div>
                                <p className="text-[10px] text-teal-200/55 font-mono truncate mt-0.5" title={conn.host}>
                                  {conn.host}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 ml-3">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-400 flex items-center justify-center text-[#031415] shadow-xs">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-[#1E565B] group-hover:border-emerald-400/50" />
                              )}
                            </div>
                          </button>
                        );
                      })}

                    {searchTerm && connections.filter(c => 
                      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      c.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      c.host.toLowerCase().includes(searchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="p-4 text-center text-xs text-teal-200/65 bg-[#041516]/60 rounded-2xl border border-dashed border-[#153E41]">
                        Nenhuma conexão encontrada para &quot;{searchTerm}&quot;.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sessão 2: Seleção de Motor de Documentos */}
              <div className="space-y-3 mb-6">
                <label className="text-xs font-bold uppercase tracking-wider text-teal-50 flex items-center gap-2">
                  <Layers size={15} className="text-emerald-400" />
                  2. Motor de Documentos Clínicos
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Motor V3 */}
                  <button
                    type="button"
                    onClick={() => setSelectedVersion('V3')}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer group",
                      selectedVersion === 'V3'
                        ? "bg-[#074E52]/45 border-emerald-400/70 ring-1 ring-emerald-400/20 shadow-sm shadow-black/30"
                        : "bg-[#041516]/70 border-[#12373A] hover:border-[#1E565B] hover:bg-[#09292C]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">V3 // HTML5</span>
                        <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          Atual
                        </Badge>
                      </div>
                      {selectedVersion === 'V3' && <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-teal-100/60 leading-snug">
                      Editor clínico moderno, layout responsivo e assinatura digital.
                    </p>
                  </button>

                  {/* Motor V2 */}
                  <button
                    type="button"
                    onClick={() => setSelectedVersion('V2')}
                    className={cn(
                      "p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer group",
                      selectedVersion === 'V2'
                        ? "bg-amber-950/35 border-amber-400/60 ring-1 ring-amber-400/20 shadow-sm shadow-black/30"
                        : "bg-[#041516]/70 border-[#12373A] hover:border-[#1E565B] hover:bg-[#09292C]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">V2 // FLEX</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-300 border-amber-400/30">
                          Legado
                        </Badge>
                      </div>
                      {selectedVersion === 'V2' && <CheckCircle2 size={15} className="text-amber-400 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-teal-100/60 leading-snug">
                      Documentação legada para histórico e controle de migração.
                    </p>
                  </button>
                </div>
              </div>

              {/* Feedback de Erro Amigável */}
              {errorInfo && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-200 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <h5 className="font-bold text-rose-200">{errorInfo.title}</h5>
                      <p className="text-rose-300/90 leading-relaxed">{errorInfo.message}</p>
                      <p className="text-rose-400 font-medium">{errorInfo.actionSuggestion}</p>
                    </div>
                  </div>

                  {errorInfo.technicalDetails && (
                    <div className="mt-3 pt-3 border-t border-rose-800/40">
                      <button
                        type="button"
                        onClick={() => setShowTechDetails(prev => !prev)}
                        className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-200 transition-colors cursor-pointer"
                      >
                        <ChevronDown className={cn("w-3 h-3 transition-transform", showTechDetails && "rotate-180")} />
                        <span>{showTechDetails ? "Ocultar detalhes técnicos" : "Ver detalhe técnico do banco"}</span>
                      </button>

                      {showTechDetails && (
                        <div className="mt-2 p-2 bg-black/40 border border-rose-900/60 rounded-xl font-mono text-[10px] text-rose-300 break-all select-all">
                          {errorInfo.technicalDetails}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback de Sucesso */}
              {connectionSuccess && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-100 flex items-center gap-3 animate-in fade-in duration-200">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-emerald-200">Conexão validada com sucesso!</p>
                    <p className="text-emerald-300/80">Inicializando ambiente e redirecionando...</p>
                  </div>
                </div>
              )}

              {/* Botão de Conectar */}
              <Button
                type="button"
                onClick={handleConnect}
                disabled={connecting || connectionSuccess || !selectedConnId || connections.length === 0}
                className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#031415] font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/60 transition-all disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <RotateCw size={16} className="animate-spin" />
                    <span>Testando Conexão com Oracle...</span>
                  </>
                ) : connectionSuccess ? (
                  <>
                    <CheckCircle2 size={16} className="text-[#031415]" />
                    <span>Ambiente Conectado</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Validar e Entrar no Sistema</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Rodapé informativo */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-teal-200/55">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Sessão Criptografada AES-256
            </span>
            <span>•</span>
            <span>Fail-Fast Handshake</span>
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
    <Suspense fallback={
      <div className="min-h-screen bg-[#041516] text-teal-200/70 flex items-center justify-center text-xs">
        Carregando portal de conexão...
      </div>
    }>
      <ConnectPageContent />
    </Suspense>
  );
}
