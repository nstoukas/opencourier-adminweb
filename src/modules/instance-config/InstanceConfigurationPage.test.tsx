import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InstanceConfigurationPage from '../../pages/instance-configuration'
import {
  useGetInstanceConfigOptionsQuery,
  useGetInstanceConfigQuery,
  useSetInstanceConfigMutation,
} from '../../api/configApi'
import { useGetUserCountQuery } from '../../api/userApi'

// Mock ESM-only react-markdown dependency for Jest runner
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}))

// Mock DefaultLayout to avoid requiring Redux provider wrapper in page tests
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock dynamic map component to bypass Leaflet map loading in tests
jest.mock('next/dynamic', () => () => () => <div data-testid="mock-map">Map</div>)

// Mock toast system to verify error toast content on refused save
const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

// Mock RTK Query config and user API hooks
jest.mock('../../api/configApi', () => ({
  useGetInstanceConfigOptionsQuery: jest.fn(),
  useGetInstanceConfigQuery: jest.fn(),
  useSetInstanceConfigMutation: jest.fn(),
}))

jest.mock('../../api/userApi', () => ({
  useGetUserCountQuery: jest.fn(),
}))

const mockUseGetInstanceConfigOptionsQuery = useGetInstanceConfigOptionsQuery as jest.Mock
const mockUseGetInstanceConfigQuery = useGetInstanceConfigQuery as jest.Mock
const mockUseSetInstanceConfigMutation = useSetInstanceConfigMutation as jest.Mock
const mockUseGetUserCountQuery = useGetUserCountQuery as jest.Mock

const mockOptionsData = {
  courierMatcherType: ['NEAREST_COURIER'],
  quoteCalculationType: ['BY_DISTANCE'],
  geoCalculationType: ['HAVERSINE'],
  deliveryDurationCalculationType: ['SIMPLE'],
  courierCompensationCalculationType: ['FROM_QUOTE_FROM'],
  defaultDietaryRestrictions: ['NONE'],
  distanceUnit: ['KILOMETERS'],
  currency: ['EUR'],
}

const baseMockConfigData = {
  courierMatcherType: 'NEAREST_COURIER',
  quoteCalculationType: 'BY_DISTANCE',
  geoCalculationType: 'HAVERSINE',
  deliveryDurationCalculationType: 'SIMPLE',
  courierCompensationCalculationType: 'FROM_QUOTE_FROM',
  defaultDietaryRestrictions: ['NONE'],
  distanceUnit: 'KILOMETERS',
  currency: 'EUR',
  maxAssignmentDistance: 20,
  maxDriftDistance: 5,
  quoteExpirationMinutes: 15,
  defaultCourierPayRate: 250,
  defaultMinimumCourierPay: 250,
  defaultMaxWorkingHours: 8,
  feePercentageAmount: 10,
  quoteRatePerDistanceUnit: 150,
  registeredRegistries: [],
  details: {
    name: 'Volos Co-op Courier',
    link: 'https://volos.courier.coop',
    websocketLink: 'wss://volos.courier.coop/ws',
    imageUrl: 'https://volos.courier.coop/logo.png',
    region: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [22.88, 39.33],
                [23.02, 39.33],
                [23.02, 39.41],
                [22.88, 39.41],
                [22.88, 39.33],
              ],
            ],
          },
          properties: {},
        },
      ],
    },
  },
}

// Helper function to find input element adjacent to its label text
const getInputByLabel = (labelText: string): HTMLInputElement => {
  const labelElement = screen.getByText(labelText)
  const container = labelElement.parentElement ?? labelElement
  const input = container.querySelector('input')
  if (!input) {
    throw new Error(`Input for label "${labelText}" not found`)
  }
  return input as HTMLInputElement
}

describe('InstanceConfigurationPage zero-valid settings', () => {
  const mockSetInstanceConfig = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGetInstanceConfigOptionsQuery.mockReturnValue({
      data: mockOptionsData,
      isLoading: false,
    })
    mockUseGetUserCountQuery.mockReturnValue({
      data: { count: 5 },
      isLoading: false,
    })
    mockUseSetInstanceConfigMutation.mockReturnValue([
      mockSetInstanceConfig,
      { isLoading: false },
    ])
  })

  it('renders an empty input box when API returns a setting as null (does not invent zeros)', () => {
    // Return null for maxAssignmentDistance and feePercentageAmount
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: {
        ...baseMockConfigData,
        maxAssignmentDistance: null,
        feePercentageAmount: null,
      },
      isLoading: false,
    })

    render(<InstanceConfigurationPage />)

    // Assert that null backend values render as empty boxes, never as 0
    expect(getInputByLabel('Max Assignment Distance').value).toBe('')
    expect(getInputByLabel('Fee Percentage Amount').value).toBe('')
  })

  it('renders "0" in input box when API returns setting as 0 (0 is a valid setting value)', () => {
    // Return 0 for feePercentageAmount (0% fee)
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: {
        ...baseMockConfigData,
        feePercentageAmount: 0,
      },
      isLoading: false,
    })

    render(<InstanceConfigurationPage />)

    expect(getInputByLabel('Fee Percentage Amount').value).toBe('0')
  })

  it('sends null (not 0) for a cleared number box when "Save All Changes" is submitted', async () => {
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: baseMockConfigData,
      isLoading: false,
    })
    mockSetInstanceConfig.mockReturnValue({
      unwrap: () => Promise.resolve({}),
    })

    render(<InstanceConfigurationPage />)

    // Clear Default Max Working Hours box
    const workingHoursInput = getInputByLabel('Default Max Working Hours')
    fireEvent.change(workingHoursInput, { target: { value: '' } })
    expect(workingHoursInput.value).toBe('')

    // Click Save All Changes button
    const saveButton = screen.getByRole('button', { name: /save all changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
      // Assert payload contains defaultMaxWorkingHours: null (never 0)
      expect(mockSetInstanceConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultMaxWorkingHours: null,
        })
      )
    })
  })

  it('displays backend error message in toast when save mutation is refused', async () => {
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: baseMockConfigData,
      isLoading: false,
    })

    // Simulate backend refusal with detailed error message on thrown object
    const backendErrorMessage = 'defaultMaxWorkingHours must be a number'
    mockSetInstanceConfig.mockReturnValue({
      unwrap: () => Promise.reject({ message: backendErrorMessage }),
    })

    render(<InstanceConfigurationPage />)

    // Clear Default Max Working Hours box to trigger backend rejection
    const workingHoursInput = getInputByLabel('Default Max Working Hours')
    fireEvent.change(workingHoursInput, { target: { value: '' } })

    const saveButton = screen.getByRole('button', { name: /save all changes/i })
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1)
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: backendErrorMessage,
          variant: 'destructive',
        })
      )
    })
  })
})
