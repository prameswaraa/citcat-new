"use client"

import { createContext, useContext, type ReactNode } from "react"

interface DashboardFilterContextType {
  whatsappPhoneNumberId?: string
}

const DashboardFilterContext = createContext<DashboardFilterContextType>({})

export function DashboardFilterProvider({
  whatsappPhoneNumberId,
  children,
}: {
  whatsappPhoneNumberId?: string
  children: ReactNode
}) {
  return (
    <DashboardFilterContext.Provider value={{ whatsappPhoneNumberId }}>
      {children}
    </DashboardFilterContext.Provider>
  )
}

export function useDashboardFilter() {
  return useContext(DashboardFilterContext)
}
