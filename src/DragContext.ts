import { createContext, useContext } from 'react'

export const DropTargetContext = createContext<string | null>(null)
export const useDropTarget = () => useContext(DropTargetContext)
