import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Breadcrumb } from './Breadcrumb'

describe('Breadcrumb atom component (spec 0011, AC-2)', () => {
  it('renders breadcrumb steps with links for earlier steps and current page for the last step', () => {
    const handleDeliveriesClick = jest.fn()
    const steps = [
      { label: 'Deliveries', href: '/deliveries', onClick: handleDeliveriesClick },
      { label: 'Delivery ORD-100' },
    ]

    render(<Breadcrumb steps={steps} />)

    // The nav container has accessible name "Breadcrumb"
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toBeInTheDocument()

    // Earlier step is a link
    const deliveriesLink = screen.getByRole('link', { name: 'Deliveries' })
    expect(deliveriesLink).toBeInTheDocument()
    expect(deliveriesLink).toHaveAttribute('href', '/deliveries')

    // Clicking the link calls the onClick handler and prevents default navigation
    fireEvent.click(deliveriesLink)
    expect(handleDeliveriesClick).toHaveBeenCalledTimes(1)

    // Last step is marked with aria-current="page" and is NOT a link
    const currentStep = screen.getByText('Delivery ORD-100')
    expect(currentStep).toHaveAttribute('aria-current', 'page')
    expect(currentStep.tagName.toLowerCase()).toBe('span')
    expect(screen.queryByRole('link', { name: 'Delivery ORD-100' })).toBeNull()

    // Separator chevron is rendered between steps but not after the last step
    const separators = screen.getAllByText('›')
    expect(separators).toHaveLength(1)
    expect(separators[0]).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders multi-step breadcrumb hierarchy correctly', () => {
    const steps = [
      { label: 'Home', href: '/' },
      { label: 'Deliveries', href: '/deliveries' },
      { label: 'Delivery 4822' },
    ]

    render(<Breadcrumb steps={steps} />)

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Deliveries' })).toHaveAttribute('href', '/deliveries')

    const lastStep = screen.getByText('Delivery 4822')
    expect(lastStep).toHaveAttribute('aria-current', 'page')
    expect(lastStep.tagName.toLowerCase()).toBe('span')

    expect(screen.getAllByText('›')).toHaveLength(2)
  })

  it('pins Fix 6: a ctrl, cmd, shift or middle click on the link does not call onClick (browser handles it), while plain left click calls onClick', () => {
    const handleDeliveriesClick = jest.fn()
    const steps = [
      { label: 'Deliveries', href: '/deliveries', onClick: handleDeliveriesClick },
      { label: 'Delivery ORD-100' },
    ]

    render(<Breadcrumb steps={steps} />)
    const deliveriesLink = screen.getByRole('link', { name: 'Deliveries' })

    // 1. Ctrl + click: browser handles new tab, onClick is NOT called
    fireEvent.click(deliveriesLink, { button: 0, ctrlKey: true })
    expect(handleDeliveriesClick).not.toHaveBeenCalled()

    // 2. Cmd / Meta + click: browser handles new tab, onClick is NOT called
    fireEvent.click(deliveriesLink, { button: 0, metaKey: true })
    expect(handleDeliveriesClick).not.toHaveBeenCalled()

    // 3. Shift + click: browser handles new window, onClick is NOT called
    fireEvent.click(deliveriesLink, { button: 0, shiftKey: true })
    expect(handleDeliveriesClick).not.toHaveBeenCalled()

    // 4. Middle click (button === 1): browser handles new tab, onClick is NOT called
    fireEvent.click(deliveriesLink, { button: 1 })
    expect(handleDeliveriesClick).not.toHaveBeenCalled()

    // 5. Plain left click (button === 0, no modifiers): handled in-app, calls onClick
    fireEvent.click(deliveriesLink, { button: 0 })
    expect(handleDeliveriesClick).toHaveBeenCalledTimes(1)
  })

  it('applies custom className to the nav element', () => {
    const { container } = render(
      <Breadcrumb steps={[{ label: 'Deliveries' }]} className="custom-breadcrumb-class" />
    )
    const nav = container.querySelector('nav')
    expect(nav?.className).toContain('custom-breadcrumb-class')
  })
})
