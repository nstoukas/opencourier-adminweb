import { api } from '@/api'
import { useGetInstanceConfigQuery } from '@/api/configApi'
import { EAdminRoutes } from '@/hooks/useAdminPageNavigator'
import { setAccessToken } from '@/modules/auth/slices/authSlice'
import { closeAllSheets } from '@/modules/shared/slices/sheetManagerSlice'
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
import { ArrowsSplit, CalendarBlank, ChatCircle, Coins, GearSix, MapPin, Megaphone, Moped, NotePencil, Package, Scales, SignOut, Siren, Storefront, Timer, WarningCircle } from '@phosphor-icons/react'
import { MessagesBadge } from '@/modules/chat/MessagesBadge'
import { ReviewsBadge } from '@/modules/reviews/ReviewsBadge'
import { SplitRequestsBadge } from '@/modules/split-requests/SplitRequestsBadge'
import { disconnectChatLive } from '@/modules/chat/chatLive'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem = {
  title: string
  icon: PhosphorIcon
  href: string
  // Drawn after the title, such as Messages' unread count.
  badge?: () => JSX.Element | null
}

type NavGroup = {
  label: string
  items: NavItem[]
}

// The redesign's three groups, holding today's pages. Dispatch joined "Run the day" with row 90 and
// Messages with row 111; Instance Configuration became Settings in row 87.
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Run the day',
    items: [
      // The live board (spec 0034).
      { title: 'Dispatch', icon: MapPin, href: EAdminRoutes.HOME },
      { title: 'Deliveries', icon: Package, href: EAdminRoutes.DELIVERIES },
      // Dispatch's chat with riders and restaurants, with its count of unread threads (spec 0034, AC-2).
      { title: 'Messages', icon: ChatCircle, href: EAdminRoutes.CHAT, badge: MessagesBadge },
      // Riders' SOS incidents (spec 0022).
      { title: 'SOS', icon: Siren, href: EAdminRoutes.SOS },
      // Wrong or missing products (spec 0032).
      { title: 'Product reports', icon: WarningCircle, href: EAdminRoutes.PRODUCT_REPORTS },
      // Orders that do not fit one box, with the count waiting for an answer (spec 0047, AC-4).
      { title: 'Split requests', icon: ArrowsSplit, href: EAdminRoutes.SPLIT_REQUESTS, badge: SplitRequestsBadge },
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
    items: [
      { title: 'Settings', icon: GearSix, href: EAdminRoutes.INSTANCE_CONFIGURATION },
      // The co-op's weekly shift slots (spec 0026).
      { title: 'Shift slots', icon: CalendarBlank, href: EAdminRoutes.SHIFT_SLOTS },
      // What each restaurant owes, billed by hand (spec 0036).
      { title: 'Charges', icon: Coins, href: EAdminRoutes.CHARGES },
      // Riders' review requests, with the count still open (spec 0038, AC-5).
      { title: 'Reviews', icon: Scales, href: EAdminRoutes.REVIEWS, badge: ReviewsBadge },
      // Complaints both ways, each decided by a person (spec 0052). No badge or count.
      { title: 'Complaints', icon: Megaphone, href: EAdminRoutes.COMPLAINTS },
      // Riders' notes about places, flagged ones first (spec 0053). No badge or count.
      { title: 'Address notes', icon: NotePencil, href: EAdminRoutes.ADDRESS_NOTES },
      // The co-op's totals only (spec 0040); one rider's time worked is on that rider's page.
      { title: 'Time worked', icon: Timer, href: EAdminRoutes.TIME_WORKED },
    ],
  },
]

// True when `pathname` is the link's page or a page under it ("/deliveries/abc" is under
// Deliveries). Dispatch ("/") only matches itself, or every page would light it up.
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

  // Sign Out leaves nothing of this session behind for the next person at the same screen.
  // Forgetting the token first unmounts the pages (the sign in guard draws nothing without one),
  // so emptying the cache next does not make them fetch again. The same two steps as the
  // automatic sign out on a 401 (src/api/utils/api.ts), plus closing any open sheet.
  const signOut = () => {
    dispatch(setAccessToken(null))
    // `resetApiState` empties RTK Query's cache: every delivery, courier, restaurant and setting
    // fetched so far is dropped from memory.
    dispatch(api.util.resetApiState())
    dispatch(closeAllSheets())
    // The chat's live connection would keep receiving messages on the sign in page (spec 0034).
    disconnectChatLive()
  }

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
                            {item.badge ? <item.badge /> : null}
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
            <SidebarMenuButton onClick={signOut}>
              <SignOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
