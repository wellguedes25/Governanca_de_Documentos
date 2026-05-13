'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  FileText, 
  Activity, 
  Clock, 
  RefreshCcw, 
  ArrowLeft,
  TrendingUp,
  ChevronRight,
  Database,
  AlertTriangle,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUI } from '@/context/UIContext';
import { useRouter } from 'next/navigation';

const HOSPITALS = [
  { id: '7', sigla: 'HSC', nome: 'Hospital Santa Catarina', color: 'from-[var(--primary)] to-[var(--primary-light)]' },
  { id: '3', sigla: 'CSSJ', nome: 'Casa de Saúde São José', color: 'from-emerald-600 to-emerald-400' },
  { id: '4', sigla: 'HST', nome: 'Hospital Santa Teresa', color: 'from-amber-600 to-amber-400' },
  { id: '10', sigla: 'HSJ', nome: 'Hospital São José', color: 'from-indigo-600 to-indigo-400' },
  { id: '11', sigla: 'HMRP', nome: 'Hospital Madre Regina Protmann', color: 'from-purple-600 to-purple-400' },
  { id: '25', sigla: 'HCNSC', nome: 'Hospital Casa de Nossa Senhora da Conceição', color: 'from-rose-600 to-rose-400' },
  { id: '63', sigla: 'HR', nome: 'Hospital de Residência', color: 'from-slate-600 to-slate-400' }
];

