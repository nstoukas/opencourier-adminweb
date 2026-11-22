import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FairnessCard } from './cards/SettingsCards'
import {
  EMPTY_FORM,
  SETTINGS,
  blockers as rawBlockers,
  formFromSettings,
  labelOf as rawLabelOf,
  pendingChanges as rawPendingChanges,
  savePayload,
  type SettingsForm,
} from './settingsDiff'
import { InstanceConfigSettingsAdminInputToJSON } from '../../backend-admin-sdk/src/models/InstanceConfigSettingsAdminInput'
import {
  InstanceConfigSettingsDtoFromJSON,
  InstanceConfigSettingsDtoToJSON,
} from '../../backend-admin-sdk/src/models/InstanceConfigSettingsDto'
import { createI18n } from '@/i18n/createI18n'

const t = createI18n('en').t
const labelOf = (key: any) => rawLabelOf(t, key)
const pendingChanges = (saved: SettingsForm | null, edited: SettingsForm) =>
  rawPendingChanges(t, 'en', saved, edited)
const blockers = (changes: any[], edited: SettingsForm) => rawBlockers(t, changes, edited)

// Spec 0049 (row 79; AC-1, cross check 5): the fourth fairness weight, "Weight of being on a booked
// shift", 0 to 100, on the Fairness card. It reads the saved value, saves through the SDK, and never
// counts toward the "three weights cannot all be 0" rule.
describe('the shift weight on Instance configuration (spec 0049, AC-1)', () => {
  const LABEL = 'Weight of being on a booked shift'
  const ALL_ZERO = `${labelOf('fairnessWeightRoadTime')}, ${labelOf('fairnessWeightEarnings')} and ${labelOf('fairnessWeightWaiting')} cannot all be 0`

  const saved: SettingsForm = {
    ...EMPTY_FORM,
    fairnessWeightRoadTime: '50',
    fairnessWeightEarnings: '30',
    fairnessWeightWaiting: '20',
    fairnessWeightShift: '0',
    fairnessCandidateLimit: '10',
    fairnessMinOnlineMinutes: '30',
  }
  const dummyOptions = {
    currency: ['EUR'],
    distanceUnit: ['KILOMETERS'],
    quoteCalculationType: ['BY_DISTANCE'],
    courierMatcherType: ['FAIRNESS'],
  }

  describe('the Fairness card field', () => {
    function renderCard(form: SettingsForm, loaded = true) {
      const set = jest.fn()
      render(<FairnessCard form={form} set={set} options={dummyOptions as never} loaded={loaded} />)
      return set
    }

    it('shows the saved value in a number box from 0 to 100', () => {
      renderCard({ ...saved, fairnessWeightShift: '40' })
      const input = screen.getByLabelText(LABEL) as HTMLInputElement
      expect(input.value).toBe('40')
      expect(input).toHaveAttribute('type', 'number')
      expect(input).toHaveAttribute('min', '0')
      expect(input).toHaveAttribute('max', '100')
      expect(input).not.toBeDisabled()
    })

    it('shows a saved 0 as 0, not as an empty box', () => {
      renderCard(saved)
      expect((screen.getByLabelText(LABEL) as HTMLInputElement).value).toBe('0')
    })

    it('an edit sets fairnessWeightShift and no other setting', () => {
      const set = renderCard(saved)
      fireEvent.change(screen.getByLabelText(LABEL), { target: { value: '60' } })
      expect(set).toHaveBeenCalledTimes(1)
      expect(set).toHaveBeenCalledWith('fairnessWeightShift', '60')
    })

    it('is disabled until the settings have loaded', () => {
      renderCard(saved, false)
      expect(screen.getByLabelText(LABEL)).toBeDisabled()
    })

    it('says it applies only while Shifts is on and does not count toward the three weights', () => {
      renderCard(saved)
      const input = screen.getByLabelText(LABEL)
      const described = input.getAttribute('aria-describedby')
      const text = described
        ? described
            .split(' ')
            .map((id) => document.getElementById(id)?.textContent ?? '')
            .join(' ')
        : document.body.textContent ?? ''
      expect(text).toMatch(/Only while Shifts is on/)
      expect(text).toMatch(/does not count toward the three above/)
    })

    it('the other weights are still bound to their own settings', () => {
      const set = renderCard(saved)
      fireEvent.change(screen.getByLabelText('Weight of road time to the restaurant'), { target: { value: '45' } })
      expect(set).toHaveBeenCalledWith('fairnessWeightRoadTime', '45')
      expect(set).not.toHaveBeenCalledWith('fairnessWeightShift', expect.anything())
    })
  })

  describe('reading the saved value', () => {
    it('is a setting of the page, a number, with its label', () => {
      const definition = SETTINGS.find((setting) => setting.key === 'fairnessWeightShift')
      expect(definition).toBeDefined()
      expect(definition?.kind).toBe('number')
      expect(definition?.labelKey).toBe('settings.labels.fairnessWeightShift')
      expect(labelOf('fairnessWeightShift')).toBe(LABEL)
    })

    it('the SDK Dto carries fairnessWeightShift from the backend JSON', () => {
      expect(InstanceConfigSettingsDtoFromJSON({ fairnessWeightShift: 40 }).fairnessWeightShift).toBe(40)
      expect(InstanceConfigSettingsDtoFromJSON({ fairnessWeightShift: 0 }).fairnessWeightShift).toBe(0)
      expect(InstanceConfigSettingsDtoToJSON({ fairnessWeightShift: 40 } as never).fairnessWeightShift).toBe(40)
    })

    it('an older backend that does not send it gives null, and an empty box', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({ fairnessWeightRoadTime: 50 })
      expect(dto.fairnessWeightShift).toBeNull()
      expect(formFromSettings(dto as never).fairnessWeightShift).toBe('')
    })

    it('the form box is filled from the saved value, through the Dto', () => {
      const dto = InstanceConfigSettingsDtoFromJSON({ fairnessWeightShift: 40 })
      expect(formFromSettings(dto as never).fairnessWeightShift).toBe('40')
      expect(formFromSettings({ fairnessWeightShift: 0 }).fairnessWeightShift).toBe('0')
    })
  })

  describe('saving', () => {
    it('a changed value is a pending change with its label, from and to', () => {
      const edited = { ...saved, fairnessWeightShift: '60' }
      const changes = pendingChanges(saved, edited)
      expect(changes).toHaveLength(1)
      expect(changes[0]).toMatchObject({ key: 'fairnessWeightShift', label: LABEL, from: '0', to: '60' })
    })

    it('the save payload sends it as a number, and nothing else', () => {
      const edited = { ...saved, fairnessWeightShift: '60' }
      const payload = savePayload(pendingChanges(saved, edited), edited, {})
      expect(payload).toEqual({ fairnessWeightShift: 60 })
    })

    it('a change back to 0 is sent as the number 0', () => {
      const before = { ...saved, fairnessWeightShift: '60' }
      const edited = { ...saved, fairnessWeightShift: '0' }
      const payload = savePayload(pendingChanges(before, edited), edited, {})
      expect(payload).toEqual({ fairnessWeightShift: 0 })
    })

    // The adminweb gotcha: without the AdminInput serializer line a save drops the setting silently.
    it('the SDK AdminInput serializer keeps fairnessWeightShift on the wire', () => {
      const edited = { ...saved, fairnessWeightShift: '60' }
      const payload = savePayload(pendingChanges(saved, edited), edited, {})
      const wire = InstanceConfigSettingsAdminInputToJSON(payload as never)
      expect(wire.fairnessWeightShift).toBe(60)
      expect(JSON.parse(JSON.stringify(wire))).toEqual({ fairnessWeightShift: 60 })
    })

    it('the serializer keeps a 0 too', () => {
      const wire = InstanceConfigSettingsAdminInputToJSON({ fairnessWeightShift: 0 } as never)
      expect(JSON.parse(JSON.stringify(wire))).toEqual({ fairnessWeightShift: 0 })
    })

    it('an untouched shift weight is not sent with another change', () => {
      const edited = { ...saved, fairnessWeightRoadTime: '40' }
      const payload = savePayload(pendingChanges(saved, edited), edited, {})
      expect(payload).toEqual({ fairnessWeightRoadTime: 40 })
    })

    it('an empty box blocks the save, as for any number', () => {
      const edited = { ...saved, fairnessWeightShift: '' }
      const found = blockers(pendingChanges(saved, edited), edited)
      expect(found.join(' ')).toContain(LABEL)
    })

    it('a value from 0 to 100 raises no blocker', () => {
      for (const value of ['0', '1', '60', '100']) {
        const before = { ...saved, fairnessWeightShift: '7' }
        const edited = { ...saved, fairnessWeightShift: value }
        expect(blockers(pendingChanges(before, edited), edited)).toEqual([])
      }
    })
  })

  // Cross check 5: "it never counts toward the 'not every weight 0' rule".
  describe('the "cannot all be 0" rule ignores it', () => {
    it('a shift weight above 0 does not let the three core weights all be 0', () => {
      const edited = {
        ...saved,
        fairnessWeightRoadTime: '0',
        fairnessWeightEarnings: '0',
        fairnessWeightWaiting: '0',
        fairnessWeightShift: '100',
      }
      expect(blockers(pendingChanges(saved, edited), edited)).toContain(ALL_ZERO)
    })

    it('a saved shift weight above 0 does not let the last core weight go to 0', () => {
      const before = { ...saved, fairnessWeightRoadTime: '0', fairnessWeightEarnings: '0', fairnessWeightShift: '100' }
      const edited = { ...before, fairnessWeightWaiting: '0' }
      expect(blockers(pendingChanges(before, edited), edited)).toContain(ALL_ZERO)
    })

    it('setting the shift weight to 0 while a core weight is above 0 is allowed', () => {
      const before = { ...saved, fairnessWeightShift: '40' }
      const edited = { ...before, fairnessWeightShift: '0' }
      expect(blockers(pendingChanges(before, edited), edited)).toEqual([])
    })

    it('changing only the shift weight never raises the rule, whatever the three saved weights are', () => {
      const before = { ...saved, fairnessWeightRoadTime: '0', fairnessWeightEarnings: '0', fairnessWeightWaiting: '0' }
      for (const value of ['0', '50']) {
        const edited = { ...before, fairnessWeightShift: value === '0' ? '0' : value }
        const from = { ...before, fairnessWeightShift: '7' }
        expect(blockers(pendingChanges(from, edited), edited)).not.toContain(ALL_ZERO)
      }
    })

    it('the rule names the three core weights only', () => {
      expect(ALL_ZERO).not.toContain(LABEL)
    })
  })
})
