import { configureStore, type AnyAction } from '@reduxjs/toolkit'
import { configApi, useGetInstanceConfigQuery, useGetInstanceConfigOptionsQuery, useSetInstanceConfigMutation } from './configApi'
import { reviewRequestApi } from './reviewRequestApi'
import { prepareAdminSdk } from '.'
import { authSlice } from '@/modules/auth/slices/authSlice'
import type { InstanceConfigSettingsDto, InstanceConfigSettingsOptionsDto } from '../backend-admin-sdk'

jest.mock('.', () => {
  const actual = jest.requireActual('.')
  return { ...actual, prepareAdminSdk: jest.fn() }
})

const mockPrepareAdminSdk = prepareAdminSdk as jest.Mock

function setupTestStore(onAction?: (action: AnyAction) => void) {
  return configureStore({
    reducer: {
      [configApi.reducerPath]: configApi.reducer,
      [authSlice.name]: authSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({ serializableCheck: false, immutableCheck: false }).concat(
        configApi.middleware
      )
      if (onAction) {
        return middleware.concat(() => (next) => (action: any) => {
          onAction(action)
          return next(action)
        })
      }
      return middleware
    },
    preloadedState: { auth: { accessToken: 'admin-token-xyz' } },
  })
}

describe('configApi (spec 0038, AC-12, AC-13)', () => {
  const mockConfigSdk = {
    getInstanceConfig: jest.fn(),
    getInstanceConfigOptions: jest.fn(),
    setInstanceConfig: jest.fn(),
  }

  const mockReviewRequestsSdk = {
    settingChanges: jest.fn(),
  }

  // Only the fields these tests read; the cast keeps the fixture short.
  const sampleConfig = {
    reviewAnswerDays: 14,
    reviewCorrectionMaxCents: 5000,
  } as InstanceConfigSettingsDto

  const sampleOptions = {} as InstanceConfigSettingsOptionsDto

  beforeEach(() => {
    jest.clearAllMocks()
    mockPrepareAdminSdk.mockReturnValue({
      config: () => mockConfigSdk,
      reviewRequests: () => mockReviewRequestsSdk,
    })
    mockConfigSdk.getInstanceConfig.mockResolvedValue(sampleConfig)
    mockConfigSdk.getInstanceConfigOptions.mockResolvedValue(sampleOptions)
    mockConfigSdk.setInstanceConfig.mockResolvedValue(sampleConfig)
    mockReviewRequestsSdk.settingChanges.mockResolvedValue({
      data: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
    })
  })

  it('exports hook functions', () => {
    expect(typeof useGetInstanceConfigQuery).toBe('function')
    expect(typeof useGetInstanceConfigOptionsQuery).toBe('function')
    expect(typeof useSetInstanceConfigMutation).toBe('function')
  })

  it('getInstanceConfig calls sdk.config().getInstanceConfig() with stored token and provides Tags.config', async () => {
    const store = setupTestStore()
    const result = await store.dispatch(configApi.endpoints.getInstanceConfig.initiate({}))

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-token-xyz')
    expect(mockConfigSdk.getInstanceConfig).toHaveBeenCalledTimes(1)
    expect(result.data).toEqual(sampleConfig)
  })

  it('getInstanceConfigOptions calls sdk.config().getInstanceConfigOptions() with stored token and provides Tags.config', async () => {
    const store = setupTestStore()
    const result = await store.dispatch(configApi.endpoints.getInstanceConfigOptions.initiate({}))

    expect(mockPrepareAdminSdk).toHaveBeenCalledWith('admin-token-xyz')
    expect(mockConfigSdk.getInstanceConfigOptions).toHaveBeenCalledTimes(1)
    expect(result.data).toEqual(sampleOptions)
  })

  // Spec 0038 (AC-12, AC-13): saving settings records changes; Change history and settings both refetch.
  it('setInstanceConfig invalidates Tags.config and Tags.settingChanges so the Change history refetches', async () => {
    const actions: AnyAction[] = []
    const store = setupTestStore((action) => actions.push(action))

    // Subscribe to queries providing Tags.config and Tags.settingChanges
    void store.dispatch(configApi.endpoints.getInstanceConfig.initiate({}))
    void store.dispatch(reviewRequestApi.endpoints.getSettingChanges.initiate({ page: 1, perPage: 20 }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    actions.length = 0

    const saveInput = { reviewAnswerDays: 7 }
    const result = await store.dispatch(configApi.endpoints.setInstanceConfig.initiate(saveInput))

    expect(mockConfigSdk.setInstanceConfig).toHaveBeenCalledWith({
      instanceConfigSettingsAdminInput: saveInput,
    })
    expect('data' in result ? result.data : undefined).toEqual(sampleConfig)

    // Check that both subscribed queries refetched due to tag invalidation
    const refetched = actions
      .filter((a) => a.type === 'api/executeQuery/pending')
      .map((a) => a.meta?.arg?.endpointName)
    expect(refetched).toContain('getInstanceConfig')
    expect(refetched).toContain('getSettingChanges')
  })
})
