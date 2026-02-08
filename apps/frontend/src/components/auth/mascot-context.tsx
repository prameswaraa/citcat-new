"use client"

import { createContext, useContext, useState, ReactNode } from "react"

type MascotState = "idle" | "email" | "password"

interface MascotContextType {
    state: MascotState
    setState: (state: MascotState) => void
}

const MascotContext = createContext<MascotContextType | undefined>(undefined)

export function MascotProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<MascotState>("idle")

    return (
        <MascotContext.Provider value={{ state, setState }}>
            {children}
        </MascotContext.Provider>
    )
}

export function useMascot() {
    const context = useContext(MascotContext)
    if (context === undefined) {
        throw new Error("useMascot must be used within a MascotProvider")
    }
    return context
}
