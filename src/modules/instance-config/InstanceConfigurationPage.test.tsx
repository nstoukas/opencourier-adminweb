import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import InstanceConfigurationPage from '../../pages/instance-configuration'
import {
  useGetInstanceConfigOptionsQuery,
  useGetInstanceConfigQuery,
  useSetInstanceConfigMutation,
} from '../../api/configApi'

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

// Mock RTK Query config API hooks
jest.mock('../../api/configApi', () => ({
  useGetInstanceConfigOptionsQuery: jest.fn(),
  useGetInstanceConfigQuery: jest.fn(),
  useSetInstanceConfigMutation: jest.fn(),
}))

const mockUseGetInstanceConfigOptionsQuery = useGetInstanceConfigOptionsQuery as jest.Mock
const mockUseGetInstanceConfigQuery = useGetInstanceConfigQuery as jest.Mock
const mockUseSetInstanceConfigMutation = useSetInstanceConfigMutation as jest.Mock

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
  const elements = screen.getAllByText(labelText)
  for (const el of elements) {
    const container = el.parentElement ?? el
    const input = container.querySelector('input')
    if (input) {
      return input as HTMLInputElement
    }
  }
  throw new Error(`Input for label "${labelText}" not found`)
}

const NUMERIC_SETTINGS = [
  { key: 'maxAssignmentDistance', label: 'Max Assignment Distance' },
  { key: 'maxDriftDistance', label: 'Max Drift Distance' },
  { key: 'quoteExpirationMinutes', label: 'Quote Expiration Minutes' },
  { key: 'defaultCourierPayRate', label: 'Default Courier Pay Rate' },
  { key: 'defaultMaxWorkingHours', label: 'Default Max Working Hours' },
  { key: 'feePercentageAmount', label: 'Fee Percentage Amount' },
] as const

