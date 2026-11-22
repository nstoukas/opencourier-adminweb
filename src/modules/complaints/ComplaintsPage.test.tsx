import React from 'react'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { ComplaintsPage, COMPLAINTS_PAGE_SIZE, COMPLAINTS_POLL_MS } from './ComplaintsPage'
import type { ComplaintAdminDto, ComplaintAdminPageDto } from '@/backend-admin-sdk'

// Mock next/link to render a simple anchor tag
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...rest }: any) {
    let resolvedHref = href
    if (typeof href === 'object' && href !== null) {
      let path = href.pathname || ''
      const query = href.query || {}
      for (const [key, value] of Object.entries(query)) {
        path = path.replace(`[${key}]`, String(value))
      }
      resolvedHref = path
    }
    return (
      <a href={resolvedHref} {...rest}>
        {children}
      </a>
    )
  }
})

// Mock Radix Select so options can be selected cleanly in JSDOM
jest.mock('@radix-ui/react-select', () => {
  const MockReact = require('react') as typeof import('react')
  const SelectContext = MockReact.createContext<{ onValueChange?: (v: string) => void }>({})
  return {
    Root: ({ children, onValueChange }: any) => (
      <SelectContext.Provider value={{ onValueChange }}>
        <div data-testid="radix-select-root">{children}</div>
      </SelectContext.Provider>
    ),
    Trigger: ({ children, ...props }: any) => (
      <button type="button" role="combobox" {...props}>
        {children}
      </button>
    ),
    Value: ({ placeholder, children }: any) => <span>{children || placeholder}</span>,
    Icon: ({ children }: any) => <span>{children}</span>,
    Portal: ({ children }: any) => <div>{children}</div>,
    Content: ({ children }: any) => <div>{children}</div>,
    Viewport: ({ children }: any) => <div>{children}</div>,
    Item: ({ children, value, ...props }: any) => {
      const { onValueChange } = MockReact.useContext(SelectContext)
      return (
        <div role="option" onClick={() => onValueChange && onValueChange(value)} {...props}>
          {children}
        </div>
      )
    },
    ItemText: ({ children }: any) => <span>{children}</span>,
    ItemIndicator: ({ children }: any) => <span>{children}</span>,
    Group: ({ children }: any) => <div>{children}</div>,
    Label: ({ children }: any) => <div>{children}</div>,
    Separator: () => <hr />,
  }
})

const mockUseGetComplaintsQuery = jest.fn()
jest.mock('../../api/complaintApi', () => ({
  useGetComplaintsQuery: (args: any, opts: any) => {
    const res = mockUseGetComplaintsQuery(args, opts)
    return res ? { currentData: res.data, ...res } : { currentData: undefined, isLoading: true }
  },
}))

let mockIsPageVisible = true
jest.mock('../../hooks/usePageVisible', () => ({
  usePageVisible: () => mockIsPageVisible,
}))

