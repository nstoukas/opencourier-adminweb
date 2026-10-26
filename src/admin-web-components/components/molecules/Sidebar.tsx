'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { List } from '@phosphor-icons/react'

import { cn } from '../../../ui-shared-utils'
import { Button } from '../atoms/Button'
import { Sheet, SheetContent, SheetTitle } from '../atoms/Sheet'

/**
 * shadcn's Sidebar (new-york), on Tailwind 3, trimmed to what the admin shell uses. The design
 * system's structure is SidebarProvider > Sidebar (SidebarHeader, SidebarContent with
 * SidebarGroups of SidebarMenus, SidebarFooter) + SidebarInset for the page.
 *
 * From 1024px wide the sidebar is always there, a fixed 16rem column. Below that it is a
 * sheet that slides in from the left, opened by SidebarTrigger. shadcn's collapse to icons,
 * its remembered state and its keyboard shortcut are left out: nothing here uses them yet.
 * The group label uses `muted-foreground` instead of shadcn's `sidebar-foreground/70`, the
 * design system's contrast fix.
 */

type SidebarContextValue = {
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
}

// A React context hands a value to every component below its Provider without passing props
// through each level. Here it carries whether the phone and tablet sheet is open.
const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used inside a SidebarProvider.')
  }
  return context
}

function SidebarProvider({ className, style, children, ...props }: React.ComponentProps<'div'>) {
  const [openMobile, setOpenMobile] = React.useState(false)
  // useMemo keeps the same object between renders while nothing in it changed, so the
  // components reading the context do not redraw for nothing.
  const value = React.useMemo(() => ({ openMobile, setOpenMobile }), [openMobile])

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        // CSS variables the sidebar classes read: `w-[--sidebar-width]` means width: var(--sidebar-width).
        // `as React.CSSProperties` tells TypeScript these custom property names are allowed in style.
        style={{ '--sidebar-width': '16rem', '--sidebar-width-mobile': '18rem', ...style } as React.CSSProperties}
        className={cn('flex min-h-svh w-full', className)}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

function Sidebar({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { openMobile, setOpenMobile } = useSidebar()

  return (
    <>
      <div
        data-slot="sidebar"
        className={cn(
          'sticky top-0 hidden h-svh w-[--sidebar-width] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex',
          className
        )}
        {...props}
      >
        {children}
      </div>
      {/* The sheet's content exists only while it is open, so the links are never in the page twice. */}
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          data-slot="sidebar"
          className="flex w-[--sidebar-width-mobile] flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground lg:hidden"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {children}
        </SheetContent>
      </Sheet>
    </>
  )
}

// The button that opens the sheet below 1024px. Hidden on wider screens, where the sidebar shows.
function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
  const { setOpenMobile } = useSidebar()

  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      aria-label="Open menu"
      className={cn('h-9 w-9 lg:hidden', className)}
      onClick={(event) => {
        onClick?.(event)
        setOpenMobile(true)
      }}
      {...props}
    >
      <List className="size-5" />
    </Button>
  )
}

// The page beside the sidebar. It is the page's one <main>, which the "Skip to content" link targets.
function SidebarInset({ className, ...props }: React.ComponentProps<'main'>) {
  return (
    <main
      id="main"
      tabIndex={-1}
      data-slot="sidebar-inset"
      className={cn('flex min-w-0 flex-1 flex-col bg-background outline-none', className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('flex flex-col gap-2 p-2', className)} {...props} />
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('flex flex-col gap-2 p-2', className)} {...props} />
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn('flex min-h-0 flex-1 flex-col gap-2 overflow-auto', className)}
      {...props}
    />
  )
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" className={cn('relative flex w-full min-w-0 flex-col p-2', className)} {...props} />
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-group-label"
      className={cn('flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('flex w-full min-w-0 flex-col gap-1', className)} {...props} />
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('relative', className)} {...props} />
}

type SidebarMenuButtonProps = React.ComponentProps<'button'> & {
  // Draw the child (a link) with these styles instead of a <button>.
  asChild?: boolean
  // The page you are on: shaded, in medium weight.
  isActive?: boolean
}

function SidebarMenuButton({ asChild = false, isActive = false, className, ...props }: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(
        'flex h-8 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
        className
      )}
      {...props}
    />
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
}
