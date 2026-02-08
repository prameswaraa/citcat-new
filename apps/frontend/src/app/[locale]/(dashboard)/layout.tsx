import { cookies } from "next/headers"
import { cn } from "@/lib/utils"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { ProtectedRoute } from "@/components/auth/protected-route"

interface Props {
  children: React.ReactNode
}

export default async function DashboardLayout({ children }: Props) {
  const cookieStore = await cookies()
  const defaultClose = cookieStore.get("sidebar:state")?.value === "false"
  return (
    <ProtectedRoute>
      <div className="border-grid flex flex-1 flex-col">
        <SidebarProvider defaultOpen={!defaultClose}>
          <AppSidebar />
          <div
            id="content"
            className={cn(
              "flex h-full w-full flex-col pb-16 md:pb-0",
              "has-[div[data-layout=fixed]]:h-svh",
              "group-data-[scroll-locked=1]/body:h-full",
              "has-[data-layout=fixed]:group-data-[scroll-locked=1]/body:h-svh"
            )}
          >
            {children}
          </div>
          <BottomNav />
        </SidebarProvider>
      </div>
    </ProtectedRoute>
  )
}
