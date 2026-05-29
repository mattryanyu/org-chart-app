import { useState } from 'react'
import { Handle, Position, useEdges, useReactFlow, type NodeProps } from '@xyflow/react'
import type { OrgNodeData } from '../types'
import { resizeToBase64 } from '../resizeImage'
import { useDropTarget } from '../DragContext'

export function OrgNode({ id, data, selected }: NodeProps & { data: OrgNodeData }) {
  const { setNodes } = useReactFlow()
  const [isDragOver, setIsDragOver] = useState(false)
  const dropTargetId = useDropTarget()
  const isDropTarget = dropTargetId === id
  const edges = useEdges()
  const directReportCount = edges.filter((e) => e.source === id).length
  const hasParent = edges.some((e) => e.target === id)

  const initials = data.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file?.type.startsWith('image/')) return
    resizeToBase64(file).then((dataUrl) =>
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, avatarUrl: dataUrl } } : n))
      )
    )
  }

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, rootPinned: !data.rootPinned } } : n
      )
    )
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, collapsed: !data.collapsed } } : n
      )
    )
  }

  const avatarClass = `w-24 h-24 rounded-full transition-all ${
    isDragOver ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : ''
  }`

  return (
    <div className="relative">
      <div
        className={`bg-white rounded-xl shadow-md ring-2 w-48 transition-all ${
          isDropTarget
            ? 'ring-green-400 shadow-green-100 shadow-lg scale-105'
            : selected
            ? 'ring-blue-500 shadow-blue-200 shadow-lg'
            : 'ring-gray-300'
        } ${directReportCount > 0 ? 'cursor-pointer' : ''}`}
        onDoubleClick={directReportCount > 0 ? handleToggle : undefined}
      >
        <Handle type="target" position={Position.Top} className="!bg-gray-400" />

        <div className="p-4 flex flex-col items-center gap-2">
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={data.name}
              className={`${avatarClass} object-cover bg-gray-200`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          ) : (
            <div
              className={`${avatarClass} bg-blue-500 flex items-center justify-center text-white font-semibold text-sm cursor-pointer`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              title="Drop an image here"
            >
              {isDragOver ? '↓' : initials}
            </div>
          )}
          <div className="text-center">
            <p className="font-semibold text-gray-800 text-sm leading-tight">{data.name}</p>
            <p className="text-gray-500 text-xs mt-0.5">{data.title}</p>
            {data.location && (
              <p className="text-gray-400 text-xs mt-1">{data.location}</p>
            )}
            {data.department && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                {data.department}
              </span>
            )}
            {data.linkedIn && (
              <a
                href={String(data.linkedIn)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="nodrag inline-flex items-center justify-center mt-2 text-[#0A66C2] hover:opacity-70 transition-opacity"
                aria-label="LinkedIn profile"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            )}
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
      </div>

      {hasParent && (
        <button
          onClick={handlePinToggle}
          className="nodrag absolute -top-3 left-1/2 -translate-x-1/2 flex items-center px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 shadow-sm hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:scale-110 hover:shadow-md transition-all z-10"
          title={data.rootPinned ? 'Show ancestors' : 'Hide ancestors'}
        >
          {data.rootPinned ? '+' : '−'}
        </button>
      )}

      {directReportCount > 0 && (
        <button
          onClick={handleToggle}
          className="nodrag absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs text-gray-500 shadow-sm hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:scale-110 hover:shadow-md transition-all z-10"
        >
          {data.collapsed ? `+ ${directReportCount}` : `− ${directReportCount}`}
        </button>
      )}
    </div>
  )
}
