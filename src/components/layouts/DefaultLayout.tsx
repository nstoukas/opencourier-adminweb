import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '../../admin-web-components'
import { cn } from '../../ui-shared-utils'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'
import { AdminSidebar, useCoopName } from './AdminSidebar'

interface DefaultLayoutProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * The shell every signed in admin page sits in: the sidebar on the left and the page in
 * `<main>` beside it. Each page starts its content with a PageHeader (its h1 and action).
 * Below 1024px the sidebar becomes a sheet, opened from a slim bar at the top.
 */
export function DefaultLayout({ children, className }: DefaultLayoutProps) {
  return (
    <SidebarProvider>
      {/* Hidden until a keyboard user presses Tab, then the first thing on the page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <AdminSidebar />
      <CloseSheetOnNavigation />
      <SidebarInset>
        <MobileBar />
        <div className={cn('flex-1 p-4 sm:p-6', className)}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// The slim bar above the page below 1024px: the menu button and the co-op's mark.
function MobileBar() {
  const coopName = useCoopName()

  return (
    <div className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-2 sm:px-4 lg:hidden">
      <SidebarTrigger />
      <span className="truncate text-sm font-semibold">{coopName}</span>
    </div>
  )
}

// After you pick a page in the sheet, the sheet closes so you see the page you opened.
function CloseSheetOnNavigation() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])
  return null
}
