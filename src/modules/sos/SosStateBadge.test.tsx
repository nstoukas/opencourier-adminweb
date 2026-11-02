import React from 'react'
import { render, screen } from '@testing-library/react'
import { SosStateBadge } from './SosStateBadge'

describe('SosStateBadge (spec 0022)', () => {
  it('renders "Active" with destructive variant for ACTIVE state', () => {
    const { container } = render(<SosStateBadge state="ACTIVE" />)
    const badge = screen.getByText('Active')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-destructive')
  })

  it('renders "Awaiting close" with warning variant for AWAITING_CLOSE state', () => {
    const { container } = render(<SosStateBadge state="AWAITING_CLOSE" />)
    const badge = screen.getByText('Awaiting close')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-warning')
  })

  it('renders "Closed" with outline variant for CLOSED state', () => {
    const { container } = render(<SosStateBadge state="CLOSED" />)
    const badge = screen.getByText('Closed')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('border')
  })
})
