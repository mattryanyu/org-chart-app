import { useEffect, useRef, useState } from 'react'
import type { Node } from '@xyflow/react'
import type { OrgNodeData } from '../types'

interface Props {
  nodes: Node[]
  onUpdate: (id: string, field: string, value: string) => void
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white'

export function ListView({ nodes, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedDept, setSelectedDept] = useState<string | null>(null)
  const slicerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = slicerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  const sorted = [...nodes].sort((a, b) =>
    String(a.data.name).localeCompare(String(b.data.name))
  )

  const departments = [...new Set(
    sorted.map((n) => String((n.data as OrgNodeData).department || '')).filter(Boolean)
  )].sort()

  const filtered = selectedDept
    ? sorted.filter((n) => String((n.data as OrgNodeData).department) === selectedDept)
    : sorted

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6">
        <p className="text-gray-400 text-sm">No people yet. Switch to Diagram view to add someone.</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto w-full p-6">
      {/* Department slicer */}
      {departments.length > 0 && (
        <div ref={slicerRef} className="flex gap-2 overflow-x-auto mb-6 pb-px [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          <button
            onClick={() => setSelectedDept(null)}
            className={`flex-none flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
              selectedDept === null
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            All
            <span className={`inline-flex items-center justify-center rounded-full text-[10px] font-semibold min-w-[18px] h-[18px] px-1 ${
              selectedDept === null ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {sorted.length}
            </span>
          </button>

          {departments.length > 1 && <div className="w-px self-stretch bg-gray-200 mx-1 flex-none" />}

          {departments.map((dept) => {
            const count = sorted.filter((n) => String((n.data as OrgNodeData).department) === dept).length
            const active = selectedDept === dept
            return (
              <button
                key={dept}
                onClick={() => setSelectedDept(active ? null : dept)}
                className={`flex-none flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  active
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {dept}
                <span className={`inline-flex items-center justify-center rounded-full text-[10px] font-semibold min-w-[18px] h-[18px] px-1 ${
                  active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Header */}
      <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_72px] gap-4 px-4 mb-2">
        {['Name', 'Title', 'Department', 'Location'].map((h) => (
          <span key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{h}</span>
        ))}
        <span />
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-1">
        {filtered.map((node) => {
          const d = node.data as OrgNodeData
          const isEditing = editingId === node.id

          if (isEditing) {
            return (
              <div key={node.id} className="bg-white rounded-xl border border-indigo-200 shadow-sm px-4 py-4 flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3">
                    {d.avatarUrl ? (
                      <img src={d.avatarUrl} alt={d.name} className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0 bg-gray-200" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                        {initials(d.name)}
                      </div>
                    )}
                    <input
                      className={inputCls}
                      value={d.name}
                      onChange={(e) => onUpdate(node.id, 'name', e.target.value)}
                      placeholder="Name"
                    />
                  </div>
                  <input
                    className={inputCls}
                    value={d.title}
                    onChange={(e) => onUpdate(node.id, 'title', e.target.value)}
                    placeholder="Title"
                  />
                  <input
                    className={inputCls}
                    value={d.department}
                    onChange={(e) => onUpdate(node.id, 'department', e.target.value)}
                    placeholder="Department"
                  />
                  <input
                    className={inputCls}
                    value={d.location}
                    onChange={(e) => onUpdate(node.id, 'location', e.target.value)}
                    placeholder="Location"
                  />
                </div>
                <input
                  className={inputCls}
                  value={d.linkedIn ?? ''}
                  onChange={(e) => onUpdate(node.id, 'linkedIn', e.target.value)}
                  placeholder="LinkedIn URL"
                />
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  value={d.notes ?? ''}
                  onChange={(e) => onUpdate(node.id, 'notes', e.target.value)}
                  placeholder="Notes…"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )
          }

          return (
            <div
              key={node.id}
              className="group flex items-center gap-4 sm:grid sm:grid-cols-[2fr_1.5fr_1.5fr_1fr_72px] bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-indigo-100 hover:shadow-sm transition-all duration-150"
            >
              {/* Name + avatar */}
              <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-none">
                {d.avatarUrl ? (
                  <img src={d.avatarUrl} alt={d.name} className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0 bg-gray-200" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                    {initials(d.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{d.name}</p>
                  {d.title && <p className="text-xs text-gray-500 truncate sm:hidden">{d.title}</p>}
                </div>
              </div>

              {/* Title */}
              <p className="text-sm text-gray-500 truncate hidden sm:block">{d.title || <span className="text-gray-300">—</span>}</p>

              {/* Department */}
              <p className="text-sm text-gray-500 truncate hidden sm:block">{d.department || <span className="text-gray-300">—</span>}</p>

              {/* Location */}
              <p className="text-sm text-gray-500 truncate hidden sm:block">{d.location || <span className="text-gray-300">—</span>}</p>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <div className={`relative group/li ${d.linkedIn ? '' : 'invisible pointer-events-none'}`}>
                  <a
                    href={d.linkedIn || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn profile"
                    className="w-8 h-8 flex items-center justify-center rounded-md text-[#0A66C2] hover:bg-blue-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover/li:opacity-100 transition-opacity z-50">
                    LinkedIn
                  </span>
                </div>
                <div className="relative group/tip">
                  <button
                    onClick={() => setEditingId(node.id)}
                    aria-label="Edit person"
                    className="w-8 h-8 flex items-center justify-center rounded-md text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M9.5 1.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                      <path d="M8 3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
                    Edit person
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
