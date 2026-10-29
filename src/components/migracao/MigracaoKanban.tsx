"use client";

import React, { useState, useMemo } from 'react';
import { 
  DocumentoMigracao, 
  DocumentoFlexItem, 
  StatusMigracao 
} from '@/types/migracao.types';
import { KanbanColumn } from './KanbanColumn';
import { KanbanBacklogRail } from './KanbanBacklogRail';

interface MigracaoKanbanProps {
  migracoes: DocumentoMigracao[];
  docsFlexSemMigracao: DocumentoFlexItem[];
  onSelectMigracao: (migracao: DocumentoMigracao) => void;
  onPromoverBacklogDoc: (docFlex: DocumentoFlexItem, targetStatus?: StatusMigracao) => void;
  onNovaMigracaoNaEtapa?: (etapaId: StatusMigracao) => void;
  onUpdateStatus: (id: string, newStatus: StatusMigracao) => void;
  searchTerm: string;
  filtroResponsavel: string;
  apenasMinhas: boolean;
}

const COLUNAS_KANBAN: { id: StatusMigracao; label: string; cor: string; limiteWip?: number }[] = [
  { id: 'PENDENTES', label: 'Pendentes', cor: 'amber', limiteWip: undefined },
  { id: 'DESENVOLVIMENTO', label: 'Desenvolvimento', cor: 'blue', limiteWip: 10 },
  { id: 'HOMOLOGACAO', label: 'Homologação', cor: 'sky', limiteWip: 5 },
  { id: 'CONFIGURACAO_PERFIL', label: 'Perfil', cor: 'slate', limiteWip: 5 },
  { id: 'AGENDADO', label: 'Agendado', cor: 'teal', limiteWip: undefined },
  { id: 'EM_PRODUCAO', label: 'Produção', cor: 'emerald', limiteWip: undefined },
];

export function MigracaoKanban({
  migracoes,
  docsFlexSemMigracao,
  onSelectMigracao,
  onPromoverBacklogDoc,
  onNovaMigracaoNaEtapa,
  onUpdateStatus,
  searchTerm,
  filtroResponsavel,
  apenasMinhas
}: MigracaoKanbanProps) {
  const [isBacklogPinned, setIsBacklogPinned] = useState(false);

  // Filtra itens por busca, responsável e "Minhas Demandas"
  const filteredItems = useMemo(() => {
    return migracoes.filter(m => {
      const nome = (m.documento_flex?.nome || m.documento_html5?.nome || m.tipo_documento || '').toLowerCase();
      const flexCod = String(m.documento_flex?.cd_documento_mv || m.documento_flex_id || '');
      const lecom = String(m.lecom || '');
      const resp = m.responsavel_dev || m.responsavel || '';
      const respPerfil = m.responsavel_perfil || '';

      const matchSearch = !searchTerm.trim() || 
        nome.includes(searchTerm.toLowerCase()) || 
        flexCod.includes(searchTerm) || 
        lecom.includes(searchTerm);

      let matchResp = filtroResponsavel === 'TODOS' || resp === filtroResponsavel;

      if (apenasMinhas) {
        const meuNomeRegex = /cleiton|wellington|wellguedes/i;
        matchResp = meuNomeRegex.test(resp) || meuNomeRegex.test(respPerfil);
      }

      return matchSearch && matchResp;
    });
  }, [migracoes, searchTerm, filtroResponsavel, apenasMinhas]);

  return (
    <div className="flex gap-4 items-start w-full overflow-hidden">
      
      {/* 1. Backlog Lateral de Documentos Flex V2 (Todos os 680+ documentos do Oracle) */}
      <KanbanBacklogRail
        docsFlexSemMigracao={docsFlexSemMigracao}
        onPromoverDoc={(doc) => onPromoverBacklogDoc(doc, 'PENDENTES')}
        isPinnedAsColumn={isBacklogPinned}
        onTogglePin={() => setIsBacklogPinned(!isBacklogPinned)}
      />

      {/* 2. Esteira Kanban com Rolagem Horizontal Suave */}
      <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin">
        <div className="flex gap-3.5 min-w-max pb-2">
          {COLUNAS_KANBAN.map(col => {
            const itemsInCol = filteredItems.filter(m => m.status === col.id);
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                label={col.label}
                cor={col.cor}
                limiteWip={col.limiteWip}
                items={itemsInCol}
                onSelectMigracao={onSelectMigracao}
                onNovaMigracaoNaEtapa={onNovaMigracaoNaEtapa}
                onDropItem={(id, targetStatus) => onUpdateStatus(id, targetStatus)}
                onDropBacklogDoc={(doc, targetStatus) => onPromoverBacklogDoc(doc, targetStatus)}
              />
            );
          })}
        </div>
      </div>

    </div>
  );
}
