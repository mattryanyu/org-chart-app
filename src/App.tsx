import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react'
import { DropTargetContext } from './DragContext'
import { LandingScreen } from './components/LandingScreen'
import { ListView } from './components/ListView'
import { TreeView } from './components/TreeView'
import { OrgNode } from './components/OrgNode'
import { initialNodes, initialEdges } from './initialData'
import { getAutoLayout } from './layout'
import {
  initStorage,
  saveChartData,
  loadChartData,
  createChart,
  renameChart,
  getChartIndex,
  persistActiveChartId,
} from './storage'
import type { OrgNodeData } from './types'
import { applyVisibility, autoCollapseDeep } from './utils'

const nodeTypes = { orgNode: OrgNode }

function makeNode(partial?: Partial<OrgNodeData>): Node<OrgNodeData> {
  return {
    id: crypto.randomUUID(),
    type: 'orgNode',
    position: { x: Math.random() * 300 + 100, y: Math.random() * 200 + 100 },
    data: { name: 'New Person', title: '', location: '', department: '', ...partial },
  }
}

function stripInternals(nodes: Node[], edges: Edge[]) {
  return {
    nodes: nodes.map(({ id, type, position, data }) => ({ id, type, position, data })),
    edges: edges.map(({ id, source, target, type }) => ({ id, source, target, type })),
  }
}

const init = initStorage(initialNodes, initialEdges)
const needsAutoCollapse = init.nodes.every((n) => (n.data as OrgNodeData).collapsed === undefined)
const rawInitNodes = needsAutoCollapse
  ? autoCollapseDeep(init.nodes as Node[], init.edges)
  : (init.nodes as Node[])
