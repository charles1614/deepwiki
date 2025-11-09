'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface BreadcrumbRightContentContextType {
  content: ReactNode
  setContent: (content: ReactNode) => void
}

const BreadcrumbRightContentContext = createContext<BreadcrumbRightContentContextType | null>(null)

export function BreadcrumbRightContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null)
  
  return (
    <BreadcrumbRightContentContext.Provider value={{ content, setContent }}>
      {children}
    </BreadcrumbRightContentContext.Provider>
  )
}

export function useBreadcrumbRightContent() {
  const context = useContext(BreadcrumbRightContentContext)
  if (!context) {
    return { content: null, setContent: () => {} }
  }
  return context
}


