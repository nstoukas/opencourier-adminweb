import React from 'react'
import { render, screen } from '@testing-library/react'
import { PageHeader } from './PageHeader'

// Mock next/head to inspect title element rendered in JSDOM
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

describe('PageHeader (row 86)', () => {
  it('renders an h1 with 30px bold typography and sets the document title', () => {
    const { container } = render(<PageHeader title="Deliveries" />)

    // Admin layout rule: exactly one h1 per page with 30px bold styling
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Deliveries')
    expect(h1.className).toContain('break-words')
    expect(h1.className).toContain('text-3xl')
    expect(h1.className).toContain('font-bold')
    expect(h1.className).toContain('tracking-tight')

    // Browser tab title formatted as "{title} · OpenCourier Admin"
    const titleTag = container.querySelector('title')
    expect(titleTag).toBeInTheDocument()
    expect(titleTag).toHaveTextContent('Deliveries · OpenCourier Admin')
  })

  it('renders optional description in muted text below the title', () => {
    render(
      <PageHeader
        title="Overview"
        description="Welcome back. What would you like to do today?"
      />
    )

    const description = screen.getByText('Welcome back. What would you like to do today?')
    expect(description).toBeInTheDocument()
    expect(description.tagName).toBe('P')
    expect(description.className).toContain('text-muted-foreground')
  })

  it('does not render a description paragraph when omitted', () => {
    const { container } = render(<PageHeader title="Couriers" />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('renders optional right-aligned action slot beside the title', () => {
    render(
      <PageHeader
        title="Restaurants"
        action={<button type="button">Add Restaurant</button>}
      />
    )

    const actionButton = screen.getByRole('button', { name: 'Add Restaurant' })
    expect(actionButton).toBeInTheDocument()
    // Action container has flex-wrap gap-2
    expect(actionButton.parentElement?.className).toContain('flex')
    expect(actionButton.parentElement?.className).toContain('items-center')
  })

  it('does not render an action slot container when action is omitted', () => {
    const { container } = render(<PageHeader title="Deliveries" />)
    // Only the title's div should exist inside <header>
    const header = container.querySelector('header')
    expect(header?.children.length).toBe(1)
  })
})