describe('ComplaintsPage (spec 0052, AC-6, cross check 13)', () => {
  const sampleComplaint1: ComplaintAdminDto = {
    id: 'cmp-101',
    delivery: { id: 'del-101', pickupName: 'Souvlaki Bar', createdAt: '2026-11-20T10:00:00Z' },
    filedBy: 'RIDER',
    filerName: 'Manolis Courier',
    filerCourierId: 'c-10',
    filerPartnerId: null,
    about: 'RESTAURANT',
    aboutCourierId: null,
    aboutCourierName: null,
    aboutCourierDeactivated: false,
    category: 'LONG_WAIT',
    text: 'Waited 40 minutes for the order to be packed.',
    hasPhoto: true,
    status: 'OPEN',
    createdAt: '2026-11-20T10:45:00Z',
    riderReply: null,
    repliedAt: null,
    replyEnteredBy: null,
    outcome: null,
    decidedAt: null,
    decidedBy: null,
    withdrawnReason: null,
    withdrawnAt: null,
    withdrawnBy: null,
  }

  const sampleComplaint2: ComplaintAdminDto = {
    id: 'cmp-102',
    delivery: { id: 'del-102', pickupName: 'Pizza Bistro', createdAt: '2026-11-20T11:00:00Z' },
    filedBy: 'RESTAURANT',
    filerName: 'Pizza Bistro Staff',
    filerCourierId: null,
    filerPartnerId: 'p-20',
    about: 'RIDER',
    aboutCourierId: 'c-55',
    aboutCourierName: 'Eleni Rider',
    aboutCourierDeactivated: false,
    category: 'RUDE',
    text: 'Courier was shouting at the cashier.',
    hasPhoto: false,
    status: 'AWAITING_REPLY',
    createdAt: '2026-11-20T11:30:00Z',
    riderReply: null,
    repliedAt: null,
    replyEnteredBy: null,
    outcome: null,
    decidedAt: null,
    decidedBy: null,
    withdrawnReason: null,
    withdrawnAt: null,
    withdrawnBy: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsPageVisible = true
    mockUseGetComplaintsQuery.mockReturnValue({
      data: {
        data: [sampleComplaint1, sampleComplaint2],
        pagination: {
          currentPage: 1,
          perPage: COMPLAINTS_PAGE_SIZE,
          totalItems: 2,
          totalPages: 1,
          currentItems: 2,
          prevPage: null,
          nextPage: null,
        },
      },
      isError: false,
      isFetching: false,
    })
  })

  it('renders page header, description, status tabs, and about select', () => {
    render(<ComplaintsPage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Complaints' })).toBeInTheDocument()
    expect(screen.getByText(/Complaints from riders about restaurants and customers/)).toBeInTheDocument()

    // Status filter tabs
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'To decide' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Waiting for a reply' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Decided' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Withdrawn' })).toBeInTheDocument()

    // About select
    expect(screen.getByRole('combobox', { name: 'About' })).toBeInTheDocument()
  })

  it('renders complaints table with expected columns and formatted row data (AC-6)', () => {
    render(<ComplaintsPage />)

    // Table headers
    expect(screen.getByRole('columnheader', { name: 'Made' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'From' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'What' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Delivery' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()

    const rows = screen.getAllByTestId('complaint-row')
    expect(rows).toHaveLength(2)

    // First row checks
    const firstRow = rows[0]
    expect(within(firstRow).getByText('Rider: Manolis Courier')).toBeInTheDocument()
    expect(within(firstRow).getByText('Souvlaki Bar (restaurant)')).toBeInTheDocument()
    expect(within(firstRow).getByText('Long wait')).toBeInTheDocument()
    expect(within(firstRow).getByText(/Waited 40 minutes for the order to be packed\./)).toBeInTheDocument()
    expect(within(firstRow).getByText('Open, to decide')).toBeInTheDocument()

    // Open button link to complaint details
    const openLink = within(firstRow).getByRole('link', { name: 'Open' })
    expect(openLink).toHaveAttribute('href', '/complaints/cmp-101')

    // Second row checks
    const secondRow = rows[1]
    expect(within(secondRow).getByText('Restaurant: Pizza Bistro Staff')).toBeInTheDocument()
    expect(within(secondRow).getByText('Eleni Rider')).toBeInTheDocument()
    expect(within(secondRow).getByText('Rude')).toBeInTheDocument()
    expect(within(secondRow).getByText("Waiting for the rider's reply")).toBeInTheDocument()
    expect(within(secondRow).getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      '/complaints/cmp-102'
    )
  })

  it('polls every 30s while page is visible, stops polling when hidden (AGENTS.md)', () => {
    mockIsPageVisible = true
    const { unmount } = render(<ComplaintsPage />)

    expect(mockUseGetComplaintsQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pollingInterval: COMPLAINTS_POLL_MS })
    )
    unmount()

    mockIsPageVisible = false
    render(<ComplaintsPage />)
    expect(mockUseGetComplaintsQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ pollingInterval: 0 })
    )
  })

  it('filters by status tab and resets to page 1 on tab change', async () => {
    render(<ComplaintsPage />)

    // Initially passes undefined status for "ALL"
    expect(mockUseGetComplaintsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: undefined, page: 1 }),
      expect.anything()
    )

    // Click "Waiting for a reply" tab (Radix triggers on mouseDown)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Waiting for a reply' }), { button: 0 })

    expect(mockUseGetComplaintsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'AWAITING_REPLY', page: 1 }),
      expect.anything()
    )

    // Click "To decide" tab
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'To decide' }), { button: 0 })

    expect(mockUseGetComplaintsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'OPEN', page: 1 }),
      expect.anything()
    )
  })

  it('filters by about dropdown and resets to page 1', () => {
    render(<ComplaintsPage />)

    // Pick "A rider"
    const option = screen.getByRole('option', { name: 'About: A rider' })
    fireEvent.click(option)

    expect(mockUseGetComplaintsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ about: 'RIDER', page: 1 }),
      expect.anything()
    )

    // Pick "A restaurant"
    fireEvent.click(screen.getByRole('option', { name: 'About: A restaurant' }))
    expect(mockUseGetComplaintsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ about: 'RESTAURANT', page: 1 }),
      expect.anything()
    )
  })

  it('renders pagination controls and handles page navigation', () => {
    mockUseGetComplaintsQuery.mockImplementation(({ page }) => ({
      data: {
        data: [sampleComplaint1],
        pagination: {
          currentPage: page,
          perPage: COMPLAINTS_PAGE_SIZE,
          totalItems: 40,
          totalPages: 2,
          currentItems: 1,
          prevPage: page > 1 ? page - 1 : null,
          nextPage: page < 2 ? page + 1 : null,
        },
      },
      isError: false,
      isFetching: false,
    }))

    render(<ComplaintsPage />)

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    const prevBtn = screen.getByRole('button', { name: 'Previous' })
    const nextBtn = screen.getByRole('button', { name: 'Next' })
    expect(prevBtn).toBeDisabled()
    expect(nextBtn).toBeEnabled()

    // Go to next page
    fireEvent.click(nextBtn)
    expect(mockUseGetComplaintsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything()
    )
    expect(prevBtn).toBeEnabled()

    // Go back to previous page
    fireEvent.click(prevBtn)
    expect(mockUseGetComplaintsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 }),
      expect.anything()
    )
  })

  it('steps back to earlier page when current page becomes empty (e.g. after deciding rows)', () => {
    mockUseGetComplaintsQuery.mockImplementation(({ page }) => {
      if (page === 2) {
        // Page 2 has become empty
        return {
          data: {
            data: [],
            pagination: {
              currentPage: 2,
              perPage: COMPLAINTS_PAGE_SIZE,
              totalItems: 20,
              totalPages: 1,
              currentItems: 0,
              prevPage: 1,
              nextPage: null,
            },
          },
          isError: false,
          isFetching: false,
        }
      }
      return {
        data: {
          data: [sampleComplaint1],
          pagination: {
            currentPage: 1,
            perPage: COMPLAINTS_PAGE_SIZE,
            totalItems: 20,
            totalPages: 2,
            currentItems: 1,
            prevPage: null,
            nextPage: 2,
          },
        },
        isError: false,
        isFetching: false,
      }
    })

    render(<ComplaintsPage />)

    // Click Next to reach page 2
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Effect triggers page change back to page 1 because page 2 has 0 rows
    expect(mockUseGetComplaintsQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1 }),
      expect.anything()
    )
  })

  it('renders empty message when no complaints are found', () => {
    mockUseGetComplaintsQuery.mockReturnValue({
      data: {
        data: [],
        pagination: {
          currentPage: 1,
          perPage: 20,
          totalItems: 0,
          totalPages: 0,
          currentItems: 0,
          prevPage: null,
          nextPage: null,
        },
      },
      isError: false,
      isFetching: false,
    })

    render(<ComplaintsPage />)
    expect(screen.getByText('No complaint here.')).toBeInTheDocument()
  })

  it('renders alert message when query encounters an error', () => {
    mockUseGetComplaintsQuery.mockReturnValue({
      data: undefined,
      isError: true,
      isFetching: false,
    })

    render(<ComplaintsPage />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The complaints could not be loaded. The list below may be out of date.')
  })
})
