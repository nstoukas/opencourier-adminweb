import React from 'react'
import { render, screen } from '@testing-library/react'
import fs from 'fs'
import path from 'path'
import { Button, buttonVariants } from './Button'
import { Badge, badgeVariants } from './Badge'
import { Alert, AlertTitle, AlertDescription } from './Alert'
import { Spinner } from './Spinner'
import { Icons } from './Icons'
import {
  StatusBadge as BarrelStatusBadge,
  DetailList as BarrelDetailList,
  Spinner as BarrelSpinner,
} from '../../index'

describe('Design system atoms: variants, compositions, icons, and guards', () => {
  describe('buttonVariants (atoms/Button.tsx)', () => {
    it('has success and warning variants', () => {
      const successClasses = buttonVariants({ variant: 'success' })
      expect(successClasses).toContain('bg-success')
      expect(successClasses).toContain('text-success-foreground')

      const warningClasses = buttonVariants({ variant: 'warning' })
      expect(warningClasses).toContain('bg-warning')
      expect(warningClasses).toContain('text-warning-foreground')
    })

    it('has sizes xl, offer, and icon-xl', () => {
      const xlClasses = buttonVariants({ size: 'xl' })
      expect(xlClasses).toContain('h-12')

      const offerClasses = buttonVariants({ size: 'offer' })
      expect(offerClasses).toContain('h-offer')

      const iconXlClasses = buttonVariants({ size: 'icon-xl' })
      expect(iconXlClasses).toContain('size-12')
    })

    it('renders Button component with the new variants and sizes', () => {
      const { rerender } = render(
        <Button variant="success" size="xl">
          Accept Delivery
        </Button>
      )
      let button = screen.getByRole('button', { name: 'Accept Delivery' })
      expect(button.className).toContain('bg-success')
      expect(button.className).toContain('h-12')

      rerender(
        <Button variant="warning" size="offer">
          Decline Offer
        </Button>
      )
      button = screen.getByRole('button', { name: 'Decline Offer' })
      expect(button.className).toContain('bg-warning')
      expect(button.className).toContain('h-offer')
    })
  })

  describe('badgeVariants (atoms/Badge.tsx)', () => {
    it('has success, warning, and info variants', () => {
      const successClasses = badgeVariants({ variant: 'success' })
      expect(successClasses).toContain('bg-success-soft')
      expect(successClasses).toContain('border-success/30')

      const warningClasses = badgeVariants({ variant: 'warning' })
      expect(warningClasses).toContain('bg-warning-soft')
      expect(warningClasses).toContain('border-warning-foreground/20')

      const infoClasses = badgeVariants({ variant: 'info' })
      expect(infoClasses).toContain('bg-info-soft')
      expect(infoClasses).toContain('text-info')
      expect(infoClasses).toContain('border-info/25')
    })

    it('renders Badge component with new variants', () => {
      const { rerender } = render(<Badge variant="success">Active</Badge>)
      expect(screen.getByText('Active').className).toContain('bg-success-soft')

      rerender(<Badge variant="warning">Pending</Badge>)
      expect(screen.getByText('Pending').className).toContain('bg-warning-soft')

      rerender(<Badge variant="info">Notice</Badge>)
      expect(screen.getByText('Notice').className).toContain('bg-info-soft')
    })
  })

  describe('Alert (atoms/Alert.tsx)', () => {
    it('renders success, warning, and info with their soft ground classes', () => {
      const { rerender, container } = render(
        <Alert variant="success">
          <AlertTitle>Success Title</AlertTitle>
          <AlertDescription>Success description</AlertDescription>
        </Alert>
      )
      let alert = container.querySelector('[role="alert"]')
      expect(alert?.className).toContain('bg-success-soft')

      rerender(
        <Alert variant="warning">
          <AlertTitle>Warning Title</AlertTitle>
          <AlertDescription>Warning description</AlertDescription>
        </Alert>
      )
      alert = container.querySelector('[role="alert"]')
      expect(alert?.className).toContain('bg-warning-soft')

      rerender(
        <Alert variant="info">
          <AlertTitle>Info Title</AlertTitle>
          <AlertDescription>Info description</AlertDescription>
        </Alert>
      )
      alert = container.querySelector('[role="alert"]')
      expect(alert?.className).toContain('bg-info-soft')
    })
  })

  describe('Spinner (atoms/Spinner.tsx)', () => {
    it('renders role="status" with default aria-label="Loading" and animate-spin class', () => {
      render(<Spinner />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', 'Loading')
      expect(spinner.getAttribute('class')).toContain('animate-spin')
      expect(spinner).toHaveClass('animate-spin')
    })

    it('accepts a custom label and preserves animate-spin class', () => {
      render(<Spinner label="Submitting event..." className="custom-spin-class" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', 'Submitting event...')
      expect(spinner.getAttribute('class')).toContain('animate-spin')
      expect(spinner.getAttribute('class')).toContain('custom-spin-class')
      expect(spinner).toHaveClass('animate-spin')
      expect(spinner).toHaveClass('custom-spin-class')
    })
  })

  describe('Icons (atoms/Icons.tsx)', () => {
    it('has no spinner key any more', () => {
      expect('spinner' in Icons).toBe(false)
      expect((Icons as any).spinner).toBeUndefined()
    })
  })

  describe('admin-web-components barrel exports', () => {
    it('exports StatusBadge, DetailList, and Spinner from barrel', () => {
      expect(BarrelStatusBadge).toBeDefined()
      expect(BarrelDetailList).toBeDefined()
      expect(BarrelSpinner).toBeDefined()
    })
  })

  describe('icon package migration guard', () => {
    const rootDir = path.resolve(__dirname, '../../../../')
    const srcDir = path.resolve(rootDir, 'src')
    const pkgJsonPath = path.resolve(rootDir, 'package.json')
    const forbiddenPackage = ['lucide', 'react'].join('-')

    it('ensures no .ts/.tsx/.js/.jsx file in src contains legacy icon package import', () => {
      const offendingFiles: string[] = []

      function walkDirectory(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.next') {
              continue
            }
            walkDirectory(fullPath)
          } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            if (fullPath === __filename) {
              continue
            }
            const content = fs.readFileSync(fullPath, 'utf8')
            if (content.includes(forbiddenPackage)) {
              const relativePath = path.relative(rootDir, fullPath)
              offendingFiles.push(relativePath)
            }
          }
        }
      }

      walkDirectory(srcDir)

      expect(offendingFiles).toEqual([])
    })

    it('ensures package.json lists neither legacy icon package in dependencies nor devDependencies, and lists @phosphor-icons/react', () => {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
      const deps = pkg.dependencies || {}
      const devDeps = pkg.devDependencies || {}

      expect(deps[forbiddenPackage]).toBeUndefined()
      expect(devDeps[forbiddenPackage]).toBeUndefined()
      expect(deps['@phosphor-icons/react']).toBeDefined()
    })
  })
})