describe('InstanceConfigurationPage zero-valid settings', () => {
  const mockSetInstanceConfig = jest.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    mockUseGetInstanceConfigOptionsQuery.mockReturnValue({
      data: mockOptionsData,
      isLoading: false,
    })
    mockUseSetInstanceConfigMutation.mockReturnValue([
      mockSetInstanceConfig,
      { isLoading: false },
    ])
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  describe.each(NUMERIC_SETTINGS)('numeric setting: $key ($label)', ({ key, label }) => {
    it(`renders an empty input box when API returns ${key} as null`, () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          [key]: null,
        },
        isLoading: false,
      })

      render(<InstanceConfigurationPage />)

      expect(getInputByLabel(label).value).toBe('')
    })

    it(`renders "0" in input box when API returns ${key} as 0`, () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          [key]: 0,
        },
        isLoading: false,
      })

      render(<InstanceConfigurationPage />)

      expect(getInputByLabel(label).value).toBe('0')
    })

    it(`sends null (not 0) for cleared ${key} box when "Save All Changes" is submitted`, async () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: baseMockConfigData,
        isLoading: false,
      })
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      })

      render(<InstanceConfigurationPage />)

      const inputElement = getInputByLabel(label)
      fireEvent.change(inputElement, { target: { value: '' } })
      expect(inputElement.value).toBe('')

      const saveButton = screen.getByRole('button', { name: /save all changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
        expect(mockSetInstanceConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            [key]: null,
          })
        )
      })
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

  describe('Base fee per delivery setting (AC-4)', () => {
    it('renders base fee input with value from API (200), and 0 renders as "0"', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          quoteBaseFee: 200,
        },
        isLoading: false,
      })

      const { rerender } = render(<InstanceConfigurationPage />)

      const baseFeeInput = screen.getByLabelText('Base Fee Per Delivery') as HTMLInputElement
      expect(baseFeeInput.value).toBe('200')

      // Rerender with quoteBaseFee as 0
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          quoteBaseFee: 0,
        },
        isLoading: false,
      })

      rerender(<InstanceConfigurationPage />)
      expect((screen.getByLabelText('Base Fee Per Delivery') as HTMLInputElement).value).toBe('0')
    })

    it('renders base fee input as empty (not "0") and disables "Save base fee" when API returns quoteBaseFee as null', () => {
      // Mock API returning null for quoteBaseFee (e.g. when unconfigured or corrupted)
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          quoteBaseFee: null,
        },
        isLoading: false,
      })

      render(<InstanceConfigurationPage />)

      const baseFeeInput = screen.getByLabelText('Base Fee Per Delivery') as HTMLInputElement
      const saveBaseFeeButton = screen.getByRole('button', { name: /save base fee/i })

      expect(baseFeeInput.value).toBe('')
      expect(saveBaseFeeButton).toBeDisabled()
    })

    it('shows an error naming base fee and disables "Save base fee" when typing -1, 12.5 or clearing box', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          quoteBaseFee: 200,
        },
        isLoading: false,
      })

      render(<InstanceConfigurationPage />)

      const baseFeeInput = screen.getByLabelText('Base Fee Per Delivery') as HTMLInputElement
      const saveBaseFeeButton = screen.getByRole('button', { name: /save base fee/i })

      expect(saveBaseFeeButton).not.toBeDisabled()

      // Typing -1
      fireEvent.change(baseFeeInput, { target: { value: '-1' } })
      expect(screen.getByText('Base fee: enter a whole number of cents, zero or more.')).toBeInTheDocument()
      expect(saveBaseFeeButton).toBeDisabled()

      // Typing 12.5
      fireEvent.change(baseFeeInput, { target: { value: '12.5' } })
      expect(screen.getByText('Base fee: enter a whole number of cents, zero or more.')).toBeInTheDocument()
      expect(saveBaseFeeButton).toBeDisabled()

      // Clearing box
      fireEvent.change(baseFeeInput, { target: { value: '' } })
      expect(screen.getByText('Base fee: enter a whole number of cents, zero or more.')).toBeInTheDocument()
      expect(saveBaseFeeButton).toBeDisabled()
    })

    it('saving 0 calls config mutation with exactly { quoteBaseFee: 0 } and nothing else', async () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          quoteBaseFee: 200,
        },
        isLoading: false,
      })
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      })

      render(<InstanceConfigurationPage />)

      const baseFeeInput = screen.getByLabelText('Base Fee Per Delivery')
      fireEvent.change(baseFeeInput, { target: { value: '0' } })

      const saveBaseFeeButton = screen.getByRole('button', { name: /save base fee/i })
      fireEvent.click(saveBaseFeeButton)

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
        expect(mockSetInstanceConfig).toHaveBeenCalledWith({
          quoteBaseFee: 0,
        })
      })
    })

    it('"Save All Changes" never sends quoteBaseFee', async () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          quoteBaseFee: 200,
        },
        isLoading: false,
      })
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      })

      render(<InstanceConfigurationPage />)

      const saveAllButton = screen.getByRole('button', { name: /save all changes/i })
      fireEvent.click(saveAllButton)

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
        const payload = mockSetInstanceConfig.mock.calls[0][0]
        expect(payload).not.toHaveProperty('quoteBaseFee')
      })
    })

    it('refused save of base fee shows backend error message in toast', async () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          quoteBaseFee: 200,
        },
        isLoading: false,
      })

      const backendMessage = 'quoteBaseFee must be a whole number of cents'
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.reject({ message: backendMessage }),
      })

      render(<InstanceConfigurationPage />)

      const baseFeeInput = screen.getByLabelText('Base Fee Per Delivery')
      fireEvent.change(baseFeeInput, { target: { value: '300' } })

      const saveBaseFeeButton = screen.getByRole('button', { name: /save base fee/i })
      fireEvent.click(saveBaseFeeButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            description: backendMessage,
            variant: 'destructive',
          })
        )
      })
    })
  })

  describe('Minimum Courier Pay floor removal (AC-5)', () => {
    it('contains no "Minimum Courier Pay" text on the page', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: baseMockConfigData,
        isLoading: false,
      })

      const { container } = render(<InstanceConfigurationPage />)

      expect(screen.queryByText(/Minimum Courier Pay/i)).toBeNull()
      expect(container.textContent).not.toContain('Minimum Courier Pay')
      expect(container.textContent).not.toContain('defaultMinimumCourierPay')
    })

    it('"Save All Changes" payload has no defaultMinimumCourierPay key', async () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: baseMockConfigData,
        isLoading: false,
      })
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      })

      render(<InstanceConfigurationPage />)

      const saveAllButton = screen.getByRole('button', { name: /save all changes/i })
      fireEvent.click(saveAllButton)

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
        const payload = mockSetInstanceConfig.mock.calls[0][0]
        expect(payload).not.toHaveProperty('defaultMinimumCourierPay')
      })
    })
  })

  describe('Honest configuration save reporting (Scope Row 50)', () => {
    describe.each([
      {
        name: 'Privacy Policy',
        editButtonText: 'Edit Privacy Policy',
        editorHeading: 'Editing Privacy Policy',
        successToastDescription: 'Privacy policy saved successfully.',
        genericErrorMessage: 'Failed to save privacy policy. Please try again.',
        detailsKey: 'privacyPolicyContent',
      },
      {
        name: 'Terms of Service',
        editButtonText: 'Edit Terms of Service',
        editorHeading: 'Editing Terms of Service',
        successToastDescription: 'Terms of service saved successfully.',
        genericErrorMessage: 'Failed to save terms of service. Please try again.',
        detailsKey: 'termsOfServiceContent',
      },
      {
        name: 'Rules',
        editButtonText: 'Edit Rules',
        editorHeading: 'Editing Rules',
        successToastDescription: 'Rules saved successfully.',
        genericErrorMessage: 'Failed to save rules. Please try again.',
        detailsKey: 'rulesContent',
      },
      {
        name: 'Description',
        editButtonText: 'Edit Description',
        editorHeading: 'Editing Description',
        successToastDescription: 'Description saved successfully.',
        genericErrorMessage: 'Failed to save description. Please try again.',
        detailsKey: 'descriptionContent',
      },
    ])(
      '$name text editor save',
      ({
        editButtonText,
        editorHeading,
        successToastDescription,
        genericErrorMessage,
        detailsKey,
      }) => {
        it('shows success toast and returns to main view when save mutation succeeds', async () => {
          mockUseGetInstanceConfigQuery.mockReturnValue({
            data: baseMockConfigData,
            isLoading: false,
            refetch: jest.fn().mockResolvedValue({}),
          })
          mockSetInstanceConfig.mockReturnValue({
            unwrap: () => Promise.resolve({}),
          })

          render(<InstanceConfigurationPage />)

          fireEvent.click(screen.getByText(editButtonText))
          expect(screen.getByText(editorHeading)).toBeInTheDocument()

          const saveButton = screen.getByRole('button', { name: /^Save$/i })
          fireEvent.click(saveButton)

          await waitFor(() => {
            expect(mockSetInstanceConfig).toHaveBeenCalledWith(
              expect.objectContaining({
                details: expect.objectContaining({
                  [detailsKey]: expect.any(String),
                }),
              })
            )
            expect(mockToast).toHaveBeenCalledWith(
              expect.objectContaining({
                title: 'Success!',
                description: successToastDescription,
              })
            )
            expect(screen.queryByText(editorHeading)).toBeNull()
          })
        })

        it('shows destructive error toast with backend reason and stays on editor view when save mutation is refused', async () => {
          mockUseGetInstanceConfigQuery.mockReturnValue({
            data: baseMockConfigData,
            isLoading: false,
            refetch: jest.fn().mockResolvedValue({}),
          })

          const backendErrorMessage = `${detailsKey} content violates policy format`
          mockSetInstanceConfig.mockReturnValue({
            unwrap: () => Promise.reject({ message: backendErrorMessage }),
          })

          render(<InstanceConfigurationPage />)

          fireEvent.click(screen.getByText(editButtonText))
          expect(screen.getByText(editorHeading)).toBeInTheDocument()

          const saveButton = screen.getByRole('button', { name: /^Save$/i })
          fireEvent.click(saveButton)

          await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
              expect.objectContaining({
                title: 'Error',
                description: backendErrorMessage,
                variant: 'destructive',
              })
            )
            expect(mockToast).not.toHaveBeenCalledWith(
              expect.objectContaining({
                title: 'Success!',
              })
            )
            expect(screen.getByText(editorHeading)).toBeInTheDocument()
          })
        })

        it('falls back to generic error text when error has no message', async () => {
          mockUseGetInstanceConfigQuery.mockReturnValue({
            data: baseMockConfigData,
            isLoading: false,
            refetch: jest.fn().mockResolvedValue({}),
          })

          mockSetInstanceConfig.mockReturnValue({
            unwrap: () => Promise.reject({}),
          })

          render(<InstanceConfigurationPage />)

          fireEvent.click(screen.getByText(editButtonText))
          const saveButton = screen.getByRole('button', { name: /^Save$/i })
          fireEvent.click(saveButton)

          await waitFor(() => {
            expect(mockToast).toHaveBeenCalledWith(
              expect.objectContaining({
                title: 'Error',
                description: genericErrorMessage,
                variant: 'destructive',
              })
            )
          })
        })
      }
    )
  })
})

