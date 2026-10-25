import fs from 'fs'
import path from 'path'
import adminTailwindConfig from './admin.tailwind.config'

// Helper: converts a 7-character hex color ('#rrggbb') into HSL values.
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
  }
}

describe('Design system theme matches tokens.json in globals.css and admin.tailwind.config.ts', () => {
  const designSystemDir = path.resolve(__dirname, '../../../opencourier-design-system')
  const tokensPath = path.resolve(designSystemDir, 'tokens/tokens.json')
  const globalsCssPath = path.resolve(__dirname, '../admin-web-components/styles/globals.css')

  const tokensExist = fs.existsSync(tokensPath)
  const describeOrSkip = tokensExist ? describe : describe.skip

  describeOrSkip('tokens.json alignment in globals.css', () => {
    it('matches every light color token hex value to an HSL CSS variable in globals.css', () => {
      const tokensData = JSON.parse(fs.readFileSync(tokensPath, 'utf8'))
      const globalsCss = fs.readFileSync(globalsCssPath, 'utf8')

      const tokenMap = new Map<string, any>()
      for (const token of tokensData.color.tokens) {
        tokenMap.set(token.name, token.value)
      }

      // Resolves references like '{foreground}' to the ultimate value.
      function resolveLightValue(val: any): any {
        if (typeof val === 'object' && val !== null) {
          val = val.light
        }
        while (typeof val === 'string' && val.startsWith('{') && val.endsWith('}')) {
          const refName = val.slice(1, -1)
          val = tokenMap.get(refName)
          if (typeof val === 'object' && val !== null) {
            val = val.light
          }
        }
        return val
      }

      let hexTokenCount = 0

      for (const token of tokensData.color.tokens) {
        // Overlay is defined in Tailwind config directly (rgb(0 0 0 / 0.5)) and allowed to be absent from globals.css
        if (token.name === 'overlay') {
          continue
        }

        const lightValue = resolveLightValue(token.value)
        if (typeof lightValue === 'string' && /^#[0-9a-fA-F]{6}$/.test(lightValue)) {
          hexTokenCount++
          // Deleting any variable must fail this test
          const varRegex = new RegExp(`--${token.name}:\\s*([^;]+);`)
          const match = globalsCss.match(varRegex)

          expect(match).not.toBeNull()
          if (!match || !match[1]) {
            throw new Error(`CSS variable --${token.name} is missing from globals.css`)
          }

          const parts = match[1].trim().split(/\s+/)
          const rawH = parts[0] ?? '0'
          const rawS = parts[1] ?? '0'
          const rawL = parts[2] ?? '0'

          const h = parseFloat(rawH)
          const s = parseFloat(rawS)
          const l = parseFloat(rawL)

          const expectedHsl = hexToHsl(lightValue)

          // Allow 1 degree on H when saturation > 1%
          if (expectedHsl.s > 1) {
            const hDiff = Math.abs(h - expectedHsl.h)
            expect(hDiff).toBeLessThanOrEqual(1.0)
          }

          // Allow 0.3 rounding on S and L
          const sDiff = Math.abs(s - expectedHsl.s)
          expect(sDiff).toBeLessThanOrEqual(0.3)

          const lDiff = Math.abs(l - expectedHsl.l)
          expect(lDiff).toBeLessThanOrEqual(0.3)
        }
      }

      // Assert that we checked a substantial number of tokens (> 30)
      expect(hexTokenCount).toBeGreaterThan(30)
    })

    it('sets --radius to exactly 0.625rem in globals.css', () => {
      const globalsCss = fs.readFileSync(globalsCssPath, 'utf8')
      const radiusMatch = globalsCss.match(/--radius:\s*([^;]+);/)
      expect(radiusMatch).not.toBeNull()
      if (!radiusMatch || !radiusMatch[1]) {
        throw new Error('Missing --radius in globals.css')
      }
      expect(radiusMatch[1].trim()).toBe('0.625rem')
    })

    it('contains no .dark block in globals.css (light only, decision D6)', () => {
      const globalsCss = fs.readFileSync(globalsCssPath, 'utf8')
      // Ensure no .dark CSS selector rule exists
      expect(globalsCss).not.toMatch(/\.dark\s*\{/)
    })
  })

  describe('clean skip when design system folder is absent', () => {
    it('gracefully reports skipped if design system tokens are missing', () => {
      if (!tokensExist) {
        // clean skip without crash
        expect(true).toBe(true)
      }
    })
  })

  describe('admin.tailwind.config.ts exports', () => {
    const theme = (adminTailwindConfig.theme as any)?.extend

    it('exposes success, warning, and info with DEFAULT, foreground, and soft', () => {
      const colors = theme?.colors
      expect(colors).toBeDefined()

      // success
      expect(colors.success).toEqual({
        DEFAULT: 'hsl(var(--success))',
        foreground: 'hsl(var(--success-foreground))',
        soft: 'hsl(var(--success-soft))',
      })

      // warning
      expect(colors.warning).toEqual({
        DEFAULT: 'hsl(var(--warning))',
        foreground: 'hsl(var(--warning-foreground))',
        soft: 'hsl(var(--warning-soft))',
      })

      // info
      expect(colors.info).toEqual({
        DEFAULT: 'hsl(var(--info))',
        foreground: 'hsl(var(--info-foreground))',
        soft: 'hsl(var(--info-soft))',
      })
    })

    it('exposes destructive.soft', () => {
      const colors = theme?.colors
      expect(colors.destructive?.soft).toBe('hsl(var(--destructive-soft))')
    })

    it('exposes chart 1 to 5', () => {
      const colors = theme?.colors
      expect(colors.chart).toEqual({
        1: 'hsl(var(--chart-1))',
        2: 'hsl(var(--chart-2))',
        3: 'hsl(var(--chart-3))',
        4: 'hsl(var(--chart-4))',
        5: 'hsl(var(--chart-5))',
      })
    })

    it('exposes sidebar tokens, route, online-tint, offline-tint, and overlay', () => {
      const colors = theme?.colors

      // sidebar
      expect(colors.sidebar).toEqual({
        DEFAULT: 'hsl(var(--sidebar))',
        foreground: 'hsl(var(--sidebar-foreground))',
        primary: 'hsl(var(--sidebar-primary))',
        'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
        accent: 'hsl(var(--sidebar-accent))',
        'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
        border: 'hsl(var(--sidebar-border))',
        ring: 'hsl(var(--sidebar-ring))',
      })

      // route, tints, overlay
      expect(colors.route).toBe('hsl(var(--route))')
      expect(colors['online-tint']).toBe('hsl(var(--online-tint))')
      expect(colors['offline-tint']).toBe('hsl(var(--offline-tint))')
      expect(colors.overlay).toBe('rgb(0 0 0 / 0.5)')
    })

    it('exposes height.offer as 100px', () => {
      expect(theme?.height?.offer).toBe('100px')
    })

    it('exposes borderRadius sm, md, lg, xl, 2xl with exact calculation scale', () => {
      expect(theme?.borderRadius).toEqual({
        sm: 'calc(var(--radius) * 0.6)',
        md: 'calc(var(--radius) * 0.8)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) * 1.4)',
        '2xl': 'calc(var(--radius) * 1.8)',
      })
    })
  })
})
