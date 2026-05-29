import { useEffect, useRef, useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { OrgNodeData } from '../types'

interface Props {
  nodes: Node[]
  edges: Edge[]
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function reportCount(nodeId: string, edges: Edge[]): number {
  return edges.filter((e) => e.source === nodeId).length
}

function getAncestorChain(id: string, nodes: Node[], edges: Edge[]): Node[] {
  const chain: Node[] = []
  let cur = id
  while (true) {
    const edge = edges.find((e) => e.target === cur)
    if (!edge) break
    const parent = nodes.find((n) => n.id === edge.source)
    if (!parent) break
    chain.unshift(parent)
    cur = edge.source
  }
  return chain
}

function Avatar({ d, size }: { d: OrgNodeData; size: string }) {
  return d.avatarUrl ? (
    <img src={d.avatarUrl} alt={d.name} className={`${size} rounded-full object-cover border border-gray-200 shrink-0 bg-gray-200`} />
  ) : (
    <div className={`${size} rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials(d.name)}
    </div>
  )
}

export function TreeView({ nodes, edges }: Props) {
  const reportsRef = useRef<HTMLDivElement>(null)
  const hoveringReports = useRef(false)

  const [focusedId, setFocusedId] = useState<string>(() => {
    const hasParent = new Set(edges.map((e) => e.target))
    const root = nodes.find((n) => !hasParent.has(n.id) && !n.hidden)
    return root?.id ?? nodes[0]?.id ?? ''
  })

  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (!hoveringReports.current || e.deltaY === 0) return
      const el = reportsRef.current
      if (!el) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    document.addEventListener('wheel', handler, { passive: false })
    return () => document.removeEventListener('wheel', handler)
  }, [])

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-sm text-gray-400">No people yet. Switch to Diagram view to add someone.</p>
      </div>
    )
  }

  const focused = nodes.find((n) => n.id === focusedId)
  if (!focused) return null

  const focusedData = focused.data as OrgNodeData
  const ancestors = getAncestorChain(focusedId, nodes, edges)
  const directReports = nodes.filter((n) =>
    edges.some((e) => e.source === focusedId && e.target === n.id)
  )

  return (
    <div className="min-h-full bg-gray-50 py-8 px-4">
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col gap-0">

        {/* Ancestor chain */}
        {ancestors.map((ancestor) => {
          const d = ancestor.data as OrgNodeData
          return (
            <div key={ancestor.id} className="flex flex-col">
              <button
                onClick={() => setFocusedId(ancestor.id)}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left w-full"
              >
                <Avatar d={d} size="w-9 h-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-800 truncate">{d.name}</p>
                  {d.title && <p className="text-xs text-gray-500 truncate">{d.title}</p>}
                </div>
                {reportCount(ancestor.id, edges) > 0 && (
                  <span className="shrink-0 text-[11px] font-medium text-gray-400">
                    {reportCount(ancestor.id, edges)}
                  </span>
                )}
              </button>
              {/* Connector line */}
              <div className="ml-[28px] w-px h-5 bg-gray-200" />
            </div>
          )
        })}

        {/* Focused card */}
        <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-md p-5 flex gap-4">
          <Avatar d={focusedData} size="w-16 h-16 text-lg" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-base text-gray-900 leading-tight">{focusedData.name}</p>
            {focusedData.title && <p className="text-sm text-gray-500 mt-0.5">{focusedData.title}</p>}
            {focusedData.location && <p className="text-xs text-gray-400 mt-1">{focusedData.location}</p>}
            {focusedData.department && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                {focusedData.department}
              </span>
            )}
            {focusedData.linkedIn && (
              <a
                href={focusedData.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-[#0A66C2] text-xs font-medium hover:opacity-70 transition-opacity"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* Connector to reports */}
        {directReports.length > 0 && (
          <div className="ml-[28px] w-px h-5 bg-gray-200" />
        )}

        {/* Direct reports */}
        {directReports.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">
              Direct reports · {directReports.length}
            </p>
            <div
              ref={reportsRef}
              onMouseEnter={() => { hoveringReports.current = true }}
              onMouseLeave={() => { hoveringReports.current = false }}
              className="flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
            >
              {directReports.map((report) => {
                const d = report.data as OrgNodeData
                return (
                  <button
                    key={report.id}
                    onClick={() => setFocusedId(report.id)}
                    className="flex-none w-36 flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-center"
                  >
                    <Avatar d={d} size="w-10 h-10 text-xs" />
                    <div className="w-full min-w-0">
                      <p className="font-medium text-xs text-gray-800 truncate">{d.name}</p>
                      {d.title && <p className="text-[11px] text-gray-500 truncate">{d.title}</p>}
                      {reportCount(report.id, edges) > 0 && (
                        <p className="text-[11px] text-indigo-400 font-medium mt-0.5">
                          {reportCount(report.id, edges)} report{reportCount(report.id, edges) !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center mt-4">No direct reports</p>
        )}

      </div>
    </div>
  )
}
