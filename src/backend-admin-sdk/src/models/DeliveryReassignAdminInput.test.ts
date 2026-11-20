import {
  type DeliveryReassignAdminInput,
  DeliveryReassignAdminInputFromJSON,
  DeliveryReassignAdminInputToJSON,
} from './DeliveryReassignAdminInput'

describe('DeliveryReassignAdminInput SDK serialization guards (spec 0043, AC-6)', () => {
  it('preserves confirmOverCapacity in ToJSON serialization', () => {
    // Load-bearing test guard: without confirmOverCapacity in DeliveryReassignAdminInputToJSON,
    // the admin's confirmation of over capacity would never leave the browser.
    const inputWithConfirm: DeliveryReassignAdminInput = {
      courierId: 'c1',
      confirmOverCapacity: true,
      payoutPolicy: 'HALF',
      message: 'moped broke down',
    }
    const json = DeliveryReassignAdminInputToJSON(inputWithConfirm)
    expect(json).toBeDefined()
    expect(json.confirmOverCapacity).toBe(true)
    expect(json.courierId).toBe('c1')

    const inputWithoutConfirm: DeliveryReassignAdminInput = {
      courierId: 'c2',
      confirmOverCapacity: false,
    }
    const jsonFalse = DeliveryReassignAdminInputToJSON(inputWithoutConfirm)
    expect(jsonFalse.confirmOverCapacity).toBe(false)
  })

  it('omits or keeps undefined confirmOverCapacity when not provided', () => {
    const inputWithout = {
      courierId: 'c1',
    }
    const json = DeliveryReassignAdminInputToJSON(inputWithout)
    expect(json.confirmOverCapacity).toBeUndefined()
  })

  it('handles undefined and null inputs in ToJSON', () => {
    expect(DeliveryReassignAdminInputToJSON(undefined)).toBeUndefined()
    expect(DeliveryReassignAdminInputToJSON(null)).toBeNull()
  })

  it('round-trips confirmOverCapacity through FromJSON and ToJSON', () => {
    const rawJson = {
      courierId: 'c3',
      confirmOverCapacity: true,
      payoutPolicy: 'FULL',
      message: 'swapping courier',
    }

    const model = DeliveryReassignAdminInputFromJSON(rawJson)
    expect(model.confirmOverCapacity).toBe(true)
    expect(model.courierId).toBe('c3')

    const serialized = DeliveryReassignAdminInputToJSON(model)
    expect(serialized.confirmOverCapacity).toBe(true)
    expect(serialized.courierId).toBe('c3')
  })
})
