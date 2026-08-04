import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { setAccessToken } from '@/modules/auth/slices/authSlice'
import {
  Button,
  Separator,
  TooltipProvider,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../admin-web-components'
import { cn, useAppDispatch, useScreenSize } from '../../ui-shared-utils'
import {
  BuildingIcon,
  CarTaxiFrontIcon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  StoreIcon,
} from 'lucide-react'
import React, { useState } from 'react'
import { Nav, NavLink } from '../Nav'

interface ghostLayoutProps extends React.HTMLAttributes<HTMLDivElement> {}

// react-resizable-panels sizes panels as a PERCENTAGE of the group (0-100), not in pixels,
// so these must add up to 100. Passing pixels here made the library discard both values.
export const SIDEBAR_MIN_SIZE = 12
export const SIDEBAR_MAX_SIZE = 14
export const SIDEBAR_DEFAULT_SIZE = 13
export const CONTENT_MIN_SIZE = 30
export const CONTENT_DEFAULT_SIZE = 100 - SIDEBAR_DEFAULT_SIZE

const sidebarNavItems: NavLink[] = [
  {
    title: 'Overview',
    icon: LayoutDashboardIcon,
    href: EAdminRoutes.HOME,
  },
  {
    title: 'Deliveries',
    icon: BuildingIcon,
    href: EAdminRoutes.DELIVERIES,
  },
  {
    title: 'Restaurants',
    icon: StoreIcon,
    href: EAdminRoutes.PARTNERS,
  },
  {
    title: 'Couriers',
    icon: ScrollTextIcon,
    href: EAdminRoutes.COURIERS,
  },
  {
    title: 'Instance Configuration',
    icon: CarTaxiFrontIcon,
    href: EAdminRoutes.INSTANCE_CONFIGURATION,
  },
]

export function DefaultLayout({ children, className }: ghostLayoutProps) {
  const screen = useScreenSize()
  const [isCollapsed, setIsCollapsed] = React.useState(screen.width < 400)
  const dispatch = useAppDispatch()
  const [navItems] = useState<NavLink[]>(sidebarNavItems)

  return (
    <div className="flex flex-col lg:flex-row">
      <ResizablePanelGroup direction="horizontal" className="items-stretch">
        <TooltipProvider delayDuration={0}>
          <ResizablePanel
            defaultSize={SIDEBAR_DEFAULT_SIZE}
            collapsedSize={4}
            collapsible={true}
            minSize={SIDEBAR_MIN_SIZE}
            maxSize={SIDEBAR_MAX_SIZE}
            onCollapse={(collapsed) => {
              setIsCollapsed(collapsed)
            }}
            className={cn(isCollapsed && 'min-w-[50px] transition-all duration-300 ease-in-out')}
            style={{ height: '100svh' }}
          >
            <Nav isCollapsed={isCollapsed} links={navItems} />

            <Separator />

            <Button variant="link" onClick={() => dispatch(setAccessToken(null))}>
              Log out
            </Button>
          </ResizablePanel>
        </TooltipProvider>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={CONTENT_DEFAULT_SIZE} minSize={CONTENT_MIN_SIZE}>
          <div className={cn('flex-1 max-h-screen md:overflow-auto p-4', className)}>{children}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
