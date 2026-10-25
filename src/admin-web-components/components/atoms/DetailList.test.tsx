import React from 'react'
import { render } from '@testing-library/react'
import { DetailList } from './DetailList'

describe('DetailList component', () => {
  it('renders a dl with one dt/dd pair per item in order', () => {
    const items = [
      { label: 'First Label', value: 'First Value' },
      { label: 'Second Label', value: 'Second Value' },
      { label: 'Third Label', value: 'Third Value' },
    ]

    const { container } = render(<DetailList items={items} />)
    const dl = container.querySelector('dl')
    expect(dl).not.toBeNull()

    const dts = container.querySelectorAll('dt')
    const dds = container.querySelectorAll('dd')

    expect(dts).toHaveLength(3)
    expect(dds).toHaveLength(3)

    expect(dts[0]?.textContent).toBe('First Label')
    expect(dds[0]?.textContent).toBe('First Value')

    expect(dts[1]?.textContent).toBe('Second Label')
    expect(dds[1]?.textContent).toBe('Second Value')

    expect(dts[2]?.textContent).toBe('Third Label')
    expect(dds[2]?.textContent).toBe('Third Value')
  })

  it('renders null, undefined, and empty string as an em dash', () => {
    const items = [
      { label: 'Null Value', value: null },
      { label: 'Undefined Value', value: undefined },
      { label: 'Empty String Value', value: '' },
    ]

    const { container } = render(<DetailList items={items} />)
    const dds = container.querySelectorAll('dd')

    expect(dds[0]?.textContent).toBe('—')
    expect(dds[1]?.textContent).toBe('—')
    expect(dds[2]?.textContent).toBe('—')
  })

  it('renders numeric 0 as "0" and never as an em dash', () => {
    const items = [
      { label: 'Zero Value', value: 0 },
      { label: 'Non-zero Value', value: 42 },
    ]

    const { container } = render(<DetailList items={items} />)
    const dds = container.querySelectorAll('dd')

    expect(dds[0]?.textContent).toBe('0')
    expect(dds[0]?.textContent).not.toBe('—')
    expect(dds[1]?.textContent).toBe('42')
  })

  it('adds font-mono class to dd only when mono is true', () => {
    const items = [
      { label: 'Standard Text', value: 'Plain text', mono: false },
      { label: 'Code or ID', value: 'dlv_12345', mono: true },
      { label: 'Default Mono Omitted', value: 'Default plain' },
    ]

    const { container } = render(<DetailList items={items} />)
    const dds = container.querySelectorAll('dd')

    expect(dds[0]?.className).not.toContain('font-mono')
    expect(dds[1]?.className).toContain('font-mono')
    expect(dds[2]?.className).not.toContain('font-mono')
  })

  it('applies custom className to the dl container', () => {
    const { container } = render(<DetailList items={[]} className="custom-test-class" />)
    const dl = container.querySelector('dl')
    expect(dl?.className).toContain('custom-test-class')
  })
})
