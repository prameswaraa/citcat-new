"use client"

import { Link, usePathname } from "@/i18n/routing"
import { Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSidebar } from "@/components/ui/sidebar"
import { sidebarData } from "./data/sidebar-data"
import { NavItem } from "./types"

export function BottomNav() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  const navItems = sidebarData.navGroups.flatMap((group) => group.items).slice(0, 4)

  return (
    <div className="fixed bottom-0 left-0 z-40 w-full border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
      <nav className="flex h-16 items-center justify-around px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = checkIsActive(pathname, item)

          return (
            <Link
              key={item.title}
              href={item.url ?? "#"}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <span className="truncate w-full text-center leading-none">{item.title}</span>
            </Link>
          )
        })}
        
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5" />
          <span className="truncate w-full text-center leading-none">Menu</span>
        </button>
      </nav>
    </div>
  )
}

function checkIsActive(href: string, item: NavItem) {
  return (
    href === item.url ||
    href.split("?")[0] === item.url ||
    !!item?.items?.filter((i) => i.url === href).length ||
    (href.split("/")[1] !== "" &&
      href.split("/")[1] === item?.url?.split("/")[1])
  )
}