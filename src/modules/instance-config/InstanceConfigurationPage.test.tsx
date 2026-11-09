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
  arrivalRadiusMetres: 50,
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
  { key: 'quoteRatePerDistanceUnit', id: 'quoteRatePerDistanceUnit', label: 'Rate per km' },
  { key: 'feePercentageAmount', id: 'feePercentageAmount', label: 'Co-op fee (%)' },
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

    it('renders eight pills in exact order linking to the eight card anchors (AC-1; Shifts added by spec 0026)', () => {
      render(<InstanceConfigurationPage />)
      const nav = screen.getByRole('navigation', { name: /Settings sections/i })
      const links = nav.querySelectorAll('a')

      const expectedSections = [
        { title: 'Pricing', href: '#pricing' },
        { title: 'Matching', href: '#matching' },
        { title: 'Offers', href: '#offers' },
        { title: 'Rider pay', href: '#rider-pay' },
        { title: 'Shifts', href: '#shifts' },
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
    it('controls are disabled, both switches show "Not loaded yet", and no changes are counted', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      render(<InstanceConfigurationPage />)

      // Offer switch & inputs disabled
      const offerSwitch = document.getElementById('offerExpiryEnabled')
      expect(offerSwitch).toBeDisabled()
      // Two switches now: Offer expiry and Shifts (spec 0026), each unknown until loaded.
      expect(screen.getAllByText('Not loaded yet')).toHaveLength(2)
      expect(document.getElementById('shiftsEnabled')).toBeDisabled()
      expect(document.getElementById('shiftDropNoticeHours')).toBeDisabled()

      const baseFeeInput = document.getElementById('quoteBaseFee')
      expect(baseFeeInput).toBeDisabled()

      const arrivalRadiusInput = document.getElementById('arrivalRadiusMetres')
      expect(arrivalRadiusInput).toBeDisabled()

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

  // ---------------------------------------------------------------------------
  // Review fixes (row 87 review rulings)
  // ---------------------------------------------------------------------------
  describe('Review fixes (row 87 review rulings)', () => {
    // Fix 1: The major: pending bar change survives refetch; empties after save when refetched data equals edit
    it('pending bar change survives a refetch (e.g. after payout policy save), and empties after bar save when refetched data equals the edit (fix 1)', async () => {
      mockSetInstanceConfig.mockReturnValue({
        unwrap: () => Promise.resolve({}),
      })

      const { rerender } = render(<InstanceConfigurationPage />)

      // Type an edit in a bar-covered field: base fee from 200 to 250
      const baseFeeInput = document.getElementById('quoteBaseFee') as HTMLInputElement
      fireEvent.change(baseFeeInput, { target: { value: '250' } })

      // SaveBar appears and lists the change
      const saveBar = screen.getByTestId('save-bar')
      expect(saveBar).toBeInTheDocument()
      expect(within(saveBar).getByText('Base fee')).toBeInTheDocument()
      expect(baseFeeInput.value).toBe('250')

      // Simulate a refetch (e.g. after payout policy save or tag invalidation)
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          reassignmentPayoutPolicies: { DEFAULT: 60 },
        },
        isLoading: false,
      })
      rerender(<InstanceConfigurationPage />)

      // The box keeps the edit and the bar still lists it!
      expect(baseFeeInput.value).toBe('250')
      const saveBarAfterRefetch = screen.getByTestId('save-bar')
      expect(saveBarAfterRefetch).toBeInTheDocument()
      expect(within(saveBarAfterRefetch).getByText('Base fee')).toBeInTheDocument()

      // Save the change via SaveBar
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledWith({
          quoteBaseFee: 250,
        })
      })

      // Once the refetched settings equal the edit (quoteBaseFee is now 250), the bar empties
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          quoteBaseFee: 250,
        },
        isLoading: false,
      })
      rerender(<InstanceConfigurationPage />)

      expect(baseFeeInput.value).toBe('250')
      expect(screen.queryByTestId('save-bar')).toBeNull()
    })

    // Fix 2: Save is off (and shows Saving…) while query is fetching again
    it('disables Save and shows "Saving…" while the settings query is refetching (isFetching: true) (fix 2)', () => {
      const { rerender } = render(<InstanceConfigurationPage />)

      // Edit a field so SaveBar appears
      const baseFeeInput = document.getElementById('quoteBaseFee') as HTMLInputElement
      fireEvent.change(baseFeeInput, { target: { value: '250' } })

      const saveButton = screen.getByRole('button', { name: /save changes/i })
      expect(saveButton).not.toBeDisabled()

      // Simulate settings query refetching in the background
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: baseMockConfigData,
        isLoading: false,
        isFetching: true,
      })
      rerender(<InstanceConfigurationPage />)

      // Save button is disabled and shows "Saving…"
      const savingButton = screen.getByRole('button', { name: /saving…/i })
      expect(savingButton).toBeDisabled()

      // Clicking it does not call mutation
      fireEvent.click(savingButton)
      expect(mockSetInstanceConfig).not.toHaveBeenCalled()
    })

    // Fix 3: No full bar flash: on first render with data, no change is listed
    it('renders no pending changes and mounts no save bar on initial render with data (no full bar flash) (fix 3)', () => {
      render(<InstanceConfigurationPage />)

      // No save bar rendered
      expect(screen.queryByTestId('save-bar')).toBeNull()
      expect(screen.queryByText(/unsaved change/i)).toBeNull()

      // Live region is present and empty
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveTextContent('')
    })

    // Fix 4: Live region is in page even with no change, and announces blockers when there are some
    it('live region is in the page even with no change, and announces blockers when there are some (fix 4)', () => {
      render(<InstanceConfigurationPage />)

      // Initially no change, live region is present and empty
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toBeInTheDocument()
      expect(liveRegion).toHaveTextContent('')

      // Clear quoteBaseFee to create a blocker
      const baseFeeInput = document.getElementById('quoteBaseFee') as HTMLInputElement
      fireEvent.change(baseFeeInput, { target: { value: '' } })

      expect(liveRegion).toHaveTextContent(
        'Save is off until you fix: Base fee: enter a whole number of cents, zero or more'
      )
    })

    // Fix 5: Rate label reads "Rate per km" or "Rate per mile" in box and bar
    it('rate reads "Rate per km" by default and "Rate per mile" when distance unit is MILES, in box and bar alike (fix 5)', () => {
      const { rerender } = render(<InstanceConfigurationPage />)

      // With default KILOMETERS, input label is "Rate per km (cents)"
      expect(screen.getByLabelText(/Rate per km \(cents\)/i)).toBeInTheDocument()

      // Change rate to 180
      const rateInput = document.getElementById('quoteRatePerDistanceUnit') as HTMLInputElement
      fireEvent.change(rateInput, { target: { value: '180' } })
      expect(screen.getByTestId('save-bar')).toBeInTheDocument()
      expect(screen.getByText('Rate per km')).toBeInTheDocument()

      // Now switch distanceUnit to MILES
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          distanceUnit: 'MILES',
        },
        isLoading: false,
      })
      rerender(<InstanceConfigurationPage />)

      // Input label is now "Rate per mile (cents)" and bar says "Rate per mile"
      expect(screen.getByLabelText(/Rate per mile \(cents\)/i)).toBeInTheDocument()
      expect(screen.getByText('Rate per mile')).toBeInTheDocument()
    })

    // Scope row 107: maxDriftDistance label follows distanceUnit and help text explains limit
    describe('maxDriftDistance label and help text (scope row 107)', () => {
      it("with distance unit KILOMETERS the field's label contains km and not metres", () => {
        // Setup: instance config with distanceUnit set to KILOMETERS
        mockUseGetInstanceConfigQuery.mockReturnValue({
          data: {
            ...baseMockConfigData,
            distanceUnit: 'KILOMETERS',
          },
          isLoading: false,
        })

        render(<InstanceConfigurationPage />)

        const kmInput = screen.getByLabelText(/Max drift distance \(km\)/i)
        expect(kmInput).toBeInTheDocument()
        expect(screen.queryByLabelText(/Max drift distance.*metres/i)).toBeNull()

        const label = document.querySelector('label[for="maxDriftDistance"]')
        expect(label?.textContent).toContain('km')
        expect(label?.textContent?.toLowerCase()).not.toContain('metres')
        expect(label?.textContent?.toLowerCase()).not.toContain('meters')
      })

      it('with MILES it contains mile', () => {
        // Setup: instance config with distanceUnit set to MILES
        mockUseGetInstanceConfigQuery.mockReturnValue({
          data: {
            ...baseMockConfigData,
            distanceUnit: 'MILES',
          },
          isLoading: false,
        })

        render(<InstanceConfigurationPage />)

        const mileInput = screen.getByLabelText(/Max drift distance \(mile\)/i)
        expect(mileInput).toBeInTheDocument()

        const label = document.querySelector('label[for="maxDriftDistance"]')
        expect(label?.textContent).toContain('mile')
        expect(label?.textContent?.toLowerCase()).not.toContain('metres')
        expect(label?.textContent?.toLowerCase()).not.toContain('meters')
        expect(label?.textContent).not.toContain('km')
      })

      it('the help text mentions where the delivery was quoted', () => {
        // Setup: instance config loaded
        mockUseGetInstanceConfigQuery.mockReturnValue({
          data: {
            ...baseMockConfigData,
            distanceUnit: 'KILOMETERS',
          },
          isLoading: false,
        })

        render(<InstanceConfigurationPage />)

        const description = screen.getByText(/where (?:it|the delivery) was quoted/i)
        expect(description).toBeInTheDocument()
        expect(description.textContent).toMatch(/delivery/i)
        expect(description.textContent).toMatch(/pickup or drop off/i)
        expect(description.textContent).toBe(
          "How far a delivery's pickup or drop off may be from where it was quoted."
        )
      })
    })

    // Fix 6: Select whose value is '' shows "Not set" option and nothing else selected
    it('a select whose value is "" shows a "Not set" option and nothing else selected (fix 6)', () => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: {
          ...baseMockConfigData,
          currency: null,
        },
        isLoading: false,
      })

      render(<InstanceConfigurationPage />)

      const currencySelect = document.getElementById('currency') as HTMLSelectElement
      expect(currencySelect.value).toBe('')

      const notSetOption = currencySelect.querySelector('option[value=""]') as HTMLOptionElement
      expect(notSetOption).not.toBeNull()
      expect(notSetOption.textContent).toBe('Not set')
      expect(notSetOption.disabled).toBe(true)
      expect(notSetOption.selected).toBe(true)
    })

    // Fix 7: Bad URL shows "<Label> is not a valid URL" under box and in bar
    it('a bad URL shows "<Label> is not a valid URL" under the box and in the bar (fix 7)', () => {
      render(<InstanceConfigurationPage />)

      const wsInput = document.getElementById('websocketLink') as HTMLInputElement
      fireEvent.change(wsInput, { target: { value: 'bad-ws-url' } })

      // Under the box (via FieldError)
      const errorUnderBox = document.querySelector('[data-slot="field-error"]')
      expect(errorUnderBox).toHaveTextContent('Websocket URL is not a valid URL')

      // In the bar blockers container
      const blockersContainer = document.getElementById('save-all-blockers')
      expect(blockersContainer?.textContent).toContain('Websocket URL is not a valid URL')

      // In the live region
      const liveRegion = screen.getByRole('status')
      expect(liveRegion.textContent).toContain('Websocket URL is not a valid URL')
    })

    // Fix 9: The public pages: each Edit opens editor with saved text and title; Save sends details with saved keys kept and that page's text
    const PUBLIC_PAGES_TO_TEST = [
      {
        view: 'rules',
        key: 'rulesContent',
        title: 'Courier rules',
        savedText: '# Courier rules\nAlways wear a helmet.',
      },
      {
        view: 'description',
        key: 'descriptionContent',
        title: 'About the co-op',
        savedText: '# About the co-op\nWorker owned courier platform.',
      },
      {
        view: 'terms-of-service',
        key: 'termsOfServiceContent',
        title: 'Terms of service',
        savedText: '# Terms of Service\nFair terms.',
      },
      {
        view: 'privacy-policy',
        key: 'privacyPolicyContent',
        title: 'Privacy policy',
        savedText: '# Privacy Policy\nData is protected.',
      },
    ] as const

    describe.each(PUBLIC_PAGES_TO_TEST)(
      'public page editor and save: $title ($view -> $key) (fix 9)',
      ({ key, title, savedText }) => {
        it(`opens editor with saved text and title, and Save sends details keeping saved keys and updated text`, async () => {
          mockSetInstanceConfig.mockReturnValue({
            unwrap: () => Promise.resolve({}),
          })

          render(<InstanceConfigurationPage />)

          // Click Edit button for this public page
          const editButton = screen.getByRole('button', { name: new RegExp(`Edit ${title}`, 'i') })
          fireEvent.click(editButton)

          // Editor displays page title in heading and saved text in textarea
          expect(screen.getByRole('heading', { level: 2, name: `Editing ${title}` })).toBeInTheDocument()
          const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
          expect(textarea.value).toBe(savedText)

          // Edit text and save
          const newText = `${savedText}\nUpdated addition.`
          fireEvent.change(textarea, { target: { value: newText } })

          const saveButton = screen.getByRole('button', { name: /^Save$/i })
          fireEvent.click(saveButton)

          await waitFor(() => {
            expect(mockSetInstanceConfig).toHaveBeenCalledWith({
              details: {
                ...baseMockConfigData.details,
                [key]: newText,
              },
            })
          })
        })
      }
    )
  })

  // ---------------------------------------------------------------------------
  // Ported settings (merge commit 2d8ad04, rows 71, 32, 28, 72)
  // ---------------------------------------------------------------------------
  describe('Ported settings on the save bar (rows 71, 32, 28, 72)', () => {
    const configWithPortedSettings = {
      ...baseMockConfigData,
      handBackSeconds: 60,
      cancellationPayoutPolicy: 'FULL_COMPENSATION',
      restaurantHistoryDays: 30,
      sosLocationRetentionDays: 30,
      dispatchPhoneNumber: '+302421012345',
      reassignmentPayoutPolicies: {
        DEFAULT: 50,
        FULL_COMPENSATION: 100,
        HALF_COMPENSATION: 50,
      },
    }

    beforeEach(() => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: configWithPortedSettings,
        isLoading: false,
      })
    })

    // Setting 1: handBackSeconds (spec 0020, row 71)
    describe('handBackSeconds (Offers card, spec 0020)', () => {
      it('loads fetched handBackSeconds into its box and is editable even when offerExpiryEnabled is false', () => {
        mockUseGetInstanceConfigQuery.mockReturnValue({
          data: {
            ...configWithPortedSettings,
            offerExpiryEnabled: false,
            handBackSeconds: 60,
          },
          isLoading: false,
        })

        render(<InstanceConfigurationPage />)

        const input = document.getElementById('handBackSeconds') as HTMLInputElement
        expect(input).toBeInTheDocument()
        expect(input.value).toBe('60')
        expect(input).not.toBeDisabled()
      })

      it('editing handBackSeconds shows in save bar and Save sends ONLY changed key with number and toast sentence', async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)

        const input = document.getElementById('handBackSeconds') as HTMLInputElement
        fireEvent.change(input, { target: { value: '45' } })

        const saveBar = screen.getByTestId('save-bar')
        expect(within(saveBar).getByText('Seconds a rider can hand back an order for free')).toBeInTheDocument()
        expect(within(saveBar).getByText(/60/)).toBeInTheDocument()
        expect(within(saveBar).getByText(/45/)).toBeInTheDocument()

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
          expect(mockSetInstanceConfig).toHaveBeenCalledWith({
            handBackSeconds: 45,
          })
          expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Saved',
              description:
                'Saved: Seconds a rider can hand back an order for free. The hand back applies to the next accept; a running hand back keeps its end.',
            })
          )
        })
      })

      it('saving handBackSeconds as 0 switches it off and sends number 0', async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)

        const input = document.getElementById('handBackSeconds') as HTMLInputElement
        fireEvent.change(input, { target: { value: '0' } })

        const saveBar = screen.getByTestId('save-bar')
        const barLine = within(saveBar).getByRole('listitem')
        expect(barLine).toHaveTextContent(/^Seconds a rider can hand back an order for free 60 →\s*(?:changes to )?0$/)

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledWith({
            handBackSeconds: 0,
          })
        })
      })

      it('emptying handBackSeconds blocks Save', () => {
        render(<InstanceConfigurationPage />)

        const input = document.getElementById('handBackSeconds') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })

        expect(screen.getByTestId('save-bar')).toBeInTheDocument()
        const blockers = document.getElementById('save-all-blockers')
        expect(blockers?.textContent).toContain('Seconds a rider can hand back an order for free is empty')

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        expect(saveButton).toBeDisabled()
        fireEvent.click(saveButton)
        expect(mockSetInstanceConfig).not.toHaveBeenCalled()
      })
    })

    // Setting 2: cancellationPayoutPolicy (spec 0015, row 32)
    describe('cancellationPayoutPolicy (Rider pay card, spec 0015)', () => {
      it('loads fetched policy and formats options as KEY (N%) from reassignmentPayoutPolicies', () => {
        render(<InstanceConfigurationPage />)

        const select = document.getElementById('cancellationPayoutPolicy') as HTMLSelectElement
        expect(select).toBeInTheDocument()
        expect(select.value).toBe('FULL_COMPENSATION')

        const options = Array.from(select.options).map((opt) => opt.text)
        expect(options).toEqual(
          expect.arrayContaining(['DEFAULT (50%)', 'FULL_COMPENSATION (100%)', 'HALF_COMPENSATION (50%)'])
        )
      })

      it('shows a saved policy no longer on the menu as disabled option "KEY (no longer on the menu)" and the box holds it', () => {
        mockUseGetInstanceConfigQuery.mockReturnValue({
          data: {
            ...configWithPortedSettings,
            cancellationPayoutPolicy: 'OLD_RULE',
          },
          isLoading: false,
        })

        render(<InstanceConfigurationPage />)

        const select = document.getElementById('cancellationPayoutPolicy') as HTMLSelectElement
        expect(select.value).toBe('OLD_RULE')

        const oldOption = Array.from(select.options).find((opt) => opt.value === 'OLD_RULE')
        expect(oldOption).toBeDefined()
        expect(oldOption?.text).toBe('OLD_RULE (no longer on the menu)')
        expect(oldOption?.disabled).toBe(true)
      })

      it('changing cancellationPayoutPolicy shows in save bar and Save sends ONLY changed key with toast sentence', async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)

        const select = document.getElementById('cancellationPayoutPolicy') as HTMLSelectElement
        fireEvent.change(select, { target: { value: 'HALF_COMPENSATION' } })

        const saveBar = screen.getByTestId('save-bar')
        expect(within(saveBar).getByText('Pay when a job is cancelled')).toBeInTheDocument()
        expect(within(saveBar).getByText(/FULL_COMPENSATION/)).toBeInTheDocument()
        expect(within(saveBar).getByText(/HALF_COMPENSATION/)).toBeInTheDocument()

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
          expect(mockSetInstanceConfig).toHaveBeenCalledWith({
            cancellationPayoutPolicy: 'HALF_COMPENSATION',
          })
          expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Saved',
              description:
                'Saved: Pay when a job is cancelled. Cancelled job pay applies to cancellations from now on.',
            })
          )
        })
      })
    })

    // Setting 3: restaurantHistoryDays (spec 0017, row 28)
    describe('restaurantHistoryDays (Instance card, spec 0017)', () => {
      it('loads fetched restaurantHistoryDays into its box', () => {
        render(<InstanceConfigurationPage />)

        const input = document.getElementById('restaurantHistoryDays') as HTMLInputElement
        expect(input).toBeInTheDocument()
        expect(input.value).toBe('30')
      })

      it('editing restaurantHistoryDays shows in save bar and Save sends ONLY changed key with number and toast sentence', async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)

        const input = document.getElementById('restaurantHistoryDays') as HTMLInputElement
        fireEvent.change(input, { target: { value: '60' } })

        const saveBar = screen.getByTestId('save-bar')
        expect(within(saveBar).getByText('Restaurant order history (days)')).toBeInTheDocument()
        expect(within(saveBar).getByText(/30/)).toBeInTheDocument()
        expect(within(saveBar).getByText(/60/)).toBeInTheDocument()

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
          expect(mockSetInstanceConfig).toHaveBeenCalledWith({
            restaurantHistoryDays: 60,
          })
          expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Saved',
              description:
                'Saved: Restaurant order history (days). Restaurants see the new order history period at once.',
            })
          )
        })
      })

      it('emptying restaurantHistoryDays blocks Save', () => {
        render(<InstanceConfigurationPage />)

        const input = document.getElementById('restaurantHistoryDays') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })

        expect(screen.getByTestId('save-bar')).toBeInTheDocument()
        const blockers = document.getElementById('save-all-blockers')
        expect(blockers?.textContent).toContain('Restaurant order history (days) is empty')

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        expect(saveButton).toBeDisabled()
        fireEvent.click(saveButton)
        expect(mockSetInstanceConfig).not.toHaveBeenCalled()
      })
    })

    // Setting 4: dispatchPhoneNumber (scope row 72)
    describe('dispatchPhoneNumber (Instance card, scope row 72)', () => {
      it('loads fetched dispatchPhoneNumber into its box', () => {
        render(<InstanceConfigurationPage />)

        const input = document.getElementById('dispatchPhoneNumber') as HTMLInputElement
        expect(input).toBeInTheDocument()
        expect(input.value).toBe('+302421012345')
      })

      it('typing phone with spaces, dashes, dots or brackets over saved stripped number is NOT a pending change', () => {
        render(<InstanceConfigurationPage />)

        const input = document.getElementById('dispatchPhoneNumber') as HTMLInputElement
        fireEvent.change(input, { target: { value: '+30 24210 12345' } })

        expect(screen.queryByTestId('save-bar')).toBeNull()

        fireEvent.change(input, { target: { value: '+30-24210-12345' } })
        expect(screen.queryByTestId('save-bar')).toBeNull()

        fireEvent.change(input, { target: { value: '+30 (24210) 12345' } })
        expect(screen.queryByTestId('save-bar')).toBeNull()
      })

      it('editing dispatchPhoneNumber shows in save bar and Save sends ONLY changed phone as typed with toast sentence', async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)

        const input = document.getElementById('dispatchPhoneNumber') as HTMLInputElement
        fireEvent.change(input, { target: { value: '+30 24210 99999' } })

        const saveBar = screen.getByTestId('save-bar')
        expect(within(saveBar).getByText('Dispatch phone number')).toBeInTheDocument()
        expect(within(saveBar).getByText(/\+302421012345/)).toBeInTheDocument()
        expect(within(saveBar).getByText(/\+30 24210 99999/)).toBeInTheDocument()

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
          expect(mockSetInstanceConfig).toHaveBeenCalledWith({
            dispatchPhoneNumber: '+30 24210 99999',
          })
          expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Saved',
              description:
                'Saved: Dispatch phone number. Riders see the Call dispatch button within ten minutes.',
            })
          )
        })
      })

      it('after a save whose refetch returns the stripped number the edit leaves the bar', async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        const { rerender } = render(<InstanceConfigurationPage />)

        const input = document.getElementById('dispatchPhoneNumber') as HTMLInputElement
        fireEvent.change(input, { target: { value: '+30 24210 99999' } })

        expect(screen.getByTestId('save-bar')).toBeInTheDocument()

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
        })

        // Refetch returns the stripped number from the backend
        mockUseGetInstanceConfigQuery.mockReturnValue({
          data: {
            ...configWithPortedSettings,
            dispatchPhoneNumber: '+302421099999',
          },
          isLoading: false,
        })

        rerender(<InstanceConfigurationPage />)

        // The edit leaves the bar because comparable('+30 24210 99999') === comparable('+302421099999')
        expect(screen.queryByTestId('save-bar')).toBeNull()
      })

      it('emptying dispatchPhoneNumber is allowed and Save sends empty string with cleared toast sentence', async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)

        const input = document.getElementById('dispatchPhoneNumber') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })

        const saveBar = screen.getByTestId('save-bar')
        expect(within(saveBar).getByText('Dispatch phone number')).toBeInTheDocument()
        expect(within(saveBar).getByText(/\+302421012345/)).toBeInTheDocument()
        expect(within(saveBar).getByText(/\(empty\)/)).toBeInTheDocument()

        // Empty phone does NOT block save
        expect(document.getElementById('save-all-blockers')).toBeNull()
        const saveButton = screen.getByRole('button', { name: /save changes/i })
        expect(saveButton).not.toBeDisabled()

        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
          expect(mockSetInstanceConfig).toHaveBeenCalledWith({
            dispatchPhoneNumber: '',
          })
          expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Saved',
              description:
                'Saved: Dispatch phone number. Riders no longer see a Call dispatch button.',
            })
          )
        })
      })
    })

    // Setting 5: arrivalRadiusMetres (Matching card, spec 0021, AC-11, row 19)
    describe('arrivalRadiusMetres (Matching card, spec 0021, AC-11)', () => {
      it('loads fetched arrivalRadiusMetres into its box (id arrivalRadiusMetres)', () => {
        render(<InstanceConfigurationPage />)

        const input = document.getElementById('arrivalRadiusMetres') as HTMLInputElement
        expect(input).toBeInTheDocument()
        expect(input.value).toBe('50')
        expect(input).not.toBeDisabled()
      })

      it('editing arrivalRadiusMetres shows in save bar as "Arrival radius (metres) 50 → 80" and Save sends ONLY changed key as number with success toast', async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)

        const input = document.getElementById('arrivalRadiusMetres') as HTMLInputElement
        fireEvent.change(input, { target: { value: '80' } })

        const saveBar = screen.getByTestId('save-bar')
        expect(within(saveBar).getByText('Arrival radius (metres)')).toBeInTheDocument()
        const barLine = within(saveBar).getByRole('listitem')
        expect(barLine).toHaveTextContent(/^Arrival radius \(metres\)\s*50\s*→\s*(?:changes to\s*)?80$/)

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
          expect(mockSetInstanceConfig).toHaveBeenCalledWith({
            arrivalRadiusMetres: 80,
          })
          expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Saved',
              description: expect.stringContaining(
                "Saved: Arrival radius (metres). Riders' apps use the new arrival radius within ten minutes."
              ),
            })
          )
        })
      })

      it('0 is a real change sent as number 0', async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)

        const input = document.getElementById('arrivalRadiusMetres') as HTMLInputElement
        fireEvent.change(input, { target: { value: '0' } })

        const saveBar = screen.getByTestId('save-bar')
        const barLine = within(saveBar).getByRole('listitem')
        expect(barLine).toHaveTextContent(/^Arrival radius \(metres\)\s*50\s*→\s*(?:changes to\s*)?0$/)

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledWith({
            arrivalRadiusMetres: 0,
          })
        })
      })

      it('emptying arrivalRadiusMetres blocks Save and is never sent', () => {
        render(<InstanceConfigurationPage />)

        const input = document.getElementById('arrivalRadiusMetres') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })

        expect(screen.getByTestId('save-bar')).toBeInTheDocument()
        const blockers = document.getElementById('save-all-blockers')
        expect(blockers?.textContent).toContain('Arrival radius (metres) is empty')

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        expect(saveButton).toBeDisabled()
        expect(saveButton).toHaveAttribute('aria-describedby', 'save-all-blockers')
        fireEvent.click(saveButton)
        expect(mockSetInstanceConfig).not.toHaveBeenCalled()
      })

      it('shows backend refusal sentence in destructive toast when backend rejects value and keeps change in bar', async () => {
        const serverErrorMessage = 'arrivalRadiusMetres must be 20 or more, or 0 to switch detection off'
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.reject({ message: serverErrorMessage }),
        })

        render(<InstanceConfigurationPage />)

        const input = document.getElementById('arrivalRadiusMetres') as HTMLInputElement
        fireEvent.change(input, { target: { value: '15' } })

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

        const saveBar = screen.getByTestId('save-bar')
        expect(within(saveBar).getByText('Arrival radius (metres)')).toBeInTheDocument()
        expect(within(saveBar).getByText(/15/)).toBeInTheDocument()
      })
    })

    // Setting 6: sosLocationRetentionDays (Instance card, spec 0022, AC-11, row 73)
    describe('sosLocationRetentionDays (Instance card, spec 0022, AC-11)', () => {
      it('loads fetched sosLocationRetentionDays into its box and binds NumberField min 1 max 365', () => {
        render(<InstanceConfigurationPage />)

        const input = document.getElementById('sosLocationRetentionDays') as HTMLInputElement
        expect(input).toBeInTheDocument()
        expect(input.value).toBe('30')
        expect(input.getAttribute('min')).toBe('1')
        expect(input.getAttribute('max')).toBe('365')
      })

      it('editing sosLocationRetentionDays shows in save bar and Save sends ONLY changed key with number and toast sentence', async () => {
        mockSetInstanceConfig.mockReturnValue({
          unwrap: () => Promise.resolve({}),
        })

        render(<InstanceConfigurationPage />)

        const input = document.getElementById('sosLocationRetentionDays') as HTMLInputElement
        fireEvent.change(input, { target: { value: '14' } })

        const saveBar = screen.getByTestId('save-bar')
        expect(within(saveBar).getByText('SOS location kept for (days)')).toBeInTheDocument()
        expect(within(saveBar).getByText(/30/)).toBeInTheDocument()
        expect(within(saveBar).getByText(/14/)).toBeInTheDocument()

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        fireEvent.click(saveButton)

        await waitFor(() => {
          expect(mockSetInstanceConfig).toHaveBeenCalledTimes(1)
          expect(mockSetInstanceConfig).toHaveBeenCalledWith({
            sosLocationRetentionDays: 14,
          })
          expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Saved',
              description:
                'Saved: SOS location kept for (days). The daily job deletes SOS positions under the new period from its next run.',
            })
          )
        })
      })

      it('emptying sosLocationRetentionDays blocks Save and is never sent', () => {
        render(<InstanceConfigurationPage />)

        const input = document.getElementById('sosLocationRetentionDays') as HTMLInputElement
        fireEvent.change(input, { target: { value: '' } })

        expect(screen.getByTestId('save-bar')).toBeInTheDocument()
        const blockers = document.getElementById('save-all-blockers')
        expect(blockers?.textContent).toContain('SOS location kept for (days) is empty')

        const saveButton = screen.getByRole('button', { name: /save changes/i })
        expect(saveButton).toBeDisabled()
        expect(saveButton).toHaveAttribute('aria-describedby', 'save-all-blockers')
        fireEvent.click(saveButton)
        expect(mockSetInstanceConfig).not.toHaveBeenCalled()
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Shifts card (spec 0026, row 77, AC-5)
  // ---------------------------------------------------------------------------
  describe('Shifts card (spec 0026, AC-5)', () => {
    const withShifts = (shiftsEnabled: boolean, shiftDropNoticeHours = 12) => {
      mockUseGetInstanceConfigQuery.mockReturnValue({
        data: { ...baseMockConfigData, shiftsEnabled, shiftDropNoticeHours },
        isLoading: false,
      })
    }

    it('renders a "Shifts" section with the switch bound to shiftsEnabled and the notice box', () => {
      withShifts(false, 12)
      render(<InstanceConfigurationPage />)

      const section = document.getElementById('shifts') as HTMLElement
      expect(section).toBeInTheDocument()
      expect(within(section).getByRole('heading', { name: 'Shifts' })).toBeInTheDocument()

      const toggle = document.getElementById('shiftsEnabled') as HTMLElement
      expect(section).toContainElement(toggle)
      expect(toggle).toHaveAttribute('role', 'switch')
      expect(toggle).toHaveAttribute('aria-checked', 'false')
      expect(toggle).not.toBeDisabled()
      expect(within(section).getByLabelText('Shifts')).toBe(toggle)

      const notice = document.getElementById('shiftDropNoticeHours') as HTMLInputElement
      expect(section).toContainElement(notice)
      expect(notice.value).toBe('12')
      expect(notice).not.toBeDisabled()
      expect(screen.getByLabelText('Notice to drop a shift, in hours')).toBe(notice)

      expect(within(section).getByRole('link', { name: 'Shift slots' })).toHaveAttribute('href', '/shift-slots')
    })

    it('shows the switch on when the saved setting is true', () => {
      withShifts(true, 24)
      render(<InstanceConfigurationPage />)
      expect(document.getElementById('shiftsEnabled')).toHaveAttribute('aria-checked', 'true')
      expect((document.getElementById('shiftDropNoticeHours') as HTMLInputElement).value).toBe('24')
    })

    it('says plainly that riders book nothing until shift booking is built, when On', () => {
      withShifts(true)
      render(<InstanceConfigurationPage />)
      const section = document.getElementById('shifts') as HTMLElement
      expect(section).toHaveTextContent(
        'On. Riders will book these slots once shift booking is built. Edit them on Shift slots.'
      )
      expect(section).not.toHaveTextContent('Riders will book the slots set on')
    })

    it('says Off changes nothing and slots can still be prepared, when Off', () => {
      withShifts(false)
      render(<InstanceConfigurationPage />)
      expect(document.getElementById('shifts')).toHaveTextContent(
        'Off. No shift rule applies to anyone. You can still prepare the slots on Shift slots.'
      )
    })

    it('switching Shifts on puts it on the bar and Save sends shiftsEnabled: true as a boolean, with the shifts sentence', async () => {
      withShifts(false)
      mockSetInstanceConfig.mockReturnValue({ unwrap: () => Promise.resolve({}) })
      render(<InstanceConfigurationPage />)

      fireEvent.click(document.getElementById('shiftsEnabled') as HTMLElement)

      const saveBar = screen.getByTestId('save-bar')
      expect(within(saveBar).getByRole('listitem')).toHaveTextContent(/^Shifts Off →\s*(?:changes to )?On$/)

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledWith({ shiftsEnabled: true })
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Saved',
            description: 'Saved: Shifts. Riders see nothing of shifts until shift booking is built.',
          })
        )
      })
    })

    it('switching Shifts off sends shiftsEnabled: false (not dropped)', async () => {
      withShifts(true)
      mockSetInstanceConfig.mockReturnValue({ unwrap: () => Promise.resolve({}) })
      render(<InstanceConfigurationPage />)

      fireEvent.click(document.getElementById('shiftsEnabled') as HTMLElement)
      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledWith({ shiftsEnabled: false })
      })
    })

    it('editing the notice sends shiftDropNoticeHours as a number, 0 included', async () => {
      withShifts(false, 12)
      mockSetInstanceConfig.mockReturnValue({ unwrap: () => Promise.resolve({}) })
      render(<InstanceConfigurationPage />)

      fireEvent.change(document.getElementById('shiftDropNoticeHours') as HTMLInputElement, { target: { value: '0' } })
      const saveBar = screen.getByTestId('save-bar')
      expect(within(saveBar).getByText('Notice to drop a shift, in hours')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(mockSetInstanceConfig).toHaveBeenCalledWith({ shiftDropNoticeHours: 0 })
      })
    })

    it('emptying the notice blocks Save and is never sent', () => {
      withShifts(false, 12)
      render(<InstanceConfigurationPage />)

      fireEvent.change(document.getElementById('shiftDropNoticeHours') as HTMLInputElement, { target: { value: '' } })

      expect(document.getElementById('save-all-blockers')?.textContent).toContain('Notice to drop a shift, in hours is empty')
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      expect(saveButton).toBeDisabled()
      fireEvent.click(saveButton)
      expect(mockSetInstanceConfig).not.toHaveBeenCalled()
    })
  })
})
