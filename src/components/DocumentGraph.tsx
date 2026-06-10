"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Info,
  Filter,
  Loader2
} from "lucide-react";

interface DocumentGraphProps {
  documentId: string;
  documentName: string;
  metadata: any[];
  activeSpecs: any;
  metadataActions: any[];
  profileData: any[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  group: "document" | "version" | "header" | "footer" | "profile" | "field" | "relatedDoc";
  details?: Record<string, any>;
  linksCount?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
}

const NODE_COLORS = {
  document: "#3b82f6",   // Blue
  version: "#10b981",    // Emerald
  header: "#06b6d4",     // Cyan
  footer: "#0891b2",     // Darker Cyan
  profile: "#f59e0b",    // Amber/Orange (No purple!)
  field: "#f43f5e",      // Rose
  relatedDoc: "#64748b",  // Slate
};

const EDGE_COLORS = {
  TEM_VERSAO: "#10b981",
  USA_CABECALHO: "#06b6d4",
  USA_RODAPE: "#0891b2",
  ACESSO_PERFIL: "#f59e0b",
  TEM_CAMPO: "#f43f5e",
  VINCOLA_DOC: "#3b82f6",
  VINCOLA_GRUPO: "#64748b",
};

export default function DocumentGraph({
  documentId,
  documentName,
  metadata,
  activeSpecs,
  metadataActions,
  profileData,
  isFullscreen = false,
  onToggleFullscreen
}: DocumentGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [compareNode, setCompareNode] = useState<GraphNode | null>(null);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [diffData, setDiffData] = useState<any>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [activeEdgeFilters, setActiveEdgeFilters] = useState<Set<string>>(
    new Set(Object.keys(EDGE_COLORS))
  );

  // Parse nodes and edges from props
  const { nodes, links } = useMemo(() => {
    const nodeMap: Record<string, GraphNode> = {};
    const linksList: GraphLink[] = [];

    const addNode = (id: string, label: string, group: GraphNode["group"], details?: Record<string, any>) => {
      if (!nodeMap[id]) {
        nodeMap[id] = { id, label, group, details, linksCount: 0 };
      }
    };

    // 1. Center node (Document)
    const docNodeId = `doc-${documentId}`;
    addNode(docNodeId, documentName || `Documento ${documentId}`, "document", {
      "ID Documento": documentId,
      "Campos Totais": activeSpecs?.QUANTIDADE_CAMPOS ?? 0,
      "Regras Totais": activeSpecs?.QUANTIDADE_REGRAS ?? 0,
    });

    // 2. Versions
    if (metadata && metadata.length > 0) {
      // Keep track of added versions to avoid duplicate nodes
      const addedVersions = new Set<string>();
      metadata.forEach((v) => {
        const verNum = String(v.VALOR_VERSAO);
        if (!addedVersions.has(verNum)) {
          addedVersions.add(verNum);
          const verNodeId = `ver-${verNum}`;
          addNode(verNodeId, `Versão ${verNum}`, "version", {
            "Número Versão": verNum,
            "Layout": v.DESCRICAO_TIPO_LAYOUT,
            "Tipo": v.DESCRICAO_TIPO_VERSION,
            "Ativo": v.STATUS_ATIVO === "S" ? "Sim" : "Não",
          });
          linksList.push({
            source: docNodeId,
            target: verNodeId,
            relation: "TEM_VERSAO",
          });
        }
      });
    }

    // 3. Header and Footer
    if (activeSpecs?.CODIGO_LAYOUT_CABECALHO && activeSpecs.CODIGO_LAYOUT_CABECALHO !== "Sem Cabeçalho") {
      const headerId = `header-${activeSpecs.CODIGO_LAYOUT_CABECALHO}`;
      addNode(headerId, `Cab: ${activeSpecs.CODIGO_LAYOUT_CABECALHO}`, "header", {
        "ID Cabeçalho": activeSpecs.CODIGO_LAYOUT_CABECALHO,
        "Origem": activeSpecs.DOCUMENTO_CABECALHO || "Própria",
      });
      linksList.push({
        source: docNodeId,
        target: headerId,
        relation: "USA_CABECALHO",
      });
    }

    if (activeSpecs?.CODIGO_LAYOUT_RODAPE && activeSpecs.CODIGO_LAYOUT_RODAPE !== "Sem Rodapé") {
      const footerId = `footer-${activeSpecs.CODIGO_LAYOUT_RODAPE}`;
      addNode(footerId, `Rod: ${activeSpecs.CODIGO_LAYOUT_RODAPE}`, "footer", {
        "ID Rodapé": activeSpecs.CODIGO_LAYOUT_RODAPE,
      });
      linksList.push({
        source: docNodeId,
        target: footerId,
        relation: "USA_RODAPE",
      });
    }

    // 4. Profiles
    if (profileData && profileData.length > 0) {
      profileData.forEach((p) => {
        if (p.CD_PERFIL) {
          const profileNodeId = `profile-${p.CD_PERFIL}`;
          addNode(profileNodeId, p.NM_PERFIL || `Perfil ${p.CD_PERFIL}`, "profile", {
            "Código Perfil": p.CD_PERFIL,
            "Nome Perfil": p.NM_PERFIL,
            "Empresa": p.NM_EMPRESA || "Todas",
          });
          linksList.push({
            source: docNodeId,
            target: profileNodeId,
            relation: "ACESSO_PERFIL",
          });
        }
      });
    }

    // 5. Fields & SQL Bindings
    if (metadataActions && metadataActions.length > 0) {
      metadataActions.forEach((act) => {
        if (act.IDENTIFICADOR_CAMPO) {
          const fieldNodeId = `field-${act.IDENTIFICADOR_CAMPO}`;
          addNode(fieldNodeId, act.NOME_CAMPO || act.IDENTIFICADOR_CAMPO, "field", {
            "ID Campo": act.IDENTIFICADOR_CAMPO,
            "Nome Campo": act.NOME_CAMPO,
            "Lógica SQL": act.SCRIPT_ACAO_COMPLETO ? "Sim" : "Não",
          });
          linksList.push({
            source: docNodeId,
            target: fieldNodeId,
            relation: "TEM_CAMPO",
          });

          // Connect fields to related documents
          if (act.DOCUMENTO_RELACIONADO) {
            const relDocId = `doc-${act.DOCUMENTO_RELACIONADO}`;
            addNode(relDocId, `Doc ${act.DOCUMENTO_RELACIONADO}`, "relatedDoc", {
              "ID Documento Relacionado": act.DOCUMENTO_RELACIONADO,
            });
            linksList.push({
              source: fieldNodeId,
              target: relDocId,
              relation: "VINCOLA_DOC",
            });
          }

          if (act.GRUPO_DOCS_RELACIONADOS) {
            const relGroupId = `group-${act.GRUPO_DOCS_RELACIONADOS}`;
            addNode(relGroupId, `Grupo: ${act.GRUPO_DOCS_RELACIONADOS}`, "relatedDoc", {
              "Grupo Documentos": act.GRUPO_DOCS_RELACIONADOS,
            });
            linksList.push({
              source: fieldNodeId,
              target: relGroupId,
              relation: "VINCOLA_GRUPO",
            });
          }
        }
      });
    }

    // Compute degrees
    linksList.forEach((link) => {
      const srcNode = nodeMap[link.source as string];
      const tgtNode = nodeMap[link.target as string];
      if (srcNode && srcNode.linksCount !== undefined) srcNode.linksCount++;
      if (tgtNode && tgtNode.linksCount !== undefined) tgtNode.linksCount++;
    });

    return {
      nodes: Object.values(nodeMap),
      links: linksList,
    };
  }, [documentId, documentName, metadata, activeSpecs, metadataActions, profileData]);

  // Handle active filters
  const filteredLinks = useMemo(() => {
    return links.filter((link) => activeEdgeFilters.has(link.relation));
  }, [links, activeEdgeFilters]);

  const toggleFilter = (relation: string) => {
    const next = new Set(activeEdgeFilters);
    if (next.has(relation)) {
      next.delete(relation);
    } else {
      next.add(relation);
    }
    setActiveEdgeFilters(next);
  };

  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (showCompareModal && compareNode && selectedNode) {
      setDiffLoading(true);
      fetch('/api/documentos/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: documentId,
          vA: compareNode.details?.["Número Versão"],
          vB: selectedNode.details?.["Número Versão"]
        })
      })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setDiffData(data);
      })
      .catch(err => console.error("Error loading diff", err))
      .finally(() => setDiffLoading(false));
    } else {
      setDiffData(null);
    }
  }, [showCompareModal, compareNode, selectedNode, documentId]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current?.clientWidth || 400;
    const height = containerRef.current?.clientHeight || 300;

    // SVG Layout structure
    const g = svg.append("g").attr("class", "graph-content");

    // Arrow markers for links direction
    const defs = svg.append("defs");
    Object.entries(EDGE_COLORS).forEach(([rel, color]) => {
      defs.append("marker")
        .attr("id", `arrow-${rel}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 22)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", color)
        .attr("opacity", 0.8);
    });

    // Setup zoom
    zoomBehavior.current = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehavior.current);

    // D3 Forces
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force("link", d3.forceLink<GraphNode, GraphLink>(filteredLinks).id(d => d.id).distance(isFullscreen ? 120 : 80))
      .force("charge", d3.forceManyBody().strength(isFullscreen ? -350 : -200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<GraphNode>().radius(d => Math.max(12, 12 + (d.linksCount || 0) * 1.5) + 5));

    // Render links
    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(filteredLinks)
      .enter()
      .append("line")
      .attr("stroke", d => EDGE_COLORS[d.relation as keyof typeof EDGE_COLORS] || "#555")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => d.relation === "ACESSO_PERFIL" ? "3,3" : "none")
      .attr("opacity", 0.6)
      .attr("marker-end", d => `url(#arrow-${d.relation})`);

    // Drag behavior for nodes
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    // Render node groups
    const node = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node-group")
      .call(drag as any)
      .on("click", (event, d) => {
        setSelectedNode(d);
      });

    // Draw circles representing nodes
    node.append("circle")
      .attr("r", d => Math.max(10, 10 + (d.linksCount || 0) * 1.2))
      .attr("fill", d => NODE_COLORS[d.group])
      .attr("stroke", "#ffffff")
      .attr("stroke-width", d => d.id === `doc-${documentId}` ? 3 : 1.5)
      .attr("class", "node-circle transition-all duration-300 hover:scale-115 cursor-pointer")
      .style("filter", d => d.id === `doc-${documentId}` ? `drop-shadow(0 0 8px ${NODE_COLORS.document})` : "none");

    // Draw text labels
    node.append("text")
      .attr("dy", d => Math.max(16, 16 + (d.linksCount || 0) * 1.2) + 6)
      .attr("text-anchor", "middle")
      .text(d => d.label.length > (isFullscreen ? 18 : 12) ? d.label.slice(0, isFullscreen ? 16 : 10) + "…" : d.label)
      .attr("class", "text-[9px] font-bold fill-foreground font-sans pointer-events-none select-none tracking-tight");

    // Simulation tick loop
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as GraphNode).x!)
        .attr("y1", d => (d.source as GraphNode).y!)
        .attr("x2", d => (d.target as GraphNode).x!)
        .attr("y2", d => (d.target as GraphNode).y!);

      node
        .attr("transform", d => `translate(${d.x!}, ${d.y!})`);
    });

    // Center view initially
    if (zoomBehavior.current && svgRef.current) {
      svg.call(
        zoomBehavior.current.transform, 
        d3.zoomIdentity.translate(0, 0).scale(isFullscreen ? 1 : 0.85)
      );
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, filteredLinks, isFullscreen, documentId, documentName]);

  // Zoom controls helper functions
  const handleZoomIn = () => {
    if (zoomBehavior.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (zoomBehavior.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 0.75);
    }
  };

  const handleReset = () => {
    if (zoomBehavior.current && svgRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(
        zoomBehavior.current.transform, 
        d3.zoomIdentity.translate(0, 0).scale(isFullscreen ? 1 : 0.85)
      );
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-col border border-border bg-card rounded-none overflow-hidden ${
        isFullscreen ? "w-full h-[80vh]" : "w-full h-[320px]"
      }`}
    >
      {/* Header controls bar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-background/80 backdrop-blur border border-border text-foreground hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all rounded-none"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-background/80 backdrop-blur border border-border text-foreground hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all rounded-none"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-background/80 backdrop-blur border border-border text-foreground hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all rounded-none"
          title="Reset"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="p-2 bg-background/80 backdrop-blur border border-border text-foreground hover:text-[var(--primary)] hover:border-[var(--primary)]/30 transition-all rounded-none"
            title={isFullscreen ? "Minimizar" : "Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
      </div>

      {/* SVG Canvas for D3 Graph */}
      <svg 
        ref={svgRef} 
        className="w-full h-full bg-background/30 select-none cursor-grab active:cursor-grabbing font-sans"
      />

      {/* Legend & Details Drawer */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 max-w-[calc(100%-32px)]">
        {/* Chips Filters (compact in normal view, list in fullscreen) */}
        <div className="flex flex-wrap gap-1 bg-background/90 backdrop-blur border border-border p-2 max-w-[320px] md:max-w-md shadow-lg">
          <span className="text-[8px] font-black text-muted uppercase tracking-wider w-full mb-1 flex items-center gap-1">
            <Filter size={8} /> Filtros de Vínculos
          </span>
          {Object.entries(EDGE_COLORS).map(([rel, color]) => {
            const active = activeEdgeFilters.has(rel);
            return (
              <button
                key={rel}
                onClick={() => toggleFilter(rel)}
                className={`px-2 py-0.5 text-[8px] font-black rounded-none uppercase tracking-wider transition-all border ${
                  active 
                    ? "text-foreground" 
                    : "text-muted-foreground border-transparent opacity-40 bg-transparent"
                }`}
                style={{ 
                  backgroundColor: active ? `${color}15` : "transparent",
                  borderColor: active ? color : "transparent"
                }}
              >
                {rel.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active comparison indicator at top center */}
      {compareNode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-background/90 backdrop-blur border border-[var(--primary)] px-3 py-1.5 shadow-lg">
          <span className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] animate-pulse">
            Comparação Ativa
          </span>
          <span className="text-[10px] font-bold text-foreground">
            Versão {compareNode.details?.["Número Versão"]} selecionada
          </span>
          <button
            onClick={() => setCompareNode(null)}
            className="text-[8px] font-black uppercase tracking-widest text-muted hover:text-foreground border-l border-border pl-2 ml-1 cursor-pointer"
          >
            Limpar
          </button>
        </div>
      )}

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="absolute top-16 right-4 z-20 w-64 bg-background/95 backdrop-blur-md border border-border p-4 shadow-xl animate-in fade-in slide-in-from-right-4 rounded-none">
          <div className="flex items-start justify-between mb-3 border-b border-border pb-2">
            <div>
              <span 
                className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-none border"
                style={{ 
                  color: NODE_COLORS[selectedNode.group], 
                  borderColor: NODE_COLORS[selectedNode.group],
                  backgroundColor: `${NODE_COLORS[selectedNode.group]}10`
                }}
              >
                {selectedNode.group.toUpperCase()}
              </span>
              <h4 className="text-xs font-bold text-foreground uppercase tracking-tight mt-2 leading-tight">
                {selectedNode.label}
              </h4>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[9px] font-bold text-muted hover:text-foreground cursor-pointer uppercase font-mono"
            >
              Fechar
            </button>
          </div>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-thin">
            {selectedNode.details ? (
              Object.entries(selectedNode.details).map(([key, val]) => (
                <div key={key} className="text-[10px]">
                  <span className="block text-muted font-black uppercase tracking-wider text-[8px] mb-0.5">{key}</span>
                  <span className="block font-mono font-bold text-foreground leading-relaxed break-words">{String(val)}</span>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-muted flex items-center gap-1.5">
                <Info size={12} /> Sem detalhes adicionais.
              </div>
            )}
          </div>

          {/* Action button inside Version Drawer */}
          {selectedNode.group === "version" && (
            <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
              {compareNode ? (
                compareNode.id === selectedNode.id ? (
                  <button
                    onClick={() => setCompareNode(null)}
                    className="w-full text-center py-1.5 text-[9px] font-black uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive hover:bg-destructive/20 transition-all rounded-none cursor-pointer"
                  >
                    Cancelar Seleção
                  </button>
                ) : (
                  <button
                    onClick={() => setShowCompareModal(true)}
                    className="w-full text-center py-1.5 text-[9px] font-black uppercase tracking-wider bg-[var(--primary)] text-primary-foreground hover:opacity-95 transition-all rounded-none cursor-pointer"
                  >
                    Comparar com Versão {compareNode.details?.["Número Versão"]}
                  </button>
                )
              ) : (
                <button
                  onClick={() => setCompareNode(selectedNode)}
                  className="w-full text-center py-1.5 text-[9px] font-black uppercase tracking-wider bg-border text-foreground hover:bg-muted transition-all border border-border rounded-none cursor-pointer"
                >
                  Selecionar para Comparar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Comparison Modal */}
      {showCompareModal && compareNode && selectedNode && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-2xl max-h-[90%] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 rounded-none">
            <div className="flex items-center justify-between border-b border-border p-4 bg-muted/40">
              <div>
                <span className="text-[8px] font-black text-[var(--primary)] uppercase tracking-widest block">Comparador Visual</span>
                <h3 className="text-sm font-black text-foreground uppercase tracking-tight">
                  Versão {compareNode.details?.["Número Versão"]} vs Versão {selectedNode.details?.["Número Versão"]}
                </h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="text-[10px] font-black uppercase text-muted hover:text-foreground tracking-wider cursor-pointer"
              >
                Fechar
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* General Metadata Comparison */}
              <div>
                <h4 className="text-[10px] font-black text-muted uppercase tracking-wider mb-2">Resumo Geral</h4>
                <div className="grid grid-cols-3 gap-4 border border-border p-3 bg-background/50">
                  <div className="text-[10px]">
                    <span className="block text-muted font-bold mb-1 uppercase text-[8px]">Propriedade</span>
                    <div className="py-1 border-b border-border font-bold">Status Ativo</div>
                    <div className="py-1 border-b border-border font-bold">Tipo da Versão</div>
                  </div>
                  <div className="text-[10px]">
                    <span className="block text-muted font-bold mb-1 uppercase text-[8px]">Versão {compareNode.details?.["Número Versão"]} (Base)</span>
                    <div className="py-1 border-b border-border">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-none ${compareNode.details?.["Ativo"] === "Sim" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                        {compareNode.details?.["Ativo"]}
                      </span>
                    </div>
                    <div className="py-1 border-b border-border font-mono">{compareNode.details?.["Tipo"] || "N/A"}</div>
                  </div>
                  <div className="text-[10px]">
                    <span className="block text-muted font-bold mb-1 uppercase text-[8px]">Versão {selectedNode.details?.["Número Versão"]} (Alvo)</span>
                    <div className="py-1 border-b border-border">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-none ${selectedNode.details?.["Ativo"] === "Sim" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                        {selectedNode.details?.["Ativo"]}
                      </span>
                      {compareNode.details?.["Ativo"] !== selectedNode.details?.["Ativo"] && (
                        <span className="text-[9px] text-amber-500 font-bold ml-1">(Alterado)</span>
                      )}
                    </div>
                    <div className="py-1 border-b border-border font-mono">
                      {selectedNode.details?.["Tipo"] || "N/A"}
                      {compareNode.details?.["Tipo"] !== selectedNode.details?.["Tipo"] && (
                        <span className="text-[9px] text-amber-500 font-bold ml-1">(Alterado)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Layouts Comparison */}
              <div>
                <h4 className="text-[10px] font-black text-muted uppercase tracking-wider mb-2">Estrutura de Layouts</h4>
                <div className="space-y-4">
                  {/* We group metadata by layouts */}
                  {(() => {
                    const vA = Number(compareNode.details?.["Número Versão"]);
                    const vB = Number(selectedNode.details?.["Número Versão"]);
                    
                    const layoutsA = (metadata || []).filter(m => m.VALOR_VERSAO === vA);
                    const layoutsB = (metadata || []).filter(m => m.VALOR_VERSAO === vB);
                    
                    // Distinct layouts across both
                    const allLayoutIds = Array.from(new Set([
                      ...layoutsA.map(l => l.CODIGO_TIPO_LAYOUT),
                      ...layoutsB.map(l => l.CODIGO_TIPO_LAYOUT)
                    ]));

                    if (allLayoutIds.length === 0) {
                      return <div className="text-xs text-muted">Nenhum layout cadastrado nestas versões.</div>;
                    }

                    return allLayoutIds.map(layoutId => {
                      const layA = layoutsA.find(l => l.CODIGO_TIPO_LAYOUT === layoutId);
                      const layB = layoutsB.find(l => l.CODIGO_TIPO_LAYOUT === layoutId);
                      const layoutName = layA?.DESCRICAO_TIPO_LAYOUT || layB?.DESCRICAO_TIPO_LAYOUT || `Layout ${layoutId}`;

                      return (
                        <div key={layoutId} className="border border-border">
                          <div className="bg-muted/30 px-3 py-1.5 text-[9px] font-black uppercase border-b border-border tracking-wider text-[var(--primary)]">
                            {layoutName} (ID: {layoutId})
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 p-3 bg-background/30 text-[10px]">
                            {/* Header row */}
                            <div className="font-bold">Métrica / Atributo</div>
                            <div className="text-muted font-bold text-[8px] uppercase">Versão {vA}</div>
                            <div className="text-muted font-bold text-[8px] uppercase">Versão {vB}</div>

                            {/* Row: Quantidade de Campos */}
                            <div className="py-1 border-b border-border/50">Quantidade de Campos</div>
                            <div className="py-1 border-b border-border/50 font-mono">{layA ? layA.QUANTIDADE_CAMPOS : "Não existe"}</div>
                            <div className="py-1 border-b border-border/50 font-mono">
                              {layB ? layB.QUANTIDADE_CAMPOS : "Não existe"}
                              {layA && layB && layA.QUANTIDADE_CAMPOS !== layB.QUANTIDADE_CAMPOS && (
                                <span className={`text-[9px] font-bold ml-1.5 ${layB.QUANTIDADE_CAMPOS > layA.QUANTIDADE_CAMPOS ? "text-emerald-500" : "text-destructive"}`}>
                                  ({layB.QUANTIDADE_CAMPOS > layA.QUANTIDADE_CAMPOS ? `+${layB.QUANTIDADE_CAMPOS - layA.QUANTIDADE_CAMPOS}` : layB.QUANTIDADE_CAMPOS - layA.QUANTIDADE_CAMPOS})
                                </span>
                              )}
                            </div>

                            {/* Row: Quantidade de Regras */}
                            <div className="py-1 border-b border-border/50">Quantidade de Regras</div>
                            <div className="py-1 border-b border-border/50 font-mono">{layA ? layA.QUANTIDADE_REGRAS : "Não existe"}</div>
                            <div className="py-1 border-b border-border/50 font-mono">
                              {layB ? layB.QUANTIDADE_REGRAS : "Não existe"}
                              {layA && layB && layA.QUANTIDADE_REGRAS !== layB.QUANTIDADE_REGRAS && (
                                <span className={`text-[9px] font-bold ml-1.5 ${layB.QUANTIDADE_REGRAS > layA.QUANTIDADE_REGRAS ? "text-emerald-500" : "text-destructive"}`}>
                                  ({layB.QUANTIDADE_REGRAS > layA.QUANTIDADE_REGRAS ? `+${layB.QUANTIDADE_REGRAS - layA.QUANTIDADE_REGRAS}` : layB.QUANTIDADE_REGRAS - layA.QUANTIDADE_REGRAS})
                                </span>
                              )}
                            </div>

                            {/* Row: Cabeçalho */}
                            <div className="py-1 border-b border-border/50">Código Cabeçalho</div>
                            <div className="py-1 border-b border-border/50 font-mono">{layA?.CODIGO_LAYOUT_CABECALHO || "Sem Cabeçalho"}</div>
                            <div className="py-1 border-b border-border/50 font-mono">
                              {layB?.CODIGO_LAYOUT_CABECALHO || "Sem Cabeçalho"}
                              {layA && layB && layA.CODIGO_LAYOUT_CABECALHO !== layB.CODIGO_LAYOUT_CABECALHO && (
                                <span className="text-[9px] text-amber-500 font-bold ml-1.5">(Modificado)</span>
                              )}
                            </div>

                            {/* Row: Rodapé */}
                            <div className="py-1">Código Rodapé</div>
                            <div className="py-1 font-mono">{layA?.CODIGO_LAYOUT_RODAPE || "Sem Rodapé"}</div>
                            <div className="py-1 font-mono">
                              {layB?.CODIGO_LAYOUT_RODAPE || "Sem Rodapé"}
                              {layA && layB && layA.CODIGO_LAYOUT_RODAPE !== layB.CODIGO_LAYOUT_RODAPE && (
                                <span className="text-[9px] text-amber-500 font-bold ml-1.5">(Modificado)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Diff Fields and Rules */}
              {diffLoading ? (
                <div className="flex flex-col items-center justify-center p-8 opacity-50">
                  <Loader2 className="animate-spin text-[var(--primary)] mb-2" size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">Analisando Diferenças de Estrutura...</span>
                </div>
              ) : diffData && (
                <div className="space-y-6">
                  {/* Diff de Campos */}
                  {(() => {
                     const fieldsA = diffData.fieldsA || [];
                     const fieldsB = diffData.fieldsB || [];
                     const mapA = new Map(fieldsA.map((f: any) => [f.CD_CAMPO, f]));
                     const mapB = new Map(fieldsB.map((f: any) => [f.CD_CAMPO, f]));
                     
                     const addedFields = fieldsB.filter((f: any) => !mapA.has(f.CD_CAMPO));
                     const removedFields = fieldsA.filter((f: any) => !mapB.has(f.CD_CAMPO));

                     if (addedFields.length === 0 && removedFields.length === 0) return null;

                     return (
                       <div>
                         <h4 className="text-[10px] font-black text-muted uppercase tracking-wider mb-2">Campos Adicionados / Removidos</h4>
                         <div className="grid grid-cols-2 gap-4">
                           {/* Adicionados */}
                           <div className="border border-emerald-500/20 bg-emerald-500/5 p-3">
                              <h5 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 border-b border-emerald-500/20 pb-1">Novos Campos (+{addedFields.length})</h5>
                              <ul className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                                {addedFields.map((f: any) => (
                                  <li key={f.CD_CAMPO} className="text-[10px] text-emerald-700 font-mono flex flex-col">
                                    <span className="font-bold">{f.NOME_CAMPO || f.IDENTIFICADOR}</span>
                                    <span className="text-[8px] opacity-70">ID: {f.CD_CAMPO}</span>
                                  </li>
                                ))}
                                {addedFields.length === 0 && <span className="text-[9px] text-muted italic">Nenhum</span>}
                              </ul>
                           </div>
                           {/* Removidos */}
                           <div className="border border-destructive/20 bg-destructive/5 p-3">
                              <h5 className="text-[9px] font-black text-destructive uppercase tracking-widest mb-2 border-b border-destructive/20 pb-1">Campos Removidos (-{removedFields.length})</h5>
                              <ul className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                                {removedFields.map((f: any) => (
                                  <li key={f.CD_CAMPO} className="text-[10px] text-destructive font-mono flex flex-col line-through opacity-80">
                                    <span className="font-bold">{f.NOME_CAMPO || f.IDENTIFICADOR}</span>
                                    <span className="text-[8px] opacity-70">ID: {f.CD_CAMPO}</span>
                                  </li>
                                ))}
                                {removedFields.length === 0 && <span className="text-[9px] text-muted italic">Nenhum</span>}
                              </ul>
                           </div>
                         </div>
                       </div>
                     );
                  })()}

                  {/* Diff de Regras */}
                  {(() => {
                     const rulesA = diffData.rulesA || [];
                     const rulesB = diffData.rulesB || [];
                     const mapA = new Map(rulesA.map((r: any) => [r.CD_REGRA, r]));
                     const mapB = new Map(rulesB.map((r: any) => [r.CD_REGRA, r]));
                     
                     const addedRules = rulesB.filter((r: any) => !mapA.has(r.CD_REGRA));
                     const removedRules = rulesA.filter((r: any) => !mapB.has(r.CD_REGRA));

                     if (addedRules.length === 0 && removedRules.length === 0) return null;

                     return (
                       <div>
                         <h4 className="text-[10px] font-black text-muted uppercase tracking-wider mb-2">Regras Dinâmicas Adicionadas / Removidas</h4>
                         <div className="grid grid-cols-2 gap-4">
                           {/* Adicionadas */}
                           <div className="border border-emerald-500/20 bg-emerald-500/5 p-3">
                              <h5 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2 border-b border-emerald-500/20 pb-1">Novas Regras (+{addedRules.length})</h5>
                              <ul className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                                {addedRules.map((r: any) => (
                                  <li key={r.CD_REGRA} className="text-[10px] text-emerald-700 font-mono flex flex-col">
                                    <span className="font-bold">{r.NOME_REGRA}</span>
                                    <span className="text-[8px] opacity-70">ID: {r.CD_REGRA}</span>
                                  </li>
                                ))}
                                {addedRules.length === 0 && <span className="text-[9px] text-muted italic">Nenhuma</span>}
                              </ul>
                           </div>
                           {/* Removidas */}
                           <div className="border border-destructive/20 bg-destructive/5 p-3">
                              <h5 className="text-[9px] font-black text-destructive uppercase tracking-widest mb-2 border-b border-destructive/20 pb-1">Regras Removidas (-{removedRules.length})</h5>
                              <ul className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                                {removedRules.map((r: any) => (
                                  <li key={r.CD_REGRA} className="text-[10px] text-destructive font-mono flex flex-col line-through opacity-80">
                                    <span className="font-bold">{r.NOME_REGRA}</span>
                                    <span className="text-[8px] opacity-70">ID: {r.CD_REGRA}</span>
                                  </li>
                                ))}
                                {removedRules.length === 0 && <span className="text-[9px] text-muted italic">Nenhuma</span>}
                              </ul>
                           </div>
                         </div>
                       </div>
                     );
                  })()}
                </div>
              )}
            </div>
            
            <div className="border-t border-border p-4 flex justify-end bg-muted/20">
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider bg-foreground text-background hover:opacity-90 rounded-none transition-all cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
