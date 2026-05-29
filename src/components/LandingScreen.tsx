import { useEffect, useRef, useState } from 'react'
import { getChartIndex, deleteChart, exportAllCharts, exportSingleChart, importBackup, type ChartMeta } from '../storage'

interface Props {
  onOpen: (id: string) => void
  onCreate: () => void
}

const ACCENT = 'from-indigo-500 to-violet-600'

export function LandingScreen({ onOpen, onCreate }: Props) {
  const [charts, setCharts] = useState<ChartMeta[]>(() => getChartIndex())
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleDelete = (e: React.MouseEvent, chart: ChartMeta) => {
    e.stopPropagation()
    setMenuOpenId(null)
    if (!window.confirm(`Delete "${chart.name}"? This cannot be undone.`)) return
    deleteChart(chart.id)
    setCharts(getChartIndex())
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
    <div className="min-h-screen bg-white flex flex-col">

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
          {charts.length > 0 && (
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 9V2M3.5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M1 9.5v1A1.5 1.5 0 002.5 12h8a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            Import
          </button>
          <button
            onClick={onCreate}
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
          Build clear, navigable org charts. Add people, connect teams, and share your structure with anyone.
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
              onClick={onCreate}
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
                    className="w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none"
                  >
                    ···
                  </button>
                  {menuOpenId === chart.id && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
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
    </div>
  )
}
