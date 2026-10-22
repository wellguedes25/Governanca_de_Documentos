import dagre from '@dagrejs/dagre';
import { Node, Edge } from '@xyflow/react';

export function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'LR' | 'TB' = 'LR'
): { nodes: Node[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 70,
    ranksep: 160,
    align: 'DL',
    marginx: 40,
    marginy: 40
  });

  nodes.forEach((node) => {
    const fieldsCount = (node.data as any)?.fields?.length || 0;
    // Altura proporcional à quantidade de campos visíveis
    const calculatedHeight = 140 + Math.min(fieldsCount, 15) * 50;
    dagreGraph.setNode(node.id, {
      width: 380,
      height: Math.max(180, calculatedHeight)
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 190,
        y: nodeWithPosition.y - nodeWithPosition.height / 2
      }
    };
  });

  return { nodes: layoutedNodes, edges };
}

