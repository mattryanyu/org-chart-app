import type { Node, Edge } from '@xyflow/react'
import type { OrgNodeData } from './types'

export const initialNodes: Node<OrgNodeData>[] = [
  {
    id: '1',
    type: 'orgNode',
    position: { x: 0, y: 0 },
    data: { name: 'Jane Smith', title: 'Chief Executive Officer', department: 'Executive' },
  },
  {
    id: '2',
    type: 'orgNode',
    position: { x: -250, y: 160 },
    data: { name: 'Tom Lee', title: 'VP of Engineering', department: 'Engineering' },
  },
  {
    id: '3',
    type: 'orgNode',
    position: { x: 0, y: 160 },
    data: { name: 'Sara Kim', title: 'VP of Product', department: 'Product' },
  },
  {
    id: '4',
    type: 'orgNode',
    position: { x: 250, y: 160 },
    data: { name: 'Mike Chen', title: 'VP of Sales', department: 'Sales' },
  },
  {
    id: '5',
    type: 'orgNode',
    position: { x: -350, y: 320 },
    data: { name: 'Amy Park', title: 'Senior Engineer', department: 'Engineering' },
  },
  {
    id: '6',
    type: 'orgNode',
    position: { x: -150, y: 320 },
    data: { name: 'Dev Patel', title: 'Senior Engineer', department: 'Engineering' },
  },
]

export const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
  { id: 'e1-3', source: '1', target: '3', type: 'smoothstep' },
  { id: 'e1-4', source: '1', target: '4', type: 'smoothstep' },
  { id: 'e2-5', source: '2', target: '5', type: 'smoothstep' },
  { id: 'e2-6', source: '2', target: '6', type: 'smoothstep' },
]
