import { SavedCustomersApi } from './SavedCustomersApi'
import { Configuration } from '../runtime'
import {
  SavedCustomerAdminDtoFromJSON,
  SavedCustomerListAdminDtoFromJSON,
  SavedCustomerUpdateAdminInputToJSON,
} from '../models/SavedCustomerAdminDto'
import { BackendAdminSdk } from '../backend-admin-sdk'

function createMockResponse(body: any, status = 200): Response {
  return {
    status,
    headers: {
      get: (header: string) => (header.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone: function () {
      return this
    },
  } as unknown as Response
}

describe('SavedCustomersApi (spec 0005, AC-6)', () => {
  const mockFetch = jest.fn()
  let api: SavedCustomersApi

  beforeEach(() => {
    jest.clearAllMocks()
    const config = new Configuration({
      fetchApi: mockFetch,
      basePath: 'http://localhost:3000',
      accessToken: () => Promise.resolve('test-token'),
    })
    api = new SavedCustomersApi(config)
  })

  it('calls GET /api/admin/v1/partners/{partnerId}/customers with q, page, perPage and URL-encodes partnerId', async () => {
    const mockResponsePayload = {
      items: [
        {
          id: 'cust-1',
          name: 'Maria Papadopoulou',
          phone: '+306912345678',
          notes: 'Ring 3rd floor',
          addressLine1: 'Iasonos 10',
          addressLine2: 'Floor 3',
          city: 'Volos',
          zipCode: '38221',
          latitude: 39.362,
          longitude: 22.942,
          formattedAddress: 'Iasonos 10, Volos 38221',
          lastUsedAt: '2026-10-26T10:00:00.000Z',
          createdAt: '2026-10-26T09:00:00.000Z',
          updatedAt: '2026-10-26T09:00:00.000Z',
        },
      ],
      total: 1,
    }

    mockFetch.mockResolvedValueOnce(createMockResponse(mockResponsePayload, 200))

    const result = await api.listCustomers({
      partnerId: 'partner/123 special',
      q: 'Maria Papadopoulou',
      page: 2,
      perPage: 20,
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = mockFetch.mock.calls[0]

    expect(calledUrl).toBe(
      'http://localhost:3000/api/admin/v1/partners/partner%2F123%20special/customers?q=Maria%20Papadopoulou&page=2&perPage=20'
    )
    expect(calledInit.method).toBe('GET')
    expect(calledInit.headers['Authorization']).toBe('Bearer test-token')
    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Maria Papadopoulou')
  })

  it('calls PATCH .../customers/{id} with only name, phone, addressLine2, notes in body and reads answer customer', async () => {
    const mockCustomerResponse = {
      customer: {
        id: 'cust-1',
        name: 'Maria Updated',
        phone: '+306912345678',
        notes: 'Doorbell broken',
        addressLine1: 'Iasonos 10',
        addressLine2: 'Apt 4B',
        city: 'Volos',
        zipCode: '38221',
        latitude: 39.362,
        longitude: 22.942,
        formattedAddress: 'Iasonos 10, Volos 38221',
        lastUsedAt: '2026-10-26T10:00:00.000Z',
        createdAt: '2026-10-26T09:00:00.000Z',
        updatedAt: '2026-10-26T11:00:00.000Z',
      },
    }

    mockFetch.mockResolvedValueOnce(createMockResponse(mockCustomerResponse, 200))

    // Pass input containing only the four allowed fields
    const updatedCustomer = await api.updateCustomer({
      partnerId: 'partner 1',
      id: 'cust/123',
      input: {
        name: 'Maria Updated',
        phone: '+306912345678',
        addressLine2: 'Apt 4B',
        notes: 'Doorbell broken',
      },
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = mockFetch.mock.calls[0]

    expect(calledUrl).toBe(
      'http://localhost:3000/api/admin/v1/partners/partner%201/customers/cust%2F123'
    )
    expect(calledInit.method).toBe('PATCH')
    expect(calledInit.headers['Content-Type']).toBe('application/json')
    expect(calledInit.headers['Authorization']).toBe('Bearer test-token')

    const sentBody = JSON.parse(calledInit.body)
    expect(sentBody).toEqual({
      name: 'Maria Updated',
      phone: '+306912345678',
      addressLine2: 'Apt 4B',
      notes: 'Doorbell broken',
    })

    // Assert that the PATCH answer's `customer` property is read and returned
    expect(updatedCustomer.id).toBe('cust-1')
    expect(updatedCustomer.name).toBe('Maria Updated')
    expect(updatedCustomer.notes).toBe('Doorbell broken')
    expect(updatedCustomer.addressLine2).toBe('Apt 4B')
  })

  it('SavedCustomerUpdateAdminInputToJSON never sends an address, coordinates, or extra keys even if passed', () => {
    // Admin edits only name, phone, addressLine2, notes. Map points and addresses stay as restaurant saved them.
    const inputWithExtraKeys = {
      name: 'Maria Papadopoulou',
      phone: '+306912345678',
      addressLine2: 'Floor 1',
      notes: 'Call on arrival',
      addressLine1: 'Unauthorized street edit',
      city: 'Unauthorized city',
      zipCode: '99999',
      latitude: 40.0,
      longitude: 23.0,
      formattedAddress: 'Fake address',
      markUsed: true,
      onPhoneClash: 'update',
      extraBogusField: 'forbidden',
    } as any

    const serialized = SavedCustomerUpdateAdminInputToJSON(inputWithExtraKeys)

    expect(serialized).toEqual({
      name: 'Maria Papadopoulou',
      phone: '+306912345678',
      addressLine2: 'Floor 1',
      notes: 'Call on arrival',
    })
    expect(serialized).not.toHaveProperty('addressLine1')
    expect(serialized).not.toHaveProperty('city')
    expect(serialized).not.toHaveProperty('zipCode')
    expect(serialized).not.toHaveProperty('latitude')
    expect(serialized).not.toHaveProperty('longitude')
    expect(serialized).not.toHaveProperty('formattedAddress')
    expect(serialized).not.toHaveProperty('markUsed')
    expect(serialized).not.toHaveProperty('onPhoneClash')
    expect(serialized).not.toHaveProperty('extraBogusField')

    // Also handles undefined and null
    expect(SavedCustomerUpdateAdminInputToJSON(undefined)).toBeUndefined()
    expect(SavedCustomerUpdateAdminInputToJSON(null)).toBeNull()
  })

  it('calls DELETE .../customers/{id} with no body and URL-encoded ids', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(null, 204))

    await api.deleteCustomer({
      partnerId: 'partner 1',
      id: 'cust 456',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl, calledInit] = mockFetch.mock.calls[0]

    expect(calledUrl).toBe(
      'http://localhost:3000/api/admin/v1/partners/partner%201/customers/cust%20456'
    )
    expect(calledInit.method).toBe('DELETE')
    expect(calledInit.headers['Authorization']).toBe('Bearer test-token')
    // DELETE must send no body
    expect(calledInit.body).toBeUndefined()
  })

  it('SavedCustomerAdminDtoFromJSON maps missing optional fields to null', () => {
    // Only required fields provided; optional fields (notes, addressLine2, zipCode, formattedAddress) absent
    const minimalJson = {
      id: 'cust-min',
      name: 'Nikos',
      phone: '+302421012345',
      addressLine1: 'Dimitriadis 50',
      city: 'Volos',
      latitude: 39.36,
      longitude: 22.94,
      lastUsedAt: '2026-10-26T10:00:00.000Z',
      createdAt: '2026-10-26T10:00:00.000Z',
      updatedAt: '2026-10-26T10:00:00.000Z',
    }

    const dto = SavedCustomerAdminDtoFromJSON(minimalJson)

    expect(dto.id).toBe('cust-min')
    expect(dto.notes).toBeNull()
    expect(dto.addressLine2).toBeNull()
    expect(dto.zipCode).toBeNull()
    expect(dto.formattedAddress).toBeNull()
  })

  it('SavedCustomerListAdminDtoFromJSON defaults missing items to empty array and total to 0', () => {
    const emptyJson = {}
    const listDto = SavedCustomerListAdminDtoFromJSON(emptyJson)

    expect(listDto.items).toEqual([])
    expect(listDto.total).toBe(0)
  })

  it('BackendAdminSdk exposes savedCustomers() returning SavedCustomersApi instance', () => {
    const sdk = new BackendAdminSdk({ basePath: 'http://localhost:3000' })
    const customersApi = sdk.savedCustomers()

    expect(customersApi).toBeInstanceOf(SavedCustomersApi)
    // Memoized call returns the same instance
    expect(sdk.savedCustomers()).toBe(customersApi)
  })
})
