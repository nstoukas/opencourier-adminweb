import { CourierUpdateAdminInputToJSON } from './CourierUpdateAdminInput'
import { CourierApi } from '../apis/CourierApi'
import { Configuration } from '../runtime'

// Spec 0051 (AC-4): an admin edits the login email and the emergency contact through the existing PATCH.
// In this hand edited SDK a field missing from the serializer is dropped from the request silently, so a
// save would look fine and change nothing.
describe('CourierUpdateAdminInput serializer (spec 0051, AC-4)', () => {
  const input = {
    firstName: 'Nikos',
    lastName: 'Pappas',
    phoneNumber: '+306912345678',
    email: 'nikos.new@coop.gr',
    emergencyContactName: 'Maria Pappa',
    emergencyContactPhone: '+306922222222',
  }

  it('carries the login email and the emergency contact beside the names and phone', () => {
    expect(CourierUpdateAdminInputToJSON(input)).toMatchObject(input)
  })

  it('carries an emptied emergency contact as it is (null or an empty string), so the backend can clear it', () => {
    const json = CourierUpdateAdminInputToJSON({
      ...input,
      emergencyContactName: null,
      emergencyContactPhone: '',
    })

    expect(json.emergencyContactName).toBeNull()
    expect(json.emergencyContactPhone).toBe('')
  })

  it('leaves the new fields out of the JSON when they are not given', () => {
    const sent = JSON.parse(JSON.stringify(CourierUpdateAdminInputToJSON({ firstName: 'Nikos', lastName: 'Pappas' })))

    expect(sent).toEqual({ firstName: 'Nikos', lastName: 'Pappas' })
  })

  it('passes null and undefined through', () => {
    expect(CourierUpdateAdminInputToJSON(null)).toBeNull()
    expect(CourierUpdateAdminInputToJSON(undefined)).toBeUndefined()
  })

  it('CourierApi.updateCourier sends them in the body of PATCH /api/admin/v1/courier/{id}', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ id: 'rider-1', firstName: 'Nikos', lastName: 'Pappas', createdAt: '2026-07-15T10:00:00.000Z' }),
      text: async () => '',
      clone: function () {
        return this
      },
    })
    const api = new CourierApi(
      new Configuration({
        fetchApi: mockFetch,
        basePath: 'http://localhost:3000',
        accessToken: () => Promise.resolve('test-admin-bearer-token'),
      })
    )

    await api.updateCourier({ id: 'rider-1', courierUpdateAdminInput: input })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/admin/v1/courier/rider-1')
    expect(init.method).toBe('PATCH')
    expect(init.headers['Authorization']).toBe('Bearer test-admin-bearer-token')
    expect(JSON.parse(init.body)).toEqual(input)
  })
})
