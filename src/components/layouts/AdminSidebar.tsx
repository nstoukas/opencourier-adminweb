import { useGetInstanceConfigQuery } from '@/api/configApi'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { setAccessToken } from '@/modules/auth/slices/authSlice'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../../admin-web-components'
import { useAppDispatch } from '../../ui-shared-utils'
// `import type` brings in only a type (erased at build time); Phosphor's `Icon` is the type of
// any icon component, renamed so it is not mistaken for a component itself.
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { GearSix, Moped, Package, SignOut, SquaresFour, Storefront } from '@phosphor-icons/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  title: string
  icon: PhosphorIcon
  href: string
}

type NavGroup = {
  label: string
  items: NavItem[]
}

// The redesign's three groups, holding today's pages. Dispatch and Messages join "Run the day"
// when rows 90 builds them; Instance Configuration becomes Co-op settings in row 87.
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Run the day',
    items: [
      { title: 'Overview', icon: SquaresFour, href: EAdminRoutes.HOME },
      { title: 'Deliveries', icon: Package, href: EAdminRoutes.DELIVERIES },
    ],
  },
  {
    label: 'People',
    items: [
      { title: 'Couriers', icon: Moped, href: EAdminRoutes.COURIERS },
      { title: 'Restaurants', icon: Storefront, href: EAdminRoutes.PARTNERS },
    ],
  },
  {
    label: 'Co-op',
    items: [{ title: 'Instance Configuration', icon: GearSix, href: EAdminRoutes.INSTANCE_CONFIGURATION }],
  },
]

// True when `pathname` is the link's page or a page under it ("/deliveries/abc" is under
// Deliveries). Overview ("/") only matches itself, or every page would light it up.
export function isActivePath(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '')
  const target = href.replace(/\/$/, '')
  if (path === target) return true
  if (target === '') return false
  return path.startsWith(`${target}/`)
}

/**
 * The co-op's name, read from the instance settings (`details.name`). Until they load, or if
 * the name is empty, the sidebar says OpenCourier.
 */
export function useCoopName(): string {
  const { data } = useGetInstanceConfigQuery({})
  // `details` is typed as a plain `object`, so we say which field we read and that it may be missing.
  const name = (data?.details as { name?: string } | null | undefined)?.name?.trim()
  return name || 'OpenCourier'
}

/** The admin's left navigation: the co-op's mark and name, today's pages in three groups, Sign Out. */
export function AdminSidebar() {
  const pathname = usePathname() || '/'
  const dispatch = useAppDispatch()
  const coopName = useCoopName()

  return (
    <Sidebar>
      <SidebarHeader className="gap-3 px-4 pb-2 pt-4">
        {/* The design system's mark: black ink, for white or muted grounds, 48px tall or more. */}
        {/* A plain <img>: next/image on Next 13.5 hands React 18.2 a `fetchPriority` prop it warns about. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/opencourier-sign.png" alt="OpenCourier" width={42} height={48} className="h-12 w-auto self-start" />
        <p className="text-sm font-semibold leading-snug">{coopName}</p>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Main">
          {NAV_GROUPS.map((group) => {
            // "Run the day" -> "nav-run-the-day": an id may not contain spaces.
            const labelId = `nav-${group.label.toLowerCase().replace(/\s+/g, '-')}`
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel id={labelId}>{group.label}</SidebarGroupLabel>
                <SidebarMenu aria-labelledby={labelId}>
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item.href)
                    return (
                      <SidebarMenuItem key={item.href}>
                        {/* asChild: the menu button lends its styles to the Link, so the result is one <a>. */}
                        <SidebarMenuButton asChild isActive={active}>
                          <Link href={item.href} aria-current={active ? 'page' : undefined}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroup>
            )
          })}
        </nav>
      </SidebarContent>

      <SidebarFooter className="pb-4">
        <SidebarMenu>
          <SidebarMenuItem>
            {/* Signing out forgets the token; the sign in guard then sends you to /login. */}
            <SidebarMenuButton onClick={() => dispatch(setAccessToken(null))}>
              <SignOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
