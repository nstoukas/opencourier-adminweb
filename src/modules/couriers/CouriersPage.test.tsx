import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CouriersPage from '@/pages/couriers'
import { EnumCourierStatus } from '@/shared-types'
import type { CourierAdminDto } from '@/backend-admin-sdk'

// Mock DefaultLayout to isolate the list page
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-layout">{children}</div>
  ),
}))

// Mock admin page navigator
const mockGoToCourierDetails = jest.fn()
jest.mock('../../hooks/useAdminPageNavigator', () => ({
  useAdminPageNavigator: () => ({
    goToCourierDetails: mockGoToCourierDetails,
  }),
}))

// Mock RTK Query couriersApi
const mockUseGetCouriersQuery = jest.fn()
jest.mock('../../api/couriersApi', () => ({
  useGetCouriersQuery: (args: any) => mockUseGetCouriersQuery(args),
}))

describe('Couriers list page (CouriersPage) (spec 0012, AC-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders Couriers title (h1), redesign columns, and no vehicle column (AC-1)', () => {
    mockUseGetCouriersQuery.mockReturnValue({
      data: {
        data: [],
        pagination: { totalItems: 0, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    render(<CouriersPage />)

    // Heading "Couriers" (h1)
    expect(screen.getByRole('heading', { level: 1, name: 'Couriers' })).toBeInTheDocument()

    // Table column headers per AC-1
    expect(screen.getByRole('columnheader', { name: 'Courier' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Offers' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Member since' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument()

    // Absent per AC-1 & Value 5: no vehicle column (all mopeds). The tabs and search came with row 97.
    expect(screen.queryByRole('columnheader', { name: /vehicle/i })).toBeNull()
  })

  it('renders courier rows with name, phone or "—", status, offers in words, member since, and Open button', () => {
    const courier1: CourierAdminDto = {
      id: 'c1',
      firstName: 'Nikos',
      lastName: 'Pappas',
      phoneNumber: '+306912345678',
      status: EnumCourierStatus.ONLINE,
      deliverySetting: 'AUTO_ACCEPT',
      createdAt: new Date('2026-07-15T10:00:00.000Z'),
    } as any

    const courier2: CourierAdminDto = {
      id: 'c2',
      firstName: 'Maria',
      lastName: 'Ioannou',
      phoneNumber: null,
      status: EnumCourierStatus.OFFLINE,
      deliverySetting: 'NONE',
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
    } as any

    const courier3: CourierAdminDto = {
      id: 'c3',
      firstName: 'Dimitris',
      lastName: 'K.',
      phoneNumber: '+306987654321',
      status: EnumCourierStatus.LAST_CALL,
      deliverySetting: 'MANUAL',
      createdAt: new Date('2025-11-20T10:00:00.000Z'),
    } as any

    const courier4: CourierAdminDto = {
      id: 'c4',
      firstName: 'Eleni',
      lastName: 'M.',
      phoneNumber: '+306900000000',
      status: EnumCourierStatus.ONLINE,
      deliverySetting: 'AUTO_REJECT',
      createdAt: new Date('2026-01-10T10:00:00.000Z'),
    } as any

    const courier5: CourierAdminDto = {
      id: 'c5',
      firstName: 'Alex',
      lastName: 'Z.',
      phoneNumber: '+306911111111',
      status: EnumCourierStatus.ONLINE,
      deliverySetting: 'BATCHED_ONLY' as any,
      createdAt: new Date('2026-05-05T10:00:00.000Z'),
    } as any

    mockUseGetCouriersQuery.mockReturnValue({
      data: {
        data: [courier1, courier2, courier3, courier4, courier5],
        pagination: { totalItems: 5, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    render(<CouriersPage />)

    const rows = screen.getAllByRole('row')
    const row1 = rows[1] as HTMLElement
    const row2 = rows[2] as HTMLElement
    const row3 = rows[3] as HTMLElement
    const row4 = rows[4] as HTMLElement
    const row5 = rows[5] as HTMLElement

    // Courier 1: Name, phone, Online status, Auto accept, July 2026, Open button
    expect(row1).toHaveTextContent('Nikos Pappas')
    expect(row1).toHaveTextContent('+306912345678')
    expect(row1).toHaveTextContent('Online')
    expect(row1).toHaveTextContent('Auto accept')
    expect(row1).toHaveTextContent('July 2026')

    // Courier 2: Name, null phone rendered as "—", Offline status, NONE rendered as "Not set", March 2026
    expect(row2).toHaveTextContent('Maria Ioannou')
    expect(row2).toHaveTextContent('—')
    expect(row2).toHaveTextContent('Offline')
    expect(row2).toHaveTextContent('Not set')
    expect(row2).toHaveTextContent('March 2026')

    // Courier 3: MANUAL rendered as "Manual", Last call status
    expect(row3).toHaveTextContent('Manual')
    expect(row3).toHaveTextContent('Last Call')
    expect(row3).toHaveTextContent('November 2025')

    // Courier 4: AUTO_REJECT rendered as "Auto reject"
    expect(row4).toHaveTextContent('Auto reject')

    // Courier 5: unknown setting shown as sent ("BATCHED_ONLY")
    expect(row5).toHaveTextContent('BATCHED_ONLY')
  })

  it('navigates to courier details when clicking Open button without firing row click twice', () => {
    const courier: CourierAdminDto = {
      id: 'c-open-test',
      firstName: 'Kostas',
      lastName: 'A.',
      phoneNumber: '+306922222222',
      status: EnumCourierStatus.ONLINE,
      deliverySetting: 'AUTO_ACCEPT',
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
    } as any

    mockUseGetCouriersQuery.mockReturnValue({
      data: {
        data: [courier],
        pagination: { totalItems: 1, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    render(<CouriersPage />)

    const openBtn = screen.getByRole('button', { name: 'Open' })
    fireEvent.click(openBtn)

    expect(mockGoToCourierDetails).toHaveBeenCalledTimes(1)
    expect(mockGoToCourierDetails).toHaveBeenCalledWith('c-open-test')
  })

  it('navigates to courier details when clicking a table row', () => {
    const courier: CourierAdminDto = {
      id: 'c-row-click-test',
      firstName: 'Elena',
      lastName: 'B.',
      phoneNumber: '+306933333333',
      status: EnumCourierStatus.OFFLINE,
      deliverySetting: 'MANUAL',
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
    } as any

    mockUseGetCouriersQuery.mockReturnValue({
      data: {
        data: [courier],
        pagination: { totalItems: 1, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    render(<CouriersPage />)

    const rows = screen.getAllByRole('row')
    const dataRow = rows[1] as HTMLElement
    fireEvent.click(dataRow)

    expect(mockGoToCourierDetails).toHaveBeenCalledTimes(1)
    expect(mockGoToCourierDetails).toHaveBeenCalledWith('c-row-click-test')
  })

  it('Value 5 guard: carries no ratings, acceptance rates, totals, vehicle, or location', () => {
    const courier: CourierAdminDto = {
      id: 'c-val5',
      firstName: 'Stavros',
      lastName: 'D.',
      phoneNumber: '+306944444444',
      status: EnumCourierStatus.ONLINE,
      deliverySetting: 'AUTO_ACCEPT',
      createdAt: new Date('2026-02-01T10:00:00.000Z'),
    } as any

    mockUseGetCouriersQuery.mockReturnValue({
      data: {
        data: [courier],
        pagination: { totalItems: 1, page: 1, perPage: 10, totalPages: 1 },
      },
      isLoading: false,
    })

    const { container } = render(<CouriersPage />)
    const content = container.textContent ?? ''

    expect(content).not.toMatch(/acceptance\s*rate/i)
    expect(content).not.toMatch(/online\s*since/i)
    expect(content).not.toMatch(/rating|score/i)
    expect(content).not.toMatch(/vehicle|moped|car|bicycle/i)
  })

  describe('Couriers list page filter and search wiring (row 97, Done when)', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      mockUseGetCouriersQuery.mockReturnValue({
        data: {
          data: [],
          pagination: { totalItems: 25, page: 1, perPage: 10, totalPages: 3 },
        },
        isLoading: false,
      })
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('calls the couriers query with status "all" and search undefined at first on page 1, with All tab pressed', () => {
      render(<CouriersPage />)

      // Initial query call on mount
      expect(mockUseGetCouriersQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'all',
          search: undefined,
          page: 1,
          perPage: 10,
        })
      )

      // "All" button in the group is pressed by default
      const allButton = screen.getByRole('button', { name: 'All' })
      expect(allButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('choosing Working now calls query with status "working" and page 1', () => {
      render(<CouriersPage />)

      const workingButton = screen.getByRole('button', { name: 'Working now' })
      fireEvent.click(workingButton)

      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'working',
          page: 1,
        })
      )
    })

    it.each([
      { label: 'Working now', expectedStatus: 'working' },
      { label: 'Offline', expectedStatus: 'offline' },
      { label: 'All', expectedStatus: 'all' },
    ])('choosing $label calls query with status "$expectedStatus" and page 1', ({ label, expectedStatus }) => {
      render(<CouriersPage />)

      const button = screen.getByRole('button', { name: label })
      fireEvent.click(button)

      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: expectedStatus,
          page: 1,
        })
      )
    })

    it('calls query with trimmed search and page 1, 300 ms after typing', () => {
      render(<CouriersPage />)

      const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })
      fireEvent.change(searchInput, { target: { value: '   Nikos Pappas   ' } })

      // Before the 300 ms debounce delay, search is not sent
      expect(mockUseGetCouriersQuery).not.toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'Nikos Pappas',
        })
      )

      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Query called with trimmed search text and page 1
      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'Nikos Pappas',
          page: 1,
        })
      )
    })

    it('sends search undefined when search box contains blank or whitespace-only text', () => {
      render(<CouriersPage />)

      const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })
      fireEvent.change(searchInput, { target: { value: '   ' } })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: undefined,
          page: 1,
        })
      )
    })

    it('resets pagination to page 1 when filter changes while on page 2', () => {
      render(<CouriersPage />)

      // Move to page 2 via table pagination Next button
      const nextBtn = screen.getByRole('button', { name: 'Go to next page' })
      fireEvent.click(nextBtn)

      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 2,
        })
      )

      // Switch to Working now tab
      const workingButton = screen.getByRole('button', { name: 'Working now' })
      fireEvent.click(workingButton)

      // Must reset to page 1 with working status
      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'working',
          page: 1,
        })
      )
    })

    it('resets pagination to page 1 when searching while on page 2', () => {
      render(<CouriersPage />)

      // Move to page 2 via table pagination Next button
      const nextBtn = screen.getByRole('button', { name: 'Go to next page' })
      fireEvent.click(nextBtn)

      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 2,
        })
      )

      // Enter search text
      const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })
      fireEvent.change(searchInput, { target: { value: 'Nikos' } })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Must reset to page 1 with search
      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'Nikos',
          page: 1,
        })
      )
    })

    it('does not reset pagination when search is unchanged (e.g. "nikos" then "nikos ")', () => {
      render(<CouriersPage />)

      // Enter initial search
      const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })
      fireEvent.change(searchInput, { target: { value: 'nikos' } })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'nikos',
          page: 1,
        })
      )

      // Move to page 2 via table pagination Next button
      const nextBtn = screen.getByRole('button', { name: 'Go to next page' })
      fireEvent.click(nextBtn)

      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'nikos',
          page: 2,
        })
      )

      // Type "nikos " (trims to same search "nikos")
      fireEvent.change(searchInput, { target: { value: 'nikos ' } })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Must remain on page 2 (not reset to page 1)
      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'nikos',
          page: 2,
        })
      )
    })

    it('fails if status or search is dropped on the way to the query (row 97 Done when)', () => {
      render(<CouriersPage />)

      // Select Working now status filter
      const workingButton = screen.getByRole('button', { name: 'Working now' })
      fireEvent.click(workingButton)

      // Enter search text
      const searchInput = screen.getByRole('searchbox', { name: 'Search couriers' })
      fireEvent.change(searchInput, { target: { value: '010003' } })

      act(() => {
        jest.advanceTimersByTime(300)
      })

      // Assert BOTH status and search are passed into the query call
      expect(mockUseGetCouriersQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          status: 'working',
          search: '010003',
          page: 1,
          perPage: 10,
        })
      )
    })
  })
})
