"use client"

import { useEffect } from "react"
import { useRouter } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { SidebarProvider } from "@/components/ui/sidebar"
import { RefreshCw } from "lucide-react"
import { useBusinessAccount } from "@/hooks/use-business-account"
import { AdminSidebar } from "./components/admin-sidebar"
import { AdminHeader } from "./components/admin-header"

interface Props {
  children: React.ReactNode
}

export default function AdminLayout({ children }: Props) {
  const router = useRouter()
  const { userRole, isLoading, isAuthenticated } = useBusinessAccount()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }

    // Redirect to dashboard if not admin
    if (!isLoading && isAuthenticated && userRole !== "ADMIN") {
      router.push("/dashboard?error=unauthorized")
    }
  }, [isLoading, isAuthenticated, userRole, router])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Show loading while redirecting non-admin users
  if (!isAuthenticated || userRole !== "ADMIN") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="border-grid flex flex-1 flex-col">
      <SidebarProvider defaultOpen={true}>
        <AdminSidebar />
        <div
          id="content"
          className={cn(
            "flex h-full w-full flex-col",
            "has-[div[data-layout=fixed]]:h-svh",
            "group-data-[scroll-locked=1]/body:h-full",
            "has-[data-layout=fixed]:group-data-[scroll-locked=1]/body:h-svh"
          )}
        >
          <AdminHeader />
          {children}
        </div>
      </SidebarProvider>
    </div>
  )
}
