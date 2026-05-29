export interface OrgNodeData extends Record<string, unknown> {
  name: string
  title: string
  department: string
  location: string
  avatarUrl?: string
  collapsed?: boolean
  rootPinned?: boolean
  notes?: string
  linkedIn?: string
}