export default function HospitaisPage() {
  const { docVersion } = useUI();
  const router = useRouter();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Proteção de rota
  useEffect(() => {
    const savedVersion = sessionStorage.getItem('app_doc_version');
    if (!docVersion && !savedVersion) {
      router.push('/');
    }
  }, [docVersion, router]);

  const selectedHospital = HOSPITALS[selectedIdx];

  const fetchData = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hospitals/stats?id=${id}`);
      const json = await res.json();
      
      if (json.error) {
        setError(json.error);
        return;
      }
      
      setData(json);
    } catch (error: any) {
      console.error('Erro ao buscar dados do hospital:', error);
      setError('Falha na comunicação com o servidor. Verifique se o Oracle está acessível.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedHospital.id);
  }, [selectedIdx]);

  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl bg-gradient-to-br shadow-lg", selectedHospital.color)}>
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-4 uppercase italic tracking-tighter">
              <Building2 className="text-[var(--primary)]" size={32} />
              Hospitais & Unidades
            </h1>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">
            Gestão de produtividade e conformidade por unidade hospitalar
          </p>
        </div>
        <Link href="/">
          <Button variant="outline" className="rounded-xl border-slate-200 hover:border-[var(--primary-light)] hover:text-[var(--primary-light)] group transition-all">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Dashboard Geral
          </Button>
        </Link>
      </div>

      {/* Hospital Selector - Premium Tabs */}
      <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
        {HOSPITALS.map((h, idx) => (
          <button
            key={h.id}
            onClick={() => setSelectedIdx(idx)}
            className={cn(
              "relative overflow-hidden py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-tighter transition-all border-2",
              selectedIdx === idx 
                ? cn("border-transparent text-white shadow-xl scale-105 z-10 bg-gradient-to-br", h.color) 
                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
            )}
          >
            {h.sigla}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-2xl animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500 rounded-xl shadow-lg shadow-rose-200">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-rose-900 font-black uppercase tracking-tight text-lg mb-1">
                Erro de Conectividade
              </h3>
              <p className="text-rose-600 text-sm font-medium leading-relaxed">
                {error}
              </p>
              <Button 
                onClick={() => fetchData(selectedHospital.id)}
                variant="outline" 
                className="mt-4 border-rose-200 text-rose-600 hover:bg-rose-100 rounded-xl font-bold uppercase text-xs"
              >
                <RefreshCcw className="w-3 h-3 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-slate-100 border-t-[var(--primary-light)] rounded-full animate-spin" />
            <Activity className="w-8 h-8 text-[var(--primary-light)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-800 text-sm font-black uppercase tracking-[0.2em] animate-pulse">Sincronizando</span>
            <span className="text-slate-400 text-[10px] font-bold uppercase mt-1">Aguardando resposta do Oracle...</span>
          </div>
        </div>
      ) : data?.error ? (
        <div className="flex flex-col items-center justify-center h-96 space-y-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 animate-in fade-in zoom-in duration-500">
          <div className="p-4 bg-rose-50 rounded-full">
            <AlertTriangle className="w-10 h-10 text-rose-500" />
          </div>
          <div className="text-center space-y-2 px-6">
            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Ops! Algo deu errado</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto font-medium">
              Não conseguimos carregar os dados desta unidade no momento.
            </p>
            <div className="text-[10px] font-mono text-rose-400 bg-rose-50 px-3 py-1.5 rounded-lg inline-block border border-rose-100 mt-2">
              Error: {data.error}
            </div>
          </div>
          <Button 
            onClick={() => fetchData(selectedHospital.id)}
            className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 px-8 shadow-xl hover:shadow-slate-200 transition-all active:scale-95"
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      ) : data?.kpis ? (
        <div className="space-y-8">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden group">
              <div className={cn("absolute top-0 left-0 w-1 h-full bg-gradient-to-b", selectedHospital.color)} />
              <CardHeader className="pb-2">
                <CardTitle className="text-[var(--primary-light)]">Total Preenchido</CardTitle>
                <CardDescription>{selectedHospital.nome}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">
                  {Number(data?.kpis?.TOTAL_DOCS || 0).toLocaleString('pt-BR')}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[var(--primary-light)]/10 text-[var(--primary-light)] border-none font-black text-[9px] uppercase">Volume 90d</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-emerald-600">Documentos Ativos</CardTitle>
                <CardDescription>Modelos Únicos em uso</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">
                  {data?.kpis?.DOCS_ATIVOS || 0}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase">Aderência</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500 to-orange-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-amber-600">Recência de Uso</CardTitle>
                <CardDescription>Última atividade registrada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-black text-slate-900 tracking-tighter mb-1 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  {data.kpis.ULTIMO_REGISTRO 
                    ? new Date(data.kpis.ULTIMO_REGISTRO).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Sem Dados'}
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Status da Unidade em Tempo Real</p>
              </CardContent>
            </Card>

          </div>

          {/* Main Content: Table & Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 relative overflow-hidden h-fit">
              <div className={cn("absolute top-0 left-0 w-1 h-full bg-gradient-to-b", selectedHospital.color)} />
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-6">
                <div>
                  <h2 className="text-slate-900 flex items-center gap-3">
                    <Database className="text-[var(--primary-light)]" size={24} />
                    Últimos 5 Documentos - {selectedHospital.sigla}
                  </h2>
                  <CardDescription className="mt-1">Atividade mais recente na unidade</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Documento</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Versão</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Volume</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Último Uso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {data?.details?.slice(0, 5).map((item: any) => (
                        <tr key={item.CD_DOCUMENTO} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-[var(--primary-light)]/5 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                                <FileText className="w-4 h-4 text-[var(--primary-light)]" />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800 tracking-tight leading-none mb-1">{item.NOME}</p>
                                <p className="text-[10px] font-bold text-slate-400 italic">ID {item.CD_DOCUMENTO}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant="outline" className="text-[9px] font-black border-slate-200">V{item.VERSAO || '1'}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xs font-black text-slate-700">{Number(item.USO_UNIDADE).toLocaleString('pt-BR')}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span className="text-[10px] font-black uppercase">
                                {item.ULTIMO_USO ? new Date(item.ULTIMO_USO).toLocaleDateString('pt-BR') : '-'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Top 5 Ranking Section */}
            <div className="space-y-6">
              <Card className="p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[var(--primary)] to-[var(--primary-light)]" />
                <CardHeader className="p-0 mb-8 border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter flex items-center gap-2">
                    <TrendingUp size={20} className="text-[var(--primary-light)]" />
                    Top 5 Documentos
                  </h3>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-6">
                    {data?.top5?.map((doc: any, i: number) => {
                      const max = data?.top5?.[0]?.USO || 1;
                      const percent = (doc.USO / max) * 100;
                      return (
                        <div key={i} className="group/bar">
                          <div className="flex justify-between items-end mb-2 px-0.5">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter truncate max-w-[80%]">
                              <span className="text-[var(--primary-light)] mr-2 italic">#{i + 1}</span>
                              {doc.NOME}
                            </span>
                            <span className="text-[10px] font-mono font-black text-[var(--primary-light)] bg-[var(--primary-light)]/5 px-2 py-0.5 rounded-lg border border-[var(--primary-light)]/20">
                              {Number(doc.USO).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-out shadow-sm",
                                i === 0 ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)]" : "bg-[var(--primary-light)]/60"
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>


              {/* Info Card */}
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 border-none shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Activity className="w-5 h-5 text-[var(--primary-light)]" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest">Insight da Unidade</h4>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300 font-medium italic">
                  "Esta unidade representa {data.globalTotal > 0 ? ((Number(data.kpis.TOTAL_DOCS) / Number(data.globalTotal)) * 100).toFixed(1) : '0'}% do volume total transacionado na rede ACSC nos últimos 90 dias."
                </p>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed border-2 border-slate-200">
          <Building2 className="w-16 h-16 text-slate-200 mb-6" />
          <h2 className="text-xl font-black text-slate-800 uppercase italic">Dados Indisponíveis</h2>
          <p className="text-slate-400 text-xs font-bold uppercase mt-2 max-w-xs">
            Aguardando sincronização ou ausência de registros para este hospital no período.
          </p>
        </Card>
      )}
    </div>
  );
}
