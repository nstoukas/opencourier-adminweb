import { BackendAdminSdk } from './backend-admin-sdk'
import { ApiError } from './errors'

describe('BackendAdminSdk error conversion (spec 0043, AC-6)', () => {
  const sdk = new BackendAdminSdk({ accessToken: 'test-token' })

  it('converts 409 BOX_OVER_CAPACITY body with heldUnits and deliveryUnits to ApiError with both numbers', () => {
    const errorBody = {
      code: 'BOX_OVER_CAPACITY',
      message: 'Assignment would exceed courier box capacity',
      statusCode: 409,
      heldUnits: 50,
      deliveryUnits: 60,
    }

    const converted = (sdk as any).convertApiError(errorBody)

    expect(converted).toBeInstanceOf(ApiError)
    const apiError = converted as ApiError
    expect(apiError.code).toBe('BOX_OVER_CAPACITY')
    expect(apiError.statusCode).toBe(409)
    expect(apiError.heldUnits).toBe(50)
    expect(apiError.deliveryUnits).toBe(60)
  })

  it('leaves heldUnits and deliveryUnits undefined when error does not have them or they are not numbers', () => {
    const regularError = {
      code: 'BAD_REQUEST',
      message: 'Invalid request',
      statusCode: 400,
    }

    const converted400 = (sdk as any).convertApiError(regularError) as ApiError
    expect(converted400).toBeInstanceOf(ApiError)
    expect(converted400.heldUnits).toBeUndefined()
    expect(converted400.deliveryUnits).toBeUndefined()

    const nonNumberUnitsError = {
      code: 'BOX_OVER_CAPACITY',
      message: 'Malformed numbers',
      statusCode: 409,
      heldUnits: '50',
      deliveryUnits: null,
    }

    const convertedMalformed = (sdk as any).convertApiError(nonNumberUnitsError) as ApiError
    expect(convertedMalformed).toBeInstanceOf(ApiError)
    expect(convertedMalformed.heldUnits).toBeUndefined()
    expect(convertedMalformed.deliveryUnits).toBeUndefined()
  })
})
