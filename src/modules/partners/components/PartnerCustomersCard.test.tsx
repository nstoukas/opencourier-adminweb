import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { PartnerCustomersCard } from './PartnerCustomersCard'
import {
  useLazyGetPartnerCustomersQuery,
  useUpdatePartnerCustomerMutation,
  useDeletePartnerCustomerMutation,
} from '../../../api/savedCustomersApi'
import type { SavedCustomerAdminDto } from '../../../backend-admin-sdk'

jest.mock('date-fns/formatDistanceToNow', () => ({
  __esModule: true,
  default: () => '2 days ago',
  formatDistanceToNow: () => '2 days ago',
}))

jest.mock('date-fns', () => ({
  __esModule: true,
  default: () => '2 days ago',
  formatDistanceToNow: () => '2 days ago',
}))

// Mock toast notification hook
const mockToast = jest.fn()
jest.mock('../../../admin-web-components', () => {
  const actual = jest.requireActual('../../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

jest.mock('../../../api/savedCustomersApi', () => ({
  useLazyGetPartnerCustomersQuery: jest.fn(),
  useUpdatePartnerCustomerMutation: jest.fn(),
  useDeletePartnerCustomerMutation: jest.fn(),
}))

const mockUseLazyGetPartnerCustomersQuery = useLazyGetPartnerCustomersQuery as jest.Mock
const mockUseUpdatePartnerCustomerMutation = useUpdatePartnerCustomerMutation as jest.Mock
const mockUseDeletePartnerCustomerMutation = useDeletePartnerCustomerMutation as jest.Mock

const customer1: SavedCustomerAdminDto = {
  id: 'cust-1',
  name: 'Maria Papadopoulou',
  phone: '+306912345678',
  addressLine1: 'Iasonos 10',
  addressLine2: 'Floor 3',
  city: 'Volos',
  zipCode: '38221',
  latitude: 39.362,
  longitude: 22.942,
  formattedAddress: 'Iasonos 10, Volos 38221',
  notes: 'Ring 3rd floor bell',
  lastUsedAt: '2026-10-26T10:00:00.000Z',
  createdAt: '2026-10-26T09:00:00.000Z',
  updatedAt: '2026-10-26T09:00:00.000Z',
}

const customer2: SavedCustomerAdminDto = {
  id: 'cust-2',
  name: 'Nikos Georgiou',
  phone: '+306987654321',
  addressLine1: 'Dimitriadis 25',
  addressLine2: null,
  city: 'Volos',
  zipCode: '38221',
  latitude: 39.363,
  longitude: 22.945,
  formattedAddress: 'Dimitriadis 25, Volos 38221',
  notes: null,
  lastUsedAt: '2026-10-25T10:00:00.000Z',
  createdAt: '2026-10-25T09:00:00.000Z',
  updatedAt: '2026-10-25T09:00:00.000Z',
}

const customer3: SavedCustomerAdminDto = {
  id: 'cust-3',
  name: 'Eleni Dimitriou',
  phone: '+306911223344',
  addressLine1: 'Ermou 15',
  addressLine2: null,
  city: 'Volos',
  zipCode: '38221',
  latitude: 39.364,
  longitude: 22.946,
  formattedAddress: 'Ermou 15, Volos 38221',
  notes: null,
  lastUsedAt: '2026-10-24T10:00:00.000Z',
  createdAt: '2026-10-24T09:00:00.000Z',
  updatedAt: '2026-10-24T09:00:00.000Z',
}

describe('PartnerCustomersCard (spec 0005, AC-6)', () => {
  const mockFetchPage = jest.fn()
  const mockUpdateMutation = jest.fn()
  const mockDeleteMutation = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLazyGetPartnerCustomersQuery.mockReturnValue([mockFetchPage])
    mockUseUpdatePartnerCustomerMutation.mockReturnValue([mockUpdateMutation, { isLoading: false }])
    mockUseDeletePartnerCustomerMutation.mockReturnValue([mockDeleteMutation, { isLoading: false }])
  })

  it('renders loading state with skeleton placeholders', () => {
    // Return a pending promise so loading skeleton remains visible
    mockFetchPage.mockReturnValue({
      unwrap: () => new Promise(() => {}),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    expect(screen.getByLabelText('Loading customers')).toBeInTheDocument()
    // Card title has no count yet while loading
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Customers')
  })

  it('shows error state with Try again button that retries fetching', async () => {
    mockFetchPage.mockReturnValueOnce({
      unwrap: () => Promise.reject(new Error('Network error')),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    await waitFor(() => {
      expect(
        screen.getByText("This restaurant's saved customers could not be loaded.")
      ).toBeInTheDocument()
    })

    const tryAgainButton = screen.getByRole('button', { name: 'Try again' })
    expect(tryAgainButton).toBeInTheDocument()

    // Second fetch succeeds
    mockFetchPage.mockReturnValueOnce({
      unwrap: () => Promise.resolve({ items: [customer1], total: 1 }),
    })

    fireEvent.click(tryAgainButton)

    await waitFor(() => {
      expect(mockFetchPage).toHaveBeenCalledTimes(2)
      expect(screen.getByText('Maria Papadopoulou')).toBeInTheDocument()
    })
  })

  it('shows "This restaurant has no saved customers." when list is empty without a search', async () => {
    mockFetchPage.mockReturnValue({
      unwrap: () => Promise.resolve({ items: [], total: 0 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    await waitFor(() => {
      expect(screen.getByText('This restaurant has no saved customers.')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Customers · 0')
    })
  })

  it('shows "No saved customer matches." when a search returns zero results', async () => {
    jest.useFakeTimers()

    // Initial load: no customers
    mockFetchPage.mockReturnValueOnce({
      unwrap: () => Promise.resolve({ items: [], total: 0 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    // Flush initial load
    await act(async () => {
      await Promise.resolve()
    })

    // Prepare search response: empty
    mockFetchPage.mockReturnValueOnce({
      unwrap: () => Promise.resolve({ items: [], total: 0 }),
    })

    const searchInput = screen.getByPlaceholderText('Search name or phone')
    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } })

    // Advance 300 ms debounce
    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })

    expect(screen.getByText('No saved customer matches.')).toBeInTheDocument()

    jest.useRealTimers()
  })

  it('title shows the total count when data is loaded', async () => {
    mockFetchPage.mockReturnValue({
      unwrap: () => Promise.resolve({ items: [customer1, customer2], total: 2 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Customers · 2')
    })
  })

  it('search waits 300 ms and needs 2 characters', async () => {
    jest.useFakeTimers()

    mockFetchPage.mockReturnValue({
      unwrap: () => Promise.resolve({ items: [customer1], total: 1 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    // Initial load call
    expect(mockFetchPage).toHaveBeenCalledWith({
      partnerId: 'partner-1',
      q: undefined,
      page: 1,
      perPage: 20,
    })
    expect(mockFetchPage).toHaveBeenCalledTimes(1)

    const searchInput = screen.getByPlaceholderText('Search name or phone')

    // 1 character typed: should NOT trigger search even after 300 ms
    fireEvent.change(searchInput, { target: { value: 'M' } })
    await act(async () => {
      jest.advanceTimersByTime(300)
      await Promise.resolve()
    })
    // Still 1 call (no new search triggered because 1 < MIN_SEARCH_LENGTH of 2)
    expect(mockFetchPage).toHaveBeenCalledTimes(1)

    // 2 characters typed: should wait 300 ms and then trigger search
    fireEvent.change(searchInput, { target: { value: 'Ma' } })
    expect(mockFetchPage).toHaveBeenCalledTimes(1) // Not called immediately

    // Advance 299 ms: not called yet
    act(() => {
      jest.advanceTimersByTime(299)
    })
    expect(mockFetchPage).toHaveBeenCalledTimes(1)

    // Advance 1 more ms: now called with q: 'Ma'
    await act(async () => {
      jest.advanceTimersByTime(1)
      await Promise.resolve()
    })

    expect(mockFetchPage).toHaveBeenCalledTimes(2)
    expect(mockFetchPage).toHaveBeenLastCalledWith({
      partnerId: 'partner-1',
      q: 'Ma',
      page: 1,
      perPage: 20,
    })

    jest.useRealTimers()
  })

  it('only the latest search\'s answer shows when older responses arrive later', async () => {
    jest.useFakeTimers()

    // Load 1: initial load
    mockFetchPage.mockReturnValueOnce({
      unwrap: () => Promise.resolve({ items: [customer1], total: 1 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.getByText('Maria Papadopoulou')).toBeInTheDocument()

    // Setup out-of-order promises for search A and search B
    let resolveSearchA!: (val: any) => void
    const searchAPromise = new Promise((resolve) => {
      resolveSearchA = resolve
    })

    let resolveSearchB!: (val: any) => void
    const searchBPromise = new Promise((resolve) => {
      resolveSearchB = resolve
    })

    // Search A call
    mockFetchPage.mockReturnValueOnce({
      unwrap: () => searchAPromise,
    })
    // Search B call
    mockFetchPage.mockReturnValueOnce({
      unwrap: () => searchBPromise,
    })

    const searchInput = screen.getByPlaceholderText('Search name or phone')

    // Type first query 'Maria' (Search A)
    fireEvent.change(searchInput, { target: { value: 'Maria' } })
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300)
    })
    expect(mockFetchPage).toHaveBeenCalledTimes(2)

    // Type second query 'Nikos' (Search B)
    fireEvent.change(searchInput, { target: { value: 'Nikos' } })
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300)
    })
    expect(mockFetchPage).toHaveBeenCalledTimes(3)

    // Search B finishes first with customer2
    await act(async () => {
      resolveSearchB({ items: [customer2], total: 1 })
      await Promise.resolve()
    })
    expect(screen.getByText('Nikos Georgiou')).toBeInTheDocument()
    expect(screen.queryByText('Maria Papadopoulou')).toBeNull()

    // Search A finishes later with customer1 (stale response)
    await act(async () => {
      resolveSearchA({ items: [customer1], total: 1 })
      await Promise.resolve()
    })

    // Stale Search A response is ignored: customer2 remains displayed
    expect(screen.getByText('Nikos Georgiou')).toBeInTheDocument()
    expect(screen.queryByText('Maria Papadopoulou')).toBeNull()

    jest.useRealTimers()
  })

  it('Show more appends and drops ids already shown ("N of M")', async () => {
    // Initial page 1 returns customer1, total 3
    mockFetchPage.mockReturnValueOnce({
      unwrap: () => Promise.resolve({ items: [customer1], total: 3 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    await waitFor(() => {
      expect(screen.getByText('Maria Papadopoulou')).toBeInTheDocument()
      expect(screen.getByText('1 of 3')).toBeInTheDocument()
    })

    const showMoreButton = screen.getByRole('button', { name: 'Show more' })
    expect(showMoreButton).toBeInTheDocument()

    // Page 2 returns customer1 again (e.g. used meanwhile) and customer2
    mockFetchPage.mockReturnValueOnce({
      unwrap: () => Promise.resolve({ items: [customer1, customer2], total: 3 }),
    })

    fireEvent.click(showMoreButton)

    await waitFor(() => {
      expect(mockFetchPage).toHaveBeenCalledWith({
        partnerId: 'partner-1',
        q: undefined,
        page: 2,
        perPage: 20,
      })
      // Maria Papadopoulou is not duplicated
      expect(screen.getAllByText('Maria Papadopoulou')).toHaveLength(1)
      expect(screen.getByText('Nikos Georgiou')).toBeInTheDocument()
      expect(screen.getByText('2 of 3')).toBeInTheDocument()
    })
  })

  it('Edit and Delete buttons are named "Edit <name>" and "Delete <name>", and there is no Add button', async () => {
    mockFetchPage.mockReturnValue({
      unwrap: () => Promise.resolve({ items: [customer1], total: 1 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit Maria Papadopoulou' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete Maria Papadopoulou' })).toBeInTheDocument()
    })

    // AC-6: No Add button exists in the card (restaurants save their own customers)
    expect(screen.queryByRole('button', { name: /add/i })).toBeNull()
  })

  it('Edit replaces the row in place (order does not change)', async () => {
    // 3 customers so we edit the middle row (customer2) and verify order does not change
    mockFetchPage.mockReturnValue({
      unwrap: () => Promise.resolve({ items: [customer1, customer2, customer3], total: 3 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    await waitFor(() => {
      expect(screen.getByText('Maria Papadopoulou')).toBeInTheDocument()
      expect(screen.getByText('Nikos Georgiou')).toBeInTheDocument()
      expect(screen.getByText('Eleni Dimitriou')).toBeInTheDocument()
    })

    // Click Edit on customer 2 (middle of three, not the first row)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Nikos Georgiou' }))

    expect(screen.getByRole('heading', { name: 'Edit Nikos Georgiou' })).toBeInTheDocument()

    const updatedCustomer: SavedCustomerAdminDto = {
      ...customer2,
      name: 'Nikos Georgiou-Papadis',
    }

    mockUpdateMutation.mockReturnValue({
      unwrap: () => Promise.resolve(updatedCustomer),
    })

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Nikos Georgiou-Papadis' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Nikos Georgiou-Papadis')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: /Edit Nikos/ })).toBeNull()
    })

    // Check row order: Maria is still first, Nikos is still second, Eleni is still third
    const rows = screen.getAllByRole('row')
    // row 0 is header
    expect(rows[1]).toHaveTextContent('Maria Papadopoulou')
    expect(rows[2]).toHaveTextContent('Nikos Georgiou-Papadis')
    expect(rows[3]).toHaveTextContent('Eleni Dimitriou')

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Changes saved',
      description: 'Nikos Georgiou-Papadis',
    })
  })

  it('Edit returning 404 closes dialog, removes row, and lowers count with "This customer was already deleted."', async () => {
    mockFetchPage.mockReturnValue({
      unwrap: () => Promise.resolve({ items: [customer1, customer2], total: 2 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    await waitFor(() => {
      expect(screen.getByText('Customers · 2')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit Maria Papadopoulou' }))

    mockUpdateMutation.mockReturnValue({
      unwrap: () => Promise.reject({ statusCode: 404 }),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      // Dialog closes
      expect(screen.queryByRole('heading', { name: /Edit Maria/ })).toBeNull()
      // Row is removed
      expect(screen.queryByText('Maria Papadopoulou')).toBeNull()
      // Remaining customer is still there
      expect(screen.getByText('Nikos Georgiou')).toBeInTheDocument()
      // Count lowers
      expect(screen.getByText('Customers · 1')).toBeInTheDocument()
      expect(screen.getByText('1 of 1')).toBeInTheDocument()
      // Toast notification
      expect(mockToast).toHaveBeenCalledWith({
        title: 'This customer was already deleted.',
      })
    })
  })

  it('Delete asks first, and on success removes row and lowers count', async () => {
    mockFetchPage.mockReturnValue({
      unwrap: () => Promise.resolve({ items: [customer1, customer2], total: 2 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    await waitFor(() => {
      expect(screen.getByText('Customers · 2')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Maria Papadopoulou' }))

    expect(screen.getByRole('heading', { name: 'Delete Maria Papadopoulou?' })).toBeInTheDocument()

    mockDeleteMutation.mockReturnValue({
      unwrap: () => Promise.resolve(),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Delete Maria Papadopoulou?' })).toBeNull()
      expect(screen.queryByText('Maria Papadopoulou')).toBeNull()
      expect(screen.getByText('Nikos Georgiou')).toBeInTheDocument()
      expect(screen.getByText('Customers · 1')).toBeInTheDocument()
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Customer deleted',
      })
    })
  })

  it('Delete on 404 removes row and lowers count', async () => {
    mockFetchPage.mockReturnValue({
      unwrap: () => Promise.resolve({ items: [customer1], total: 1 }),
    })

    render(<PartnerCustomersCard partnerId="partner-1" restaurantName="Volos Test Kitchen" />)

    await waitFor(() => {
      expect(screen.getByText('Customers · 1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete Maria Papadopoulou' }))

    mockDeleteMutation.mockReturnValue({
      unwrap: () => Promise.reject({ statusCode: 404 }),
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByText('Maria Papadopoulou')).toBeNull()
      expect(screen.getByText('Customers · 0')).toBeInTheDocument()
      expect(screen.getByText('This restaurant has no saved customers.')).toBeInTheDocument()
    })
  })
})
