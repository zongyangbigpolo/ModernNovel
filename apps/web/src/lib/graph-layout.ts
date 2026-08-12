import dagre from "@dagrejs/dagre"

/**
 * Tree-style auto-layout for the story canvas. Runs dagre top-to-bottom over
 * the given nodes and edges and returns new positions keyed by node id.
 * Pure — callers apply the positions to React Flow state and persist them.
 */

// Approximate rendered card size; StoryNode is min-w-[200px] with header + body
const NODE_WIDTH = 220
const NODE_HEIGHT = 120

export interface LayoutNode {
  id: string
}

export interface LayoutEdge {
  source: string
  target: string
}

export function computeTreeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[]
): Map<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 90 })
  graph.setDefaultEdgeLabel(() => ({}))

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target)
  }

  dagre.layout(graph)

  const positions = new Map<string, { x: number; y: number }>()
  for (const node of nodes) {
    const placed = graph.node(node.id)
    if (placed) {
      // dagre positions are node centers; React Flow uses top-left corners
      positions.set(node.id, {
        x: Math.round(placed.x - NODE_WIDTH / 2),
        y: Math.round(placed.y - NODE_HEIGHT / 2),
      })
    }
  }
  return positions
}
