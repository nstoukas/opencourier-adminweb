import { handleBackendError } from './api'
import { setAccessToken } from '@/modules/auth/slices/authSlice'
import { authApi } from '../authApi'
import { disconnectChatLive } from '../../modules/chat/chatLive'

jest.mock('../../modules/chat/chatLive', () => ({
  disconnectChatLive: jest.fn(),
}))

describe('handleBackendError (spec 0034, review Major)', () => {
  let mockDispatch: jest.Mock
  let mockApi: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockDispatch = jest.fn()
    mockApi = {
      dispatch: mockDispatch,
    }
  })

  it('on 401 error: dispatches setAccessToken(null), resets authApi state, and calls disconnectChatLive()', () => {
    const error401 = { statusCode: 401, message: 'Unauthorized' }
    const result = handleBackendError(error401, mockApi)

    expect(mockDispatch).toHaveBeenCalledWith(setAccessToken(null))
    expect(mockDispatch).toHaveBeenCalledWith(authApi.util.resetApiState())
    expect(disconnectChatLive).toHaveBeenCalledTimes(1)
    expect(result).toBe(error401)
  })

  it('on non-401 error (e.g. 403, 500): returns error and does NOT call disconnectChatLive() or reset auth', () => {
    const error403 = { statusCode: 403, message: 'Forbidden' }
    const result = handleBackendError(error403, mockApi)

    expect(mockDispatch).not.toHaveBeenCalled()
    expect(disconnectChatLive).not.toHaveBeenCalled()
    expect(result).toBe(error403)
  })
})
