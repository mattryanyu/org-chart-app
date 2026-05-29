import { useEffect, useRef, useState } from 'react'
import { getChartIndex, deleteChart, renameChart, exportAllCharts, exportSingleChart, importBackup, resetAllData, initStorage, type ChartMeta } from '../storage'
import { initialNodes, initialEdges } from '../initialData'

interface Props {
  onOpen: (id: string) => void
  onCreate: (name: string) => void
}

const ACCENT = 'from-indigo-500 to-violet-600'

export function LandingScreen({ onOpen, onCreate }: Props) {
  const [charts, setCharts] = useState<ChartMeta[]>(() => getChartIndex())
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [showNewChartModal, setShowNewChartModal] = useState(false)
  const [newChartName, setNewChartName] = useState('')

  const DEFAULT_CHART_NAME = 'New Chart'

  const openNewChartModal = () => {
    setNewChartName(DEFAULT_CHART_NAME)
    setShowNewChartModal(true)
  }

  const handleCreateChart = (name: string) => {
    setShowNewChartModal(false)
    onCreate(name.trim() || DEFAULT_CHART_NAME)
  }
  const [renamingChart, setRenamingChart] = useState<ChartMeta | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingChart, setDeletingChart] = useState<ChartMeta | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const desktopMenuRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  // Lock body scroll when a text-input modal is open to prevent iOS Safari
  // from scrolling the background page when the keyboard appears, which
  // leaves the viewport offset after the modal closes.
  useEffect(() => {
    const isOpen = !!(renamingChart || showNewChartModal)
    if (!isOpen) return
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
  }, [renamingChart, showNewChartModal])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        setMenuOpenId(null)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as HTMLElement)) {
        setMobileMenuOpen(false)
      }
      if (desktopMenuRef.current && !desktopMenuRef.current.contains(e.target as HTMLElement)) {
        setDesktopMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDelete = (e: React.MouseEvent, chart: ChartMeta) => {
    e.stopPropagation()
    setMenuOpenId(null)
    setDeletingChart(chart)
  }

  const confirmDelete = () => {
    if (!deletingChart) return
    deleteChart(deletingChart.id)
    setCharts(getChartIndex())
    setDeletingChart(null)
  }

  const downloadJson = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAll = () => {
    const date = new Date().toISOString().slice(0, 10)
    downloadJson(exportAllCharts(), `orgchart-backup-${date}.json`)
  }

  const handleExportChart = (e: React.MouseEvent, chart: ChartMeta) => {
    e.stopPropagation()
    setMenuOpenId(null)
    const backup = exportSingleChart(chart.id)
    if (backup) downloadJson(backup, `${chart.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`)
  }

  const handleRenameSubmit = () => {
    if (!renamingChart || !renameValue.trim()) return
    renameChart(renamingChart.id, renameValue.trim())
    setCharts(getChartIndex())
    setRenamingChart(null)
  }

  const handleReset = () => {
    resetAllData()
    initStorage(initialNodes, initialEdges)
    setCharts(getChartIndex())
    setShowResetModal(false)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target?.result as string)
        if (backup.version !== 1 || !Array.isArray(backup.charts)) {
          alert('This file doesn\'t look like a valid OrgChart backup.')
          return
        }
        importBackup(backup)
        setCharts(getChartIndex())
      } catch {
        alert('Could not read the file. Make sure it\'s a valid OrgChart backup.')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col pb-[env(safe-area-inset-bottom)]">

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
              <rect x="5" y="1" width="6" height="4" rx="1" fill="currentColor" opacity="0.9"/>
              <rect x="1" y="10" width="5" height="4" rx="1" fill="currentColor"/>
              <rect x="10" y="10" width="5" height="4" rx="1" fill="currentColor"/>
              <path d="M8 5v2.5M4 10V8.5H12V10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-base tracking-tight">OrgChart</span>
        </div>
        <div className="flex items-center gap-2">
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

          {/* Desktop: Export + Import buttons */}
          {charts.length > 0 && (
            <button
              onClick={handleExportAll}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v7M3.5 5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 9.5v1A1.5 1.5 0 002.5 12h8a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Export
            </button>
          )}
          <button
            onClick={() => importRef.current?.click()}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 9V2M3.5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 9.5v1A1.5 1.5 0 002.5 12h8a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Import
          </button>

          {/* Desktop: "..." overflow menu (Reset only) */}
          <div ref={desktopMenuRef} className="relative hidden sm:block">
            <button
              onClick={() => setDesktopMenuOpen((o) => !o)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors text-lg leading-none"
            >
              ···
            </button>
            {desktopMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { setDesktopMenuOpen(false); setShowResetModal(true) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Mobile: "..." overflow menu */}
          <div ref={mobileMenuRef} className="relative sm:hidden">
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors text-lg leading-none"
            >
              ···
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                {charts.length > 0 && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleExportAll() }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M6.5 1v7M3.5 5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1 9.5v1A1.5 1.5 0 002.5 12h8a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    Export
                  </button>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); importRef.current?.click() }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 9V2M3.5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 9.5v1A1.5 1.5 0 002.5 12h8a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Import
                </button>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { setMobileMenuOpen(false); setShowResetModal(true) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Reset
                </button>
              </div>
            )}
          </div>

          <button
            onClick={openNewChartModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <span className="text-base leading-none">+</span> New Chart
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl w-full mx-auto px-8 pt-20 pb-14">
        <h1 className="text-6xl font-extrabold tracking-tight leading-[1.08] text-gray-950">
          Your organization,<br />
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            visualized.
          </span>
        </h1>
        <p className="mt-5 text-lg text-gray-500 max-w-lg leading-relaxed">
          Build clean, easy-to-use org charts. Add people, connect teams, and share your structure with anyone.
        </p>
      </div>

      {/* Charts */}
      <div className="max-w-5xl w-full mx-auto px-8 pb-24">
        {charts.length > 0 && (
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">
            Your charts
          </p>
        )}

        {charts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 flex items-center justify-center shadow-inner">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="12" y="2" width="12" height="9" rx="2.5" fill="#6366f1" opacity="0.8"/>
                <rect x="2" y="24" width="11" height="9" rx="2.5" fill="#8b5cf6"/>
                <rect x="23" y="24" width="11" height="9" rx="2.5" fill="#8b5cf6"/>
                <path d="M18 11v5.5M7.5 24v-3.5H28.5V24" stroke="#6366f1" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">No charts yet</p>
              <p className="text-sm text-gray-500 mt-1">Create your first org chart to get started.</p>
            </div>
            <button
              onClick={openNewChartModal}
              className="mt-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Create your first chart
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {charts.map((chart) => (
              <div
                key={chart.id}
                onClick={() => onOpen(chart.id)}
                className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-6 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
              >
                {/* ··· menu */}
                <div
                  ref={menuOpenId === chart.id ? menuRef : null}
                  className="absolute top-4 right-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === chart.id ? null : chart.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
                  >
                    ···
                  </button>
                  {menuOpenId === chart.id && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); setRenamingChart(chart); setRenameValue(chart.name) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Rename chart
                      </button>
                      <button
                        onClick={(e) => handleExportChart(e, chart)}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Export chart
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, chart)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Delete chart
                      </button>
                    </div>
                  )}
                </div>

                {/* Icon badge */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ACCENT} flex items-center justify-center text-white font-bold text-xl shadow-sm mb-4`}>
                  {chart.name.charAt(0).toUpperCase()}
                </div>

                <p className="font-semibold text-gray-900 text-base leading-tight truncate pr-6">
                  {chart.name}
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  Updated {new Date(chart.updatedAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Footer */}
      <footer className="mt-auto py-5 flex items-center justify-center border-t border-gray-100">
        <a
          href="https://mattryanyu.github.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <svg width="20" height="20" viewBox="1869 468 1026 1026" xmlns="http://www.w3.org/2000/svg" overflow="hidden">
            <path d="M2704.76 979.931C2701.56 979.931 2697.28 979.931 2694.07 979.931 2694.07 979.931 2694.07 979.931 2694.07 979.931 2694.07 927.562 2668.43 879.469 2626.74 849.544 2583.99 819.619 2529.49 812.137 2480.33 829.237 2439.71 750.15 2349.94 709.537 2264.44 729.844 2178.94 750.15 2116.95 827.1 2116.95 915.806 2116.95 915.806 2116.95 916.875 2116.95 917.944 2058.17 908.325 1999.39 932.906 1963.05 979.931 1927.78 1028.02 1921.37 1091.08 1945.95 1144.52 1971.6 1197.96 2025.04 1233.22 2083.82 1236.43L2083.82 1237.5 2703.69 1237.5C2774.23 1237.5 2831.94 1179.79 2831.94 1109.25 2831.94 1038.71 2775.3 979.931 2704.76 979.931Z" fill="#FFFFFF" stroke="#222222" strokeWidth="18"/>
            <path d="M2108.35 1106.52C2113.03 1073.22 2162.79 1048.45 2219.48 1051.2 2272.89 1053.8 2314 1080.02 2314 1111.5" stroke="#000000" strokeWidth="66.4583" strokeLinecap="round" strokeMiterlimit="8" fill="none"/>
            <path d="M2439.35 1106.5C2444.08 1073.2 2494.09 1048.44 2551.06 1051.21 2604.72 1053.81 2646 1080.03 2646 1111.5" stroke="#000000" strokeWidth="66.4583" strokeLinecap="round" strokeMiterlimit="8" fill="none"/>
          </svg>
          <span className="text-sm text-gray-600">Matt Yu</span>
        </a>
      </footer>

      {/* Delete chart modal */}
      {deletingChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">Delete chart?</h2>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              <span className="font-medium text-gray-700">"{deletingChart.name}"</span> will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setDeletingChart(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New chart modal */}
      {showNewChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">Name your chart</h2>
            <input
              autoFocus
              type="text"
              value={newChartName}
              onChange={(e) => setNewChartName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateChart(newChartName); if (e.key === 'Escape') setShowNewChartModal(false) }}
              className="mt-4 w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowNewChartModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
<button
                onClick={() => handleCreateChart(newChartName)}
                disabled={!newChartName.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {renamingChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">Rename chart</h2>
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenamingChart(null) }}
              className="mt-4 w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => setRenamingChart(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                disabled={!renameValue.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirmation modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">Reset all data?</h2>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              All org charts and data will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
