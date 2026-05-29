import type { Node, Edge } from '@xyflow/react'

export function getDescendantIds(nodeId: string, edges: Edge[]): Set<string> {
  const result = new Set<string>()
  const queue = [nodeId]
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const edge of edges) {
      if (edge.source === id && !result.has(edge.target)) {
        result.add(edge.target)
        queue.push(edge.target)
      }
    }
  }
  return result
}

export function getAncestorIds(nodeId: string, edges: Edge[]): Set<string> {
  const result = new Set<string>()
  const queue = [nodeId]
  while (queue.length > 0) {
    const id = queue.shift()!
    for (const edge of edges) {
      if (edge.target === id && !result.has(edge.source)) {
        result.add(edge.source)
        queue.push(edge.source)
      }
    }
  }
  return result
}

export function applyVisibility(nodes: Node[], edges: Edge[]): Node[] {
  const hiddenIds = new Set<string>()
  for (const node of nodes) {
    if (node.data.collapsed) {
      getDescendantIds(node.id, edges).forEach((id) => hiddenIds.add(id))
    }
    if (node.data.rootPinned) {
      const ancestors = getAncestorIds(node.id, edges)
      const ownSubtree = getDescendantIds(node.id, edges)
      ownSubtree.add(node.id)
      ancestors.forEach((id) => {
        hiddenIds.add(id)
        getDescendantIds(id, edges).forEach((desc) => {
          if (!ownSubtree.has(desc)) hiddenIds.add(desc)
        })
      })
    }
  }
  return nodes.map((n) => ({ ...n, hidden: hiddenIds.has(n.id) }))
}

function getNodeDepths(nodes: Node[], edges: Edge[]): Map<string, number> {
  const depths = new Map<string, number>()
  const hasParent = new Set(edges.map((e) => e.target))
  const queue: { id: string; depth: number }[] = nodes
    .filter((n) => !hasParent.has(n.id))
    .map((n) => ({ id: n.id, depth: 0 }))
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!
    if (depths.has(id)) continue
    depths.set(id, depth)
    edges
      .filter((e) => e.source === id)
      .forEach((e) => queue.push({ id: e.target, depth: depth + 1 }))
  }
  return depths
}

export function autoCollapseDeep(nodes: Node[], edges: Edge[]): Node[] {
  const depths = getNodeDepths(nodes, edges)
  const hasChildren = new Set(edges.map((e) => e.source))
  return nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      collapsed:
        (depths.get(n.id) ?? 0) >= 2 && hasChildren.has(n.id)
          ? true
          : (n.data.collapsed ?? false),
    },
  }))
}
