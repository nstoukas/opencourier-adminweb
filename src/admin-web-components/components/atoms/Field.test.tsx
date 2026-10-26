import React from 'react'
import { render, screen } from '@testing-library/react'
import { Field, FieldGroup, FieldLabel } from './Field'

describe('Field atom (row 86)', () => {
  it('renders FieldGroup as a vertical stack of fields separated by 24px (gap-6)', () => {
    const { container } = render(
      <FieldGroup className="custom-group">
        <div>Field 1</div>
        <div>Field 2</div>
      </FieldGroup>
    )

    const group = container.querySelector('[data-slot="field-group"]')
    expect(group).toBeInTheDocument()
    expect(group?.className).toContain('flex')
    expect(group?.className).toContain('flex-col')
    expect(group?.className).toContain('gap-6')
    expect(group?.className).toContain('custom-group')
  })

  it('renders Field with role="group", data-slot="field", and 8px gap (gap-2)', () => {
    render(
      <Field className="custom-field">
        <span>Content</span>
      </Field>
    )

    const field = screen.getByRole('group')
    expect(field).toBeInTheDocument()
    expect(field).toHaveAttribute('data-slot', 'field')
    expect(field.className).toContain('flex')
    expect(field.className).toContain('flex-col')
    expect(field.className).toContain('gap-2')
    expect(field.className).toContain('custom-field')
  })

  it('renders FieldLabel with data-slot="field-label" and leading-snug', () => {
    render(
      <Field>
        <FieldLabel htmlFor="test-input">Test Label</FieldLabel>
        <input id="test-input" />
      </Field>
    )

    const label = screen.getByText('Test Label')
    expect(label).toBeInTheDocument()
    expect(label).toHaveAttribute('data-slot', 'field-label')
    expect(label.className).toContain('leading-snug')
    expect(label).toHaveAttribute('for', 'test-input')
  })
})
