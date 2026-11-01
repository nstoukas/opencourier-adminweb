import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import InstanceConfigurationPage from '../../pages/instance-configuration'
import {
  useGetInstanceConfigOptionsQuery,
  useGetInstanceConfigQuery,
  useSetInstanceConfigMutation,
} from '../../api/configApi'

// Mock react-markdown for Jest, ensuring markdown headings render through component overrides
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({
    children,
    components,
  }: {
    children?: string | React.ReactNode
    components?: Record<string, React.ComponentType<any>>
  }) => {
    if (typeof children === 'string' && components) {
      const lines = children.split('\n')
      return (
        <div data-testid="markdown-preview">
          {lines.map((line, idx) => {
            if (line.startsWith('# ')) {
              const H1Comp = components.h1 || 'h1'
              return <H1Comp key={idx}>{line.slice(2)}</H1Comp>
            }
            if (line.startsWith('## ')) {
              const H2Comp = components.h2 || 'h2'
              return <H2Comp key={idx}>{line.slice(3)}</H2Comp>
            }
            return <p key={idx}>{line}</p>
          })}
        </div>
      )
    }
    return <div>{children}</div>
  },
}))

// Mock DefaultLayout to avoid requiring Redux store wrapper in page tests
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock dynamic map component to avoid loading Leaflet in Jest environment
jest.mock('next/dynamic', () => () => () => <div data-testid="mock-map">Map</div>)

// Mock toast system to inspect success and error feedback
const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

// Mock RTK Query configApi endpoints
jest.mock('../../api/configApi', () => ({
  useGetInstanceConfigOptionsQuery: jest.fn(),
  useGetInstanceConfigQuery: jest.fn(),
  useSetInstanceConfigMutation: jest.fn(),
}))

const mockUseGetInstanceConfigOptionsQuery = useGetInstanceConfigOptionsQuery as jest.Mock
const mockUseGetInstanceConfigQuery = useGetInstanceConfigQuery as jest.Mock
const mockUseSetInstanceConfigMutation = useSetInstanceConfigMutation as jest.Mock

