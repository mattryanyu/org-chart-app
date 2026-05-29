import type { Node, Edge } from '@xyflow/react'

export interface ChartMeta {
  id: string
  name: string
  updatedAt: number
}

const INDEX_KEY = 'org-charts'
const ACTIVE_KEY = 'org-chart-active'
const LEGACY_KEY = 'org-chart-v1'

export function getChartIndex(): ChartMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    return raw ? (JSON.parse(raw) as ChartMeta[]) : []
  } catch {
    return []
  }
}

function setChartIndex(index: ChartMeta[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index))
}

export function getActiveChartId(): string | null {
  return localStorage.getItem(ACTIVE_KEY)
}

export function persistActiveChartId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id)
}

export function loadChartData(id: string): { nodes: Node[]; edges: Edge[] } | null {
  try {
    const raw = localStorage.getItem(`org-chart-${id}`)
    return raw ? (JSON.parse(raw) as { nodes: Node[]; edges: Edge[] }) : null
  } catch {
    return null
  }
}

export function saveChartData(id: string, nodes: Node[], edges: Edge[]) {
  localStorage.setItem(`org-chart-${id}`, JSON.stringify({ nodes, edges }))
  const index = getChartIndex()
  const chart = index.find((c) => c.id === id)
  if (chart) {
    chart.updatedAt = Date.now()
    setChartIndex(index)
  }
}

export function createChart(name: string): ChartMeta {
  const chart: ChartMeta = { id: crypto.randomUUID(), name, updatedAt: Date.now() }
  const index = getChartIndex()
  index.unshift(chart)
  setChartIndex(index)
  persistActiveChartId(chart.id)
  return chart
}

export function renameChart(id: string, name: string) {
  const index = getChartIndex()
  const chart = index.find((c) => c.id === id)
  if (chart) {
    chart.name = name
    chart.updatedAt = Date.now()
    setChartIndex(index)
  }
}

export function deleteChart(id: string) {
  localStorage.removeItem(`org-chart-${id}`)
  setChartIndex(getChartIndex().filter((c) => c.id !== id))
}

export interface BackupData {
  version: 1
  exportedAt: number
  charts: Array<{ meta: ChartMeta; nodes: Node[]; edges: Edge[] }>
}

export function exportAllCharts(): BackupData {
  const index = getChartIndex()
  return {
    version: 1,
    exportedAt: Date.now(),
    charts: index.map((meta) => {
      const data = loadChartData(meta.id)
      return { meta, nodes: data?.nodes ?? [], edges: data?.edges ?? [] }
    }),
  }
}

export function exportSingleChart(id: string): BackupData | null {
  const index = getChartIndex()
  const meta = index.find((c) => c.id === id)
  if (!meta) return null
  const data = loadChartData(id)
  return {
    version: 1,
    exportedAt: Date.now(),
    charts: [{ meta, nodes: data?.nodes ?? [], edges: data?.edges ?? [] }],
  }
}

export function resetAllData(): void {
  const index = getChartIndex()
  for (const chart of index) {
    localStorage.removeItem(`org-chart-${chart.id}`)
  }
  localStorage.removeItem(INDEX_KEY)
  localStorage.removeItem(ACTIVE_KEY)
}

export function importBackup(backup: BackupData): void {
  const existingIndex = getChartIndex()
  const existingIds = new Set(existingIndex.map((c) => c.id))
  const newMetas: ChartMeta[] = []
  for (const { meta, nodes, edges } of backup.charts) {
    if (!existingIds.has(meta.id)) {
      newMetas.push(meta)
      localStorage.setItem(`org-chart-${meta.id}`, JSON.stringify({ nodes, edges }))
    }
  }
  if (newMetas.length > 0) {
    setChartIndex([...newMetas, ...existingIndex])
  }
}

export function initStorage(
  defaultNodes: Node[],
  defaultEdges: Edge[],
): { chart: ChartMeta; nodes: Node[]; edges: Edge[] } {
  const index = getChartIndex()
  const activeId = getActiveChartId()

  if (index.length > 0) {
    const chart = index.find((c) => c.id === activeId) ?? index[0]
    persistActiveChartId(chart.id)
    const data = loadChartData(chart.id)
    return { chart, nodes: data?.nodes ?? defaultNodes, edges: data?.edges ?? defaultEdges }
  }

  // Migrate legacy single-chart data if present
  let nodes = defaultNodes
  let edges = defaultEdges
  try {
    const legacyRaw = localStorage.getItem(LEGACY_KEY)
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as { nodes?: Node[]; edges?: Edge[] }
      if (legacy.nodes) nodes = legacy.nodes
      if (legacy.edges) edges = legacy.edges
      localStorage.removeItem(LEGACY_KEY)
    }
  } catch { /* ignore */ }

  const chart = createChart('Wizarding World Inc')
  saveChartData(chart.id, nodes, edges)
  return { chart, nodes, edges }
}
