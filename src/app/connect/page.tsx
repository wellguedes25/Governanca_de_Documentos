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
  Sparkles,
  Layers,
  ChevronDown,
  Search,
  Check
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
      } catch (err: any) {
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

    } catch (err: any) {
      setErrorInfo(formatDatabaseError(err));
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden selection:bg-sky-500 selection:text-white">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-sky-900/15 via-slate-900/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-950/10 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-xl z-10 flex flex-col items-center">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative w-14 h-14 rounded-2xl bg-slate-900/90 border border-slate-700/80 p-2 flex items-center justify-center shadow-xl mb-4 shadow-slate-950/50">
            <Image 
              src="/logo_Icon.png" 
              alt="Goverdoc Pro" 
              width={48} 
              height={48} 
              className="object-contain rounded-xl"
              priority
            />
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h1 
              className="text-2xl sm:text-3xl font-extrabold tracking-tight !text-white flex items-center gap-2 drop-shadow-md"
              style={{ color: '#ffffff' }}
            >
              Goverdoc <span className="text-sky-400 font-black">Pro</span>
            </h1>
            <Badge variant="outline" className="text-[10px] font-bold bg-sky-950/80 text-sky-300 border-sky-800/80 px-2 py-0.5 uppercase tracking-wide">
              Gateway Clínico
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md">
            Selecione o ambiente de banco de dados e o motor de documentos para validar a sessão segura.
          </p>
        </div>

        {/* Card Principal */}
        <div className="w-full bg-slate-900/95 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl transition-all">
          
          {/* Sessão 1: Seleção de Conexão Oracle */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Database size={15} className="text-sky-400" />
                1. Ambiente de Dados (Oracle)
              </label>
              <span className="text-[11px] font-medium text-slate-400">
                {connections.length} {connections.length === 1 ? 'base configurada' : 'bases configuradas'}
              </span>
            </div>

            {/* Barra de Pesquisa Rápida para Múltiplas Conexões */}
            {!loadingList && connections.length > 2 && (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar por nome, SCAN host ou usuário..."
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white px-1 py-0.5 rounded transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {loadingList ? (
              <div className="p-5 bg-slate-950/50 border border-slate-800 rounded-2xl flex items-center justify-center gap-2.5 text-xs text-slate-400">
                <RotateCw size={14} className="animate-spin text-sky-400" />
                <span>Carregando conexões cadastradas...</span>
              </div>
            ) : connections.length === 0 ? (
              <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-2xl text-xs text-amber-300 flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                <span>Nenhuma conexão cadastrada no sistema. Configure em Conexões.</span>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 select-none">
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
                            ? "bg-sky-950/50 border-sky-500 text-white shadow-sm shadow-sky-950/40"
                            : "bg-slate-950/40 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                            isSelected ? "bg-sky-500/20 text-sky-400" : "bg-slate-800/70 text-slate-400 group-hover:text-slate-200"
                          )}>
                            <Server size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-bold truncate", isSelected ? "text-white" : "text-slate-200")}>
                                {conn.name}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono text-slate-300 bg-slate-800/70">
                                {conn.user}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5" title={conn.host}>
                              {conn.host}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 ml-3">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-slate-950 shadow-xs">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-700 group-hover:border-slate-500" />
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
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">
                    Nenhuma conexão encontrada para &quot;{searchTerm}&quot;.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sessão 2: Seleção de Motor de Documentos */}
          <div className="space-y-3 mb-6">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Layers size={15} className="text-sky-400" />
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
                    ? "bg-sky-950/50 border-sky-500 shadow-sm shadow-sky-950/40"
                    : "bg-slate-950/40 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/40"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">V3 // HTML5</span>
                    <Badge className="text-[9px] px-1.5 py-0 bg-sky-500/20 text-sky-300 border-sky-500/30">
                      Atual
                    </Badge>
                  </div>
                  {selectedVersion === 'V3' && <CheckCircle2 size={15} className="text-sky-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
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
                    ? "bg-sky-950/50 border-sky-500 shadow-sm shadow-sky-950/40"
                    : "bg-slate-950/40 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/40"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">V2 // FLEX</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-slate-400 border-slate-700">
                      Legado
                    </Badge>
                  </div>
                  {selectedVersion === 'V2' && <CheckCircle2 size={15} className="text-sky-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
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
            <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-200 flex items-center gap-3 animate-in fade-in duration-200">
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
            className="w-full h-12 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
          >
            {connecting ? (
              <>
                <RotateCw size={16} className="animate-spin" />
                <span>Testando Conexão com Oracle...</span>
              </>
            ) : connectionSuccess ? (
              <>
                <CheckCircle2 size={16} className="text-slate-950" />
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

        {/* Rodapé informativo */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400">
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
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-xs">
        Carregando portal de conexão...
      </div>
    }>
      <ConnectPageContent />
    </Suspense>
  );
}
