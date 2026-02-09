"use client"

import { createContext, useContext, useState, useCallback, useMemo } from "react"
import { usePathname, useParams } from "next/navigation"

interface ChatContextValue {
  /** Current dashboard section derived from pathname */
  section: string
  /** Entity type being viewed (if any) */
  entityType?: "patient" | "claim" | "denial" | "appointment" | "payment_plan" | "review"
  /** Entity ID being viewed */
  entityId?: string
  /** Additional entity data injected by the page */
  entityData?: Record<string, unknown>
  /** Human-readable page title */
  pageTitle: string
  /** Set entity data from a page component */
  setEntityData: (data: Record<string, unknown>) => void
  /** Set page title from a page component */
  setPageTitle: (title: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

/** Section labels for route prefixes */
const SECTION_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  patients: "Patients",
  scheduling: "Scheduling",
  rcm: "Revenue Cycle",
  payments: "Payments",
  reputation: "Reputation",
  ai: "AI Actions",
  tasks: "Tasks",
  settings: "Settings",
  health: "System Health",
}

/** Map route patterns to entity types */
function parseEntityFromPath(
  pathname: string,
  params: Record<string, string | string[]>
): { entityType?: ChatContextValue["entityType"]; entityId?: string } {
  if (params.patientId && typeof params.patientId === "string") {
    return { entityType: "patient", entityId: params.patientId }
  }
  if (pathname.includes("/rcm/denials/") && params.denialId) {
    return { entityType: "denial", entityId: params.denialId as string }
  }
  if (pathname.includes("/rcm/claims/") && params.claimId) {
    return { entityType: "claim", entityId: params.claimId as string }
  }
  return {}
}

export function ChatContextProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const params = useParams() as Record<string, string | string[]>
  const [entityData, setEntityDataState] = useState<Record<string, unknown> | undefined>()
  const [pageTitle, setPageTitleState] = useState<string>("")

  // Derive section from pathname
  const section = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean)
    return segments[0] || "dashboard"
  }, [pathname])

  // Derive entity type and ID from route params
  const { entityType, entityId } = useMemo(
    () => parseEntityFromPath(pathname, params),
    [pathname, params]
  )

  // Default page title from section if not explicitly set
  const effectivePageTitle = pageTitle || SECTION_MAP[section] || section

  const setEntityData = useCallback((data: Record<string, unknown>) => {
    setEntityDataState(data)
  }, [])

  const setPageTitle = useCallback((title: string) => {
    setPageTitleState(title)
  }, [])

  const value = useMemo<ChatContextValue>(
    () => ({
      section,
      entityType,
      entityId,
      entityData,
      pageTitle: effectivePageTitle,
      setEntityData,
      setPageTitle,
    }),
    [section, entityType, entityId, entityData, effectivePageTitle, setEntityData, setPageTitle]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    // Return safe defaults when used outside provider (e.g., during SSR)
    return {
      section: "dashboard",
      pageTitle: "Dashboard",
      setEntityData: () => {},
      setPageTitle: () => {},
    }
  }
  return ctx
}