const initNodes = applyVisibility(rawInitNodes, init.edges)

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(init.edges)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const { fitView, getIntersectingNodes } = useReactFlow()

  const [view, setView] = useState<'landing' | 'editor'>('landing')
  const [activeChartId, setActiveChartId] = useState(init.chart.id)
  const [chartName, setChartName] = useState(init.chart.name)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [editorView, setEditorView] = useState<'diagram' | 'list' | 'tree'>('diagram')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [showDeletePersonModal, setShowDeletePersonModal] = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [showMobileStats, setShowMobileStats] = useState(false)
  const deleteMenuRef = useRef<HTMLDivElement>(null)

  // Close delete menu on outside click or when selection changes
  useEffect(() => { setShowDeleteMenu(false) }, [selectedNode])

  // Delete hotkey
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (selectedNode) setShowDeletePersonModal(true)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedNode])
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(e.target as HTMLElement)) {
        setShowDeleteMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Auto-save
  useEffect(() => {
    const { nodes: ns, edges: es } = stripInternals(nodes, edges)
    saveChartData(activeChartId, ns, es)
  }, [nodes, edges, activeChartId])

  useEffect(() => {
    if (!showRenameModal) return
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [showRenameModal])


  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep' }, eds)),
    [setEdges],
  )

  const onNodeDrag = useCallback((_: React.MouseEvent, draggedNode: Node) => {
    const hits = getIntersectingNodes({ id: draggedNode.id }).filter(
      (n) => n.id !== draggedNode.id && !n.hidden
    )
    setDropTargetId(hits.length > 0 ? hits[0].id : null)
  }, [getIntersectingNodes])

  const onNodeDragStop = useCallback((_: React.MouseEvent, draggedNode: Node) => {
    const hits = getIntersectingNodes({ id: draggedNode.id }).filter(
      (n) => n.id !== draggedNode.id && !n.hidden
    )
    setDropTargetId(null)
    if (hits.length === 0) return
    const newParentId = hits[0].id
    setEdges((eds) => [
      ...eds.filter((e) => e.target !== draggedNode.id),
      { id: `e${newParentId}-${draggedNode.id}`, source: newParentId, target: draggedNode.id, type: 'smoothstep' },
    ])
  }, [getIntersectingNodes, setEdges])

  const edgesRef = useRef(edges)
  edgesRef.current = edges
  const fitViewRef = useRef(fitView)
  fitViewRef.current = fitView

  // Recompute hidden flags whenever any node's collapsed state changes
  const collapsedKey = useMemo(
    () => nodes.map((n) => `${n.id}:${String(n.data.collapsed)}:${String(n.data.rootPinned)}`).join(','),
    [nodes],
  )
  useEffect(() => {
    setNodes((nds) => applyVisibility(nds, edgesRef.current))
  }, [collapsedKey, setNodes])

  // Re-layout whenever visible structure changes
  const structureKey = useMemo(() => {
    const visible = nodes.filter((n) => !n.hidden)
    const visibleIds = new Set(visible.map((n) => n.id))
    return (
      visible.map((n) => n.id).join(',') + '|' +
      edges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => `${e.source}>${e.target}`)
        .join(',')
    )
  }, [nodes, edges])

  useEffect(() => {
    if (nodes.length === 0) return
    setNodes((nds) => getAutoLayout(nds, edgesRef.current))
    setTimeout(() => fitViewRef.current({ duration: 400 }), 50)
  }, [structureKey, setNodes])

  const addPerson = () => {
    const node = makeNode()
    setNodes((nds) => [...nds, node])
    setSelectedNode(node.id)
  }

  const addDirectReport = () => {
    if (!selectedNode) return
    const node = makeNode()
    setNodes((nds) => [...nds, node])
    setEdges((eds) => [
      ...eds,
      { id: `e${selectedNode}-${node.id}`, source: selectedNode, target: node.id, type: 'smoothstep' },
    ])
    setSelectedNode(node.id)
  }

  const handleNewChart = (name: string) => {
    const chart = createChart(name)
    setActiveChartId(chart.id)
    setChartName(chart.name)
    setNodes([])
    setEdges([])
    setSelectedNode(null)
  }

  const handleSwitchChart = (id: string) => {
    if (id === activeChartId) return
    persistActiveChartId(id)
    const data = loadChartData(id)
    const chart = getChartIndex().find((c) => c.id === id)!
    setActiveChartId(id)
    setChartName(chart.name)
    const loadedNodes = (data?.nodes ?? []) as Node[]
    const loadedEdges = (data?.edges ?? []) as Edge[]
    const needsCollapse = loadedNodes.every((n) => (n.data as OrgNodeData).collapsed === undefined)
    const withCollapse = needsCollapse ? autoCollapseDeep(loadedNodes, loadedEdges) : loadedNodes
    const visible = applyVisibility(withCollapse, loadedEdges)
    setNodes(getAutoLayout(visible, loadedEdges))
    setEdges(loadedEdges)
    setSelectedNode(null)
    setTimeout(() => fitViewRef.current({ duration: 300 }), 50)
  }

  const handleRename = (name: string) => {
    const trimmed = name.trim() || 'Untitled'
    setChartName(trimmed)
    renameChart(activeChartId, trimmed)
  }

  const selectedNodeData = nodes.find((n) => n.id === selectedNode)?.data

  const updateSelectedNode = (field: string, value: string) => {
    if (!selectedNode) return
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode ? { ...n, data: { ...n.data, [field]: value } } : n,
      ),
    )
  }

  if (view === 'landing') {
    return (
      <LandingScreen
        onOpen={(id) => { handleSwitchChart(id); setView('editor') }}
        onCreate={(name) => { handleNewChart(name); setView('editor') }}
      />
    )
  }

  return (
    <DropTargetContext.Provider value={dropTargetId}>
    <div className="flex flex-col h-[100dvh] w-full overflow-x-hidden bg-gray-50 pb-[env(safe-area-inset-bottom)]">

      {/* Top toolbar — always visible */}
      <div className="shrink-0 flex items-center px-4 py-2 bg-white border-b border-gray-200 shadow-sm">

        {/* Left zone */}
        <div className="flex-1 flex items-center gap-1">
          <div className="flex rounded-lg border border-gray-200 bg-white shadow-sm divide-x divide-gray-200">
            {([
              { id: 'diagram', label: 'Diagram view', icon: (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="5.5" y="1" width="4" height="3" rx="0.8" fill="currentColor"/>
                  <rect x="1" y="11" width="4" height="3" rx="0.8" fill="currentColor"/>
                  <rect x="10" y="11" width="4" height="3" rx="0.8" fill="currentColor"/>
                  <path d="M7.5 4V6.5M3 11V9.5H12V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              )},
              { id: 'list', label: 'List view', icon: (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="1" y="2" width="13" height="2" rx="0.8" fill="currentColor" opacity="0.35"/>
                  <circle cx="3" cy="8" r="1.2" fill="currentColor"/>
                  <rect x="6" y="7" width="8" height="2" rx="0.7" fill="currentColor"/>
                  <circle cx="3" cy="12.5" r="1.2" fill="currentColor"/>
                  <rect x="6" y="11.5" width="8" height="2" rx="0.7" fill="currentColor"/>
                </svg>
              )},
              { id: 'tree', label: 'Tree view', icon: (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <rect x="4" y="1" width="7" height="5" rx="1" fill="currentColor"/>
                  <rect x="1" y="10" width="5" height="4" rx="1" fill="currentColor"/>
                  <rect x="9" y="10" width="5" height="4" rx="1" fill="currentColor"/>
                  <path d="M7.5 6v2M3.5 10V9H11.5V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              )},
            ] as const).map(({ id, label, icon }) => (
              <div key={id} className="relative group/tip">
                <button
                  onClick={() => setEditorView(id)}
                  aria-label={label}
                  className={`w-9 h-9 flex items-center justify-center transition-colors ${id === 'diagram' ? 'rounded-l-lg' : id === 'tree' ? 'rounded-r-lg' : ''} ${editorView === id ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                >
                  {icon}
                </button>
                <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center zone — chart name */}
        <div className="flex items-center">
          <button
            onClick={() => { setRenameValue(chartName); setShowRenameModal(true) }}
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-800 max-w-xs truncate">{chartName}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <path d="M8.5 1.5l2 2-6 6H2.5v-2l6-6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
              <path d="M7 3l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Right zone */}
        <div className="flex-1 flex items-center justify-end">
          <div className="relative group/tip">
            <button
              onClick={() => setView('landing')}
              aria-label="Close chart"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="pointer-events-none absolute top-full right-0 mt-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
              Close chart
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
      {editorView === 'diagram' ? <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => { setSelectedNode(node.id); setShowMobileStats(false) }}
          onPaneClick={() => setSelectedNode(null)}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />

          {/* Mobile stats pill */}
          {!selectedNode && (
            <Panel position="bottom-right" className="sm:hidden mb-2 mr-2">
              <button
                onClick={() => setShowMobileStats(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-full shadow-md text-sm font-medium text-gray-700"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M1 12c0-2.2 1.8-4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M9 7.5v3M7.5 9h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {nodes.length} people
              </button>
            </Panel>
          )}

          {/* Node tools toolbar */}
          <Panel position="top-left" className="flex gap-1">
            {[
              {
                label: 'Add person',
                onClick: addPerson,
                icon: (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M1 14c0-2.76 2.24-5 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M12 8v5M9.5 10.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                ),
              },
              {
                label: 'Auto layout',
                onClick: () => {
                  setNodes((nds) => getAutoLayout(nds, edgesRef.current))
                  setTimeout(() => fitViewRef.current({ duration: 400 }), 50)
                },
                icon: (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M2 13L8.5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    <path d="M10.5 2.5L11 4 12.5 4.5 11 5 10.5 6.5 10 5 8.5 4.5 10 4Z" fill="currentColor"/>
                    <path d="M5 1.5l.3.9.9.3-.9.3L5 4l-.3-.9-.9-.3.9-.3Z" fill="currentColor" opacity="0.7"/>
                    <path d="M13.5 9l.25.75.75.25-.75.25L13.5 11l-.25-.75-.75-.25.75-.25Z" fill="currentColor" opacity="0.7"/>
                  </svg>
                ),
              },
            ].map(({ label, onClick, icon }) => (
              <div key={label} className="relative group/tip">
                <button
                  onClick={onClick}
                  aria-label={label}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  {icon}
                </button>
                <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity z-[100]">
                  {label}
                </span>
              </div>
            ))}
          </Panel>
        </ReactFlow>
      </div> : editorView === 'list' ? (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <ListView
            nodes={nodes}
            onUpdate={(id, field, value) =>
              setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n))
            }
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <TreeView nodes={nodes} edges={edges} />
        </div>
      )}

      {editorView === 'diagram' && !selectedNode && (() => {
        const byLocation = nodes.reduce<Record<string, number>>((acc, n) => {
          const loc = (n.data.location as string) || '—'
          acc[loc] = (acc[loc] ?? 0) + 1
          return acc
        }, {})
        const locationRows = Object.entries(byLocation).sort((a, b) => b[1] - a[1])

        const byDepartment = nodes.reduce<Record<string, number>>((acc, n) => {
          const dept = (n.data.department as string) || '—'
          acc[dept] = (acc[dept] ?? 0) + 1
          return acc
        }, {})
        const departmentRows = Object.entries(byDepartment).sort((a, b) => b[1] - a[1])

        const renderRows = (rows: [string, number][], barColor: string) => rows.map(([label, count]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 truncate">{label}</span>
            <div className="flex items-center gap-2 ml-2 shrink-0">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full`}
                  style={{ width: `${(count / nodes.length) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-700 w-4 text-right">{count}</span>
            </div>
          </div>
        ))

        const statsContent = (
          <>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Total</p>
              <p className="text-3xl font-bold text-gray-800">{nodes.length}
                <span className="text-sm font-normal text-gray-400 ml-2">people</span>
              </p>
            </div>
            <div className="w-full h-px bg-gray-100" />
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">By Location</p>
              <div className="flex flex-col gap-2">
                {renderRows(locationRows, 'bg-blue-400')}
              </div>
            </div>
            <div className="w-full h-px bg-gray-100" />
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">By Department</p>
              <div className="flex flex-col gap-2">
                {renderRows(departmentRows, 'bg-violet-400')}
              </div>
            </div>
          </>
        )

        return (
          <>
            {/* Desktop: right panel */}
            <div className="hidden sm:flex w-72 bg-white border-l border-gray-200 p-5 flex-col gap-5 shadow-lg overflow-y-auto">
              {statsContent}
            </div>

            {/* Mobile: bottom sheet */}
            {showMobileStats && (
              <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
                <div className="absolute inset-0 bg-black/30" onClick={() => setShowMobileStats(false)} />
                <div className="relative bg-white rounded-t-2xl shadow-2xl p-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">Stats</p>
                    <button
                      onClick={() => setShowMobileStats(false)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                  {statsContent}
                </div>
              </div>
            )}
          </>
        )
      })()}

      {editorView === 'diagram' && selectedNode && selectedNodeData && (
        <div className="w-72 bg-white border-l border-gray-200 p-5 flex flex-col gap-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-lg">Edit Person</h2>
            <div ref={deleteMenuRef} className="relative">
              <button
                onClick={() => setShowDeleteMenu((v) => !v)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-base leading-none"
              >
                ···
              </button>
              {showDeleteMenu && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                  <button
                    onClick={() => { setShowDeleteMenu(false); setShowDeletePersonModal(true) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    Delete person
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {selectedNodeData.avatarUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={selectedNodeData.avatarUrl as string}
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                />
                <button
                  onClick={() => {
                    if (window.confirm('Remove this picture? This cannot be undone.')) {
                      updateSelectedNode('avatarUrl', '')
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {String(selectedNodeData.name).split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <p className="text-sm text-gray-400 italic">Drop an image onto the card to set a picture.</p>
              </div>
            )}
          </div>

          {[
            { label: 'Name', field: 'name' },
            { label: 'Title', field: 'title' },
            { label: 'Location', field: 'location' },
            { label: 'Department', field: 'department' },
          ].map(({ label, field }) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {label}
              </label>
              <input
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={(selectedNodeData as Record<string, string>)[field] ?? ''}
                onChange={(e) => updateSelectedNode(field, e.target.value)}
              />
            </div>
          ))}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              LinkedIn
              {(selectedNodeData as Record<string, string>).linkedIn && (
                <a
                  href={(selectedNodeData as Record<string, string>).linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[#0A66C2] hover:opacity-70 transition-opacity"
                  aria-label="Open LinkedIn profile"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              )}
            </label>
            <input
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://linkedin.com/in/…"
              value={(selectedNodeData as Record<string, string>).linkedIn ?? ''}
              onChange={(e) => updateSelectedNode('linkedIn', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</label>
            <textarea
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={5}
              placeholder="Add notes about this person…"
              value={(selectedNodeData as Record<string, string>).notes ?? ''}
              onChange={(e) => updateSelectedNode('notes', e.target.value)}
            />
          </div>

          <button
            onClick={addDirectReport}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            + Add Direct Report
          </button>

        </div>
      )}
      </div>
    </div>

    {/* Delete person modal */}
    {showDeletePersonModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={() => setShowDeletePersonModal(false)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-gray-900">Delete person</h2>
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{String(selectedNodeData?.name ?? '')}</span> will be permanently removed from this chart.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDeletePersonModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setNodes((nds) => nds.filter((n) => n.id !== selectedNode))
                setEdges((eds) => eds.filter((e) => e.source !== selectedNode && e.target !== selectedNode))
                setSelectedNode(null)
                setShowDeletePersonModal(false)
              }}
              className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Rename modal */}
    {showRenameModal && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={() => setShowRenameModal(false)}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-base font-semibold text-gray-900">Rename chart</h2>
          <input
            autoFocus
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { handleRename(renameValue); setShowRenameModal(false) }
              if (e.key === 'Escape') setShowRenameModal(false)
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowRenameModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { handleRename(renameValue); setShowRenameModal(false) }}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Rename
            </button>
          </div>
        </div>
      </div>
    )}
    </DropTargetContext.Provider>
  )
}
