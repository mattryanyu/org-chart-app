import * as dagre from '@dagrejs/dagre'
import type { Node, Edge } from '@xyflow/react'

const NODE_WIDTH = 192
const NODE_HEIGHT = 200

export function getAutoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const visible = nodes.filter((n) => !n.hidden)
  const visibleIds = new Set(visible.map((n) => n.id))
  const visibleEdges = edges.filter(
    (e) => visibleIds.has(e.source) && visibleIds.has(e.target),
  )

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 60 })

  visible.forEach((n) => {
    const w = n.measured?.width ?? NODE_WIDTH
    const h = n.measured?.height ?? NODE_HEIGHT
    g.setNode(n.id, { width: w, height: h })
  })
  visibleEdges.forEach((e) => g.setEdge(e.source, e.target))

  dagre.layout(g)

  // Top-align nodes within each rank so all incoming edge handles
  // share the same y, keeping horizontal edge segments consistent.
  // Dagre centers each node at the same rank y; we shift each node
  // up by half the tallest height in that rank instead.
  const rankMaxH = new Map<number, number>()
  visible.forEach((n) => {
    const pos = g.node(n.id)
    if (!pos) return
    const h = n.measured?.height ?? NODE_HEIGHT
    const ry = Math.round(pos.y)
    rankMaxH.set(ry, Math.max(rankMaxH.get(ry) ?? 0, h))
  })

  return nodes.map((n) => {
    if (n.hidden) return n
    const pos = g.node(n.id)
    if (!pos) return n
    const w = n.measured?.width ?? NODE_WIDTH
    const topY = pos.y - (rankMaxH.get(Math.round(pos.y)) ?? NODE_HEIGHT) / 2
    return { ...n, position: { x: pos.x - w / 2, y: topY } }
  })
}
