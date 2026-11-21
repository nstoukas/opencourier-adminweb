import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { RestaurantDelaysCard } from './cards/SettingsCards'
import { EMPTY_FORM, SETTINGS, blockers, formFromSettings, labelOf, pendingChanges, savePayload, type SettingsForm } from './settingsDiff'

// Spec 0047, AC-2: `splitAnswerMinutes` is a co-op setting (binding value 2: set by representatives in
// admin), default 10, from 1 to 60: how long a rider waits for dispatch's answer before they may leave.
describe('the splitAnswerMinutes setting in admin (spec 0047, AC-2)', () => {
  const LABEL = 'Minutes before a rider can leave an order not split'
  const savedForm: SettingsForm = { ...EMPTY_FORM, waitPayEnabled: true, waitLimitMinutes: '10', splitAnswerMinutes: '10' }

  describe('the box on the Restaurant delays card', () => {
    const card = (form: Partial<SettingsForm>, props: { loaded?: boolean; set?: jest.Mock } = {}) =>
      render(
        <RestaurantDelaysCard
          form={{ ...savedForm, ...form }}
          set={props.set ?? jest.fn()}
          options={{} as any}
          loaded={props.loaded ?? true}
        />
      )

    it('shows the saved value, with the limits 1 to 60', () => {
      card({ splitAnswerMinutes: '10' })

      const input = screen.getByLabelText(LABEL) as HTMLInputElement
      expect(input.id).toBe('splitAnswerMinutes')
      expect(input.value).toBe('10')
      expect(input).toHaveAttribute('min', '1')
      expect(input).toHaveAttribute('max', '60')
      expect(input).not.toBeDisabled()
    })

    it('shows the value it was given, not a fixed 10', () => {
      card({ splitAnswerMinutes: '25' })
      expect((screen.getByLabelText(LABEL) as HTMLInputElement).value).toBe('25')
    })

    it('writes a typed value into the form under its own key', () => {
      const set = jest.fn()
      card({ splitAnswerMinutes: '10' }, { set })

      fireEvent.change(screen.getByLabelText(LABEL), { target: { value: '15' } })

      expect(set).toHaveBeenCalledWith('splitAnswerMinutes', '15')
    })

    it('says what happens when nobody answers in time', () => {
      card({})
      expect(screen.getByText(/the rider may leave and the order is cancelled as the restaurant's/)).toBeInTheDocument()
    })

    it('is off until the settings have loaded, so an empty box is never saved over the real value', () => {
      card({ splitAnswerMinutes: '' }, { loaded: false })
      expect(screen.getByLabelText(LABEL)).toBeDisabled()
    })
  })

  describe('the form and what Save sends', () => {
    it('is one of the settings, a number, with its label', () => {
      expect(SETTINGS.find((setting) => setting.key === 'splitAnswerMinutes')).toMatchObject({ kind: 'number', label: LABEL })
      expect(labelOf('splitAnswerMinutes')).toBe(LABEL)
    })

    it('fills the box from the saved settings, and leaves it empty when the server sent none', () => {
      expect(formFromSettings({ splitAnswerMinutes: 10 }).splitAnswerMinutes).toBe('10')
      expect(formFromSettings({ splitAnswerMinutes: 1 }).splitAnswerMinutes).toBe('1')
      expect(formFromSettings({}).splitAnswerMinutes).toBe('')
    })

    it('an edit shows as one pending change, from the old value to the new', () => {
      const edited = { ...savedForm, splitAnswerMinutes: '15' }
      expect(pendingChanges(savedForm, edited)).toEqual([{ key: 'splitAnswerMinutes', label: LABEL, from: '10', to: '15' }])
    })

    it('Save sends it as a number, and sends nothing else', () => {
      const edited = { ...savedForm, splitAnswerMinutes: '15' }
      const payload = savePayload(pendingChanges(savedForm, edited), edited, {})

      expect(payload).toEqual({ splitAnswerMinutes: 15 })
      expect(typeof payload.splitAnswerMinutes).toBe('number')
    })

    it('an emptied box blocks the save, so it is never sent as 0', () => {
      const edited = { ...savedForm, splitAnswerMinutes: '' }
      expect(blockers(pendingChanges(savedForm, edited), edited)).toContain(`${LABEL} is empty`)
    })

    it('an untouched value is not sent', () => {
      const edited = { ...savedForm, waitLimitMinutes: '20' }
      expect(savePayload(pendingChanges(savedForm, edited), edited, {})).not.toHaveProperty('splitAnswerMinutes')
    })
  })
})
