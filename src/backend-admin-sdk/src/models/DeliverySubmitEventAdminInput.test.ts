import {
  type DeliverySubmitEventAdminInput,
  DeliverySubmitEventAdminInputFromJSON,
  DeliverySubmitEventAdminInputToJSON,
} from './DeliverySubmitEventAdminInput'

describe('DeliverySubmitEventAdminInput SDK serialization guards (spec 0015, AC-5)', () => {
  it('preserves cancelledBy in ToJSON serialization for COOP, RESTAURANT, and CUSTOMER', () => {
    // Load-bearing test guard: without cancelledBy in DeliverySubmitEventAdminInputToJSON,
    // the admin's choice of who cancelled would never leave the browser.
    const coopInput = {
      eventType: 'CANCELED' as any,
      cancelledBy: 'COOP' as const,
    } as DeliverySubmitEventAdminInput
    const coopJson = DeliverySubmitEventAdminInputToJSON(coopInput)
    expect(coopJson).toBeDefined()
    expect(coopJson.eventType).toBe('CANCELED')
    expect(coopJson.cancelledBy).toBe('COOP')

    const restaurantInput = {
      eventType: 'CANCELED' as any,
      cancelledBy: 'RESTAURANT' as const,
    } as DeliverySubmitEventAdminInput
    const restaurantJson = DeliverySubmitEventAdminInputToJSON(restaurantInput)
    expect(restaurantJson.cancelledBy).toBe('RESTAURANT')

    const customerInput = {
      eventType: 'CANCELED' as any,
      cancelledBy: 'CUSTOMER' as const,
    } as DeliverySubmitEventAdminInput
    const customerJson = DeliverySubmitEventAdminInputToJSON(customerInput)
    expect(customerJson.cancelledBy).toBe('CUSTOMER')
  })

  it('omits or keeps undefined cancelledBy when not provided', () => {
    const inputWithoutCancelledBy = {
      eventType: 'DISPATCHED' as any,
      courierId: 'c1',
    }
    const json = DeliverySubmitEventAdminInputToJSON(inputWithoutWithoutCancelledBy(inputWithoutCancelledBy))
    expect(json.cancelledBy).toBeUndefined()
  })

  it('handles undefined and null inputs in ToJSON', () => {
    expect(DeliverySubmitEventAdminInputToJSON(undefined)).toBeUndefined()
    expect(DeliverySubmitEventAdminInputToJSON(null)).toBeNull()
  })

  it('round-trips cancelledBy through FromJSON and ToJSON', () => {
    const rawJson = {
      eventType: 'CANCELED',
      cancelledBy: 'RESTAURANT',
      courierId: 'courier-1',
    }

    const model = DeliverySubmitEventAdminInputFromJSON(rawJson)
    expect(model.eventType).toBe('CANCELED')
    expect(model.cancelledBy).toBe('RESTAURANT')
    expect(model.courierId).toBe('courier-1')

    const serialized = DeliverySubmitEventAdminInputToJSON(model)
    expect(serialized.cancelledBy).toBe('RESTAURANT')
    expect(serialized.eventType).toBe('CANCELED')
    expect(serialized.courierId).toBe('courier-1')
  })

  it('deserializes missing cancelledBy as undefined in FromJSON', () => {
    const rawJson = {
      eventType: 'CANCELED',
    }

    const model = DeliverySubmitEventAdminInputFromJSON(rawJson)
    expect(model.cancelledBy).toBeUndefined()
  })

  it('preserves confirmOverCapacity in ToJSON and FromJSON (spec 0043, AC-6)', () => {
    // Load-bearing test guard: confirmOverCapacity must survive serialization
    // so an admin's override past a full box reaches the backend.
    const inputWithConfirm: DeliverySubmitEventAdminInput = {
      deliveryId: 'del-1',
      eventType: 'ACCEPTED' as any,
      courierId: 'courier-1',
      confirmOverCapacity: true,
    }
    const json = DeliverySubmitEventAdminInputToJSON(inputWithConfirm)
    expect(json.confirmOverCapacity).toBe(true)

    const inputFalse: DeliverySubmitEventAdminInput = {
      deliveryId: 'del-1',
      eventType: 'ACCEPTED' as any,
      courierId: 'courier-2',
      confirmOverCapacity: false,
    }
    const jsonFalse = DeliverySubmitEventAdminInputToJSON(inputFalse)
    expect(jsonFalse.confirmOverCapacity).toBe(false)

    const fromJson = DeliverySubmitEventAdminInputFromJSON({
      eventType: 'ACCEPTED',
      courierId: 'courier-1',
      confirmOverCapacity: true,
    })
    expect(fromJson.confirmOverCapacity).toBe(true)
  })
})

function inputWithoutWithoutCancelledBy(input: any) {
  return input
}
