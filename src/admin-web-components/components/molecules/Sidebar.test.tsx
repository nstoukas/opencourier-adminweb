import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import {
  Sidebar,
  SidebarInset,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from './Sidebar'

describe('Sidebar molecule components (row 86)', () => {
  it('SidebarProvider provides context and sets sidebar CSS variables', () => {
    const { container } = render(
      <SidebarProvider className="custom-provider">
        <div>Content</div>
      </SidebarProvider>
    )

    const wrapper = container.querySelector('[data-slot="sidebar-wrapper"]')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveStyle('--sidebar-width: 16rem')
    expect(wrapper).toHaveStyle('--sidebar-width-mobile: 18rem')
  })

  it('useSidebar throws an error when called outside a SidebarProvider', () => {
    const TestComponent = () => {
      useSidebar()
      return null
    }

    // Suppress React error boundary log in test runner
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestComponent />)).toThrow(
      'useSidebar must be used inside a SidebarProvider.'
    )
    consoleError.mockRestore()
  })

  it('SidebarInset renders the page as the one <main> element with id="main" and tabIndex={-1}', () => {
    render(
      <SidebarProvider>
        <SidebarInset>
          <div>Page content</div>
        </SidebarInset>
      </SidebarProvider>
    )

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main')
    expect(main).toHaveAttribute('tabIndex', '-1')
    expect(main).toHaveAttribute('data-slot', 'sidebar-inset')
    expect(main).toHaveTextContent('Page content')
  })

  it('SidebarTrigger has aria-label="Open menu" and opens mobile sheet on click', () => {
    render(
      <SidebarProvider>
        <SidebarTrigger />
        <Sidebar>
          <div>Sidebar Links</div>
        </Sidebar>
      </SidebarProvider>
    )

    const trigger = screen.getByRole('button', { name: 'Open menu' })
    expect(trigger).toHaveAttribute('data-slot', 'sidebar-trigger')

    // Before clicking, the mobile sheet is closed
    expect(screen.queryByRole('dialog')).toBeNull()

    // Clicking trigger opens the mobile sheet
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Sidebar Links')).toBeInTheDocument()
  })

  it('SidebarMenuButton reflects isActive through data-active attribute', () => {
    const { rerender } = render(
      <SidebarProvider>
        <SidebarMenuButton isActive={false}>Inactive Link</SidebarMenuButton>
      </SidebarProvider>
    )

    const button = screen.getByRole('button', { name: 'Inactive Link' })
    expect(button).toHaveAttribute('data-active', 'false')

    rerender(
      <SidebarProvider>
        <SidebarMenuButton isActive={true}>Active Link</SidebarMenuButton>
      </SidebarProvider>
    )

    const activeBtn = screen.getByRole('button', { name: 'Active Link' })
    expect(activeBtn).toHaveAttribute('data-active', 'true')
  })
})