const mockOptionsData = {
  courierMatcherType: ['NEAREST_COURIER', 'COURIER_SENIORITY', 'STATIC'],
  quoteCalculationType: ['BY_DISTANCE'],
  geoCalculationType: ['HAVERSINE'],
  deliveryDurationCalculationType: ['SIMPLE'],
  courierCompensationCalculationType: ['FROM_QUOTE_FROM'],
  defaultDietaryRestrictions: ['NONE', 'VEGAN', 'VEGETARIAN'],
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
  quoteBaseFee: 200,
  quoteRatePerDistanceUnit: 150,
  feePercentageAmount: 10,
  maxAssignmentDistance: 20,
  maxDriftDistance: 5,
  quoteExpirationMinutes: 15,
  defaultCourierPayRate: 250,
  defaultMaxWorkingHours: 8,
  offerExpiryEnabled: true,
  offerExpirySeconds: 60,
  noCourierRetrySeconds: 30,
  savedCustomerRetentionMonths: 12,
  reassignmentPayoutPolicies: { DEFAULT: 50 },
  reassignmentPayoutDefaultPolicy: 'DEFAULT',
  details: {
    name: 'Volos Co-op Courier',
    link: 'https://volos.courier.coop',
    websocketLink: 'wss://volos.courier.coop/ws',
    imageUrl: 'https://volos.courier.coop/logo.png',
    rulesContent: '# Courier rules\nAlways wear a helmet.',
    descriptionContent: '# About the co-op\nWorker owned courier platform.',
    termsOfServiceContent: '# Terms of Service\nFair terms.',
    privacyPolicyContent: '# Privacy Policy\nData is protected.',
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

const NUMERIC_SETTINGS = [
  { key: 'quoteBaseFee', id: 'quoteBaseFee', label: 'Base fee' },
  { key: 'quoteRatePerDistanceUnit', id: 'quoteRatePerDistanceUnit', label: 'Per distance rate' },
  { key: 'feePercentageAmount', id: 'feePercentageAmount', label: 'Co-op fee %' },
  { key: 'maxAssignmentDistance', id: 'maxAssignmentDistance', label: 'Furthest courier to offer' },
  { key: 'maxDriftDistance', id: 'maxDriftDistance', label: 'Max drift distance' },
  { key: 'quoteExpirationMinutes', id: 'quoteExpirationMinutes', label: 'Quote stays valid for' },
  { key: 'defaultCourierPayRate', id: 'defaultCourierPayRate', label: 'Default courier pay rate' },
  { key: 'defaultMaxWorkingHours', id: 'defaultMaxWorkingHours', label: 'Default max working hours' },
  { key: 'offerExpirySeconds', id: 'offerExpirySeconds', label: 'Seconds before an unanswered offer ends' },
  { key: 'noCourierRetrySeconds', id: 'noCourierRetrySeconds', label: 'Seconds between retries when no rider is free' },
  { key: 'savedCustomerRetentionMonths', id: 'savedCustomerRetentionMonths', label: 'Saved customer retention (months)' },
] as const

describe('InstanceConfigurationPage (Co-op settings redesign, spec 0010, row 87)', () => {
  const mockSetInstanceConfig = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGetInstanceConfigOptionsQuery.mockReturnValue({
      data: mockOptionsData,
      isLoading: false,
    })
    mockUseGetInstanceConfigQuery.mockReturnValue({
      data: baseMockConfigData,
      isLoading: false,
    })
    mockUseSetInstanceConfigMutation.mockReturnValue([
      mockSetInstanceConfig,
      { isLoading: false },
    ])
  })

  // ---------------------------------------------------------------------------
  // Page structure, Navigation, Pills, Invariants (AC-1, AC-7, AC-8, AC-10)
  // ---------------------------------------------------------------------------
  describe('Page Header, Pills and Invariants (AC-1, AC-7, AC-8)', () => {
    it('renders page titled "Co-op settings" in an h1', () => {
      render(<InstanceConfigurationPage />)
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('Co-op settings')
    })

    it('renders seven pills in exact order linking to the seven card anchors (AC-1)', () => {
      render(<InstanceConfigurationPage />)
      const nav = screen.getByRole('navigation', { name: /Settings sections/i })
      const links = nav.querySelectorAll('a')

      const expectedSections = [
        { title: 'Pricing', href: '#pricing' },
        { title: 'Matching', href: '#matching' },
        { title: 'Offers', href: '#offers' },
        { title: 'Rider pay', href: '#rider-pay' },
        { title: 'Service area', href: '#service-area' },
        { title: 'Instance', href: '#instance' },
        { title: 'Public pages', href: '#public-pages' },
      ]

      expect(links).toHaveLength(expectedSections.length)
      expectedSections.forEach((section, index) => {
        expect(links[index]?.textContent).toBe(section.title)
        expect(links[index]?.getAttribute('href')).toBe(section.href)
      })
    })

    it('contains no "Recommended" copy and renders honest matcher copy (AC-7)', () => {
      const { container } = render(<InstanceConfigurationPage />)

      // No option anywhere is marked "Recommended"
      expect(container.textContent).not.toContain('Recommended')

      // Honest matching card copy
      expect(screen.getByText('Nearest free courier')).toBeInTheDocument()
      expect(screen.getByText('The closest rider who is free.')).toBeInTheDocument()
      expect(screen.getByText('Most senior courier')).toBeInTheDocument()
      expect(screen.getByText('Members who joined first are offered first.')).toBeInTheDocument()
      expect(screen.getByText('Fixed courier')).toBeInTheDocument()
      expect(screen.getByText('The admin assigns each delivery by hand (the override).')).toBeInTheDocument()
    })

    it('locks the URL input box when a link was previously saved in instance details', () => {
      render(<InstanceConfigurationPage />)
      const urlInput = document.getElementById('link') as HTMLInputElement
      expect(urlInput).toBeDisabled()
    })
  })

  // ---------------------------------------------------------------------------
  // Zero-valid settings & cleared boxes (row 49 & row 56, AC-4)
  // ---------------------------------------------------------------------------
  describe('Zero-valid settings & cleared boxes (row 49, row 56, AC-4)', () => {
    describe.each(NUMERIC_SETTINGS)('numeric setting: $key ($label)', ({ key, id, label }) => {
      it(`renders "0" when API returns ${key} as 0`, () => {
        mockUseGetInstanceConfigQuery.mockReturnValue({
          data: {
            ...baseMockConfigData,
            [key]: 0,
          },
          isLoading: false,
        })

        render(<InstanceConfigurationPage />)
        const input = document.getElementById(id) as HTMLInputElement
        expect(input.value).toBe('0')
      })

      it(`setting box to 0 is a change and Save sends 0 (row 49)`, async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)
        const input = document.getElementById(id) as HTMLInputElement

        // Change from loaded positive value to 0
        fireEvent.change(input, { target: { value: '0' } })

        // Save bar appears with change
        expect(screen.getByTestId('save-bar')).toBeInTheDocument()
        const saveButton = screen.getByRole('button', { name: /save changes/i })
        expect(saveButton).not.toBeDisabled()

        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
          expect(mockSetInstanceConfig).toHaveBeenCalledWith({
            [key]: 0,
          })
        })
      })

      it(`clearing box is a blocker and is never sent (row 56)`, () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)
        const input = document.getElementById(id) as HTMLInputElement

        // Clear box
        fireEvent.change(input, { target: { value: '' } })

        // Save bar shows blocker
        expect(screen.getByTestId('save-bar')).toBeInTheDocument()
        const blockersContainer = document.getElementById('save-all-blockers')
        expect(blockersContainer).not.toBeNull()

        // Either "<Label> is empty" or cents validation message
        const isCents = key === 'quoteBaseFee' || key === 'quoteRatePerDistanceUnit'
        if (isCents) {
          expect(blockersContainer?.textContent).toContain(`${label}: enter a whole number of cents, zero or more`)
        } else {
          expect(blockersContainer?.textContent).toContain(`${label} is empty`)
        }

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        expect(saveButton).toBeDisabled()
        expect(saveButton).toHaveAttribute('aria-describedby', 'save-all-blockers')

        // Clicking disabled button never calls mutation
        fireEvent.click(saveButton)
        expect(mockSetInstanceConfig).not.toHaveBeenCalled()
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Refused save reporting (row 50, AC-5)
  // ---------------------------------------------------------------------------
  describe('Refused save reporting (row 50, AC-5)', () => {
    it('shows server reason in destructive toast and keeps changes in the bar', async () => {
      const serverErrorMessage = 'maxAssignmentDistance must be 50 or less'
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.reject({ message: serverErrorMessage }),
      })

      render(<InstanceConfigurationPage />)
      const input = document.getElementById('maxAssignmentDistance') as HTMLInputElement

      fireEvent.change(input, { target: { value: '60' } })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Not saved',
            description: serverErrorMessage,
            variant: 'destructive',
          })
        )
      })

      // Every change stays in the bar after refusal
      const saveBar = screen.getByTestId('save-bar')
      expect(within(saveBar).getByText('Furthest courier to offer')).toBeInTheDocument()
      expect(within(saveBar).getByText(/60/)).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // SaveBar behavior, Discard, and Partial Payloads (AC-3, AC-4, AC-5, AC-12)
  // ---------------------------------------------------------------------------
  describe('SaveBar, Discard, and Partial Updates (AC-3, AC-4, AC-5, AC-12)', () => {
    it('SaveBar is hidden when there are no changes', () => {
      render(<InstanceConfigurationPage />)
      expect(screen.queryByTestId('save-bar')).toBeNull()
    })

    it('editing a box shows it in the bar, and Discard restores the value and hides bar', () => {
      render(<InstanceConfigurationPage />)
      const baseFeeInput = document.getElementById('quoteBaseFee') as HTMLInputElement

      fireEvent.change(baseFeeInput, { target: { value: '250' } })
      const saveBar = screen.getByTestId('save-bar')
      expect(within(saveBar).getByText('Base fee')).toBeInTheDocument()

      const discardButton = screen.getByRole('button', { name: /discard/i })
      fireEvent.click(discardButton)

      expect(baseFeeInput.value).toBe('200')
      expect(screen.queryByTestId('save-bar')).toBeNull()
    })

    it('Save sends only changed keys through mutation and displays success words (AC-4, AC-5, AC-15)', async () => {
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      })

      render(<InstanceConfigurationPage />)
      const baseFeeInput = document.getElementById('quoteBaseFee') as HTMLInputElement

      fireEvent.change(baseFeeInput, { target: { value: '250' } })
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
        expect(mockSetInstanceConfig).toHaveBeenCalledWith({
          quoteBaseFee: 250,
        })
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Saved',
            description: expect.stringContaining(
              'Saved: Base fee. Pricing applies to the next quote; deliveries already quoted keep their price.'
            ),
          })
        )
      })
    })

    it('sends whole details object with saved metadata preserved when an instance detail changes', async () => {
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      })

      render(<InstanceConfigurationPage />)
      const nameInput = document.getElementById('instanceName') as HTMLInputElement

      fireEvent.change(nameInput, { target: { value: 'Volos Delivery Workers' } })
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
        const sentPayload = mockSetInstanceConfig.mock.calls[0][0]
        expect(sentPayload).toHaveProperty('details')
        expect(sentPayload.details.name).toBe('Volos Delivery Workers')
        // Preserves existing details like public page contents and links
        expect(sentPayload.details.rulesContent).toBe('# Courier rules\nAlways wear a helmet.')
        expect(sentPayload.details.privacyPolicyUrl).toBe('https://volos.courier.coop/privacy-policy')
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Blocker tests and save-all-blockers ID (row 55, AC-14)
  // ---------------------------------------------------------------------------
  describe('Blocker validations and save-all-blockers ID (row 55, AC-14)', () => {
    it('blocks save and names invalid URL in save-all-blockers when websocketLink is invalid', () => {
      render(<InstanceConfigurationPage />)
      const wsInput = document.getElementById('websocketLink') as HTMLInputElement

      fireEvent.change(wsInput, { target: { value: 'invalid-ws-url' } })

      const blockersElement = document.getElementById('save-all-blockers')
      expect(blockersElement).not.toBeNull()
      expect(blockersElement?.textContent).toContain('Websocket URL is not a valid URL')

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      expect(saveButton).toBeDisabled()
      expect(saveButton).toHaveAttribute('aria-describedby', 'save-all-blockers')
    })

    it('blocks save when name is changed to empty', () => {
      render(<InstanceConfigurationPage />)
      const nameInput = document.getElementById('instanceName') as HTMLInputElement

      fireEvent.change(nameInput, { target: { value: '' } })

      const blockersElement = document.getElementById('save-all-blockers')
      expect(blockersElement?.textContent).toContain('Name is empty')
    })

    it('blocks save when dietary restrictions has nothing selected', () => {
      render(<InstanceConfigurationPage />)
      const select = document.getElementById('defaultDietaryRestrictions') as HTMLSelectElement

      // Deselect all options
      const options = select.querySelectorAll('option')
      options.forEach((opt) => {
        opt.selected = false
      })
      fireEvent.change(select)

      const blockersElement = document.getElementById('save-all-blockers')
      expect(blockersElement?.textContent).toContain('Default dietary restrictions has nothing selected')
    })
  })

  // ---------------------------------------------------------------------------
  // Loading state before settings arrive (AC-13)
  // ---------------------------------------------------------------------------
  describe('Before settings load (AC-13)', () => {
    it('controls are disabled, switch shows "Not loaded yet", and no changes are counted', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      render(<InstanceConfigurationPage />)

      // Offer switch & inputs disabled
      const offerSwitch = document.getElementById('offerExpiryEnabled')
      expect(offerSwitch).toBeDisabled()
      expect(screen.getByText('Not loaded yet')).toBeInTheDocument()

      const baseFeeInput = document.getElementById('quoteBaseFee')
      expect(baseFeeInput).toBeDisabled()

      // SaveBar is null before load
      expect(screen.queryByTestId('save-bar')).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Independent editors: Reassignment payout policies & Public pages (AC-8)
  // ---------------------------------------------------------------------------
  describe('Independent editors keep their own Save and bypass SaveBar (AC-8)', () => {
    it('reassignment payout policy editor has its own Save and does not appear in SaveBar', async () => {
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      })

      render(<InstanceConfigurationPage />)

      // The policy editor has its own Save button
      const policySaveButton = screen.getByRole('button', { name: /save payout policies/i })
      expect(policySaveButton).toBeInTheDocument()

      fireEvent.click(policySaveButton)

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledWith({
          reassignmentPayoutPolicies: { DEFAULT: 50 },
          reassignmentPayoutDefaultPolicy: 'DEFAULT',
        })
      })

      // SaveBar remains hidden
      expect(screen.queryByTestId('save-bar')).toBeNull()
    })

    it('public pages open in their own editor with separate Save and do not appear in SaveBar', async () => {
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      })

      render(<InstanceConfigurationPage />)

      // Open Rules editor
      const editButton = screen.getByRole('button', { name: /Edit Courier rules/i })
      fireEvent.click(editButton)

      expect(screen.getByRole('heading', { level: 2, name: 'Courier rules' })).toBeInTheDocument()
      expect(screen.queryByTestId('save-bar')).toBeNull()

      const savePageButton = screen.getByRole('button', { name: /^Save$/i })
      fireEvent.click(savePageButton)

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            details: expect.objectContaining({
              rulesContent: expect.any(String),
            }),
          })
        )
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Markdown heading rendering & single h1 invariant (row 86 review fix 4df8ba6)
  // ---------------------------------------------------------------------------
  describe('Markdown heading rendering and single h1 invariant (row 86 review fix 4df8ba6)', () => {
    it('renders a markdown "# Title" as an h2, preserving exactly one h1 on the page', () => {
      render(<InstanceConfigurationPage />)

      // Initial view shows exactly one <h1> rendered by PageHeader
      const initialH1s = screen.getAllByRole('heading', { level: 1 })
      expect(initialH1s).toHaveLength(1)
      expect(initialH1s[0]).toHaveTextContent('Co-op settings')

      // Switch to editing rules view
      const editButton = screen.getByRole('button', { name: /Edit Courier rules/i })
      fireEvent.click(editButton)

      // Enter a top-level markdown heading in the rules editor textarea
      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, {
        target: { value: '# Volos Delivery Rules\n## Subheading' },
      })

      // The markdown heading "# Volos Delivery Rules" must render as an <h2>
      const rulesHeading = screen.getByRole('heading', {
        level: 2,
        name: 'Volos Delivery Rules',
      })
      expect(rulesHeading).toBeInTheDocument()
      expect(rulesHeading.tagName).toBe('H2')

      // The entire page maintains exactly one <h1> ("Co-op settings")
      const pageH1s = screen.getAllByRole('heading', { level: 1 })
      expect(pageH1s).toHaveLength(1)
      expect(pageH1s[0]).toHaveTextContent('Co-op settings')
    })
  })
})
