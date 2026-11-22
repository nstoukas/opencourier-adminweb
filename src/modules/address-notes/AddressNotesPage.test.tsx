import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import AddressNotesPage from '../../pages/address-notes'
import {
  useGetFlaggedAddressNotesQuery,
  useSearchAddressNotesQuery,
} from '../../api/addressNoteApi'
import type { AddressNoteAdminDto } from '../../backend-admin-sdk'

// Mock DefaultLayout to isolate the page without requiring full layout & nav providers
jest.mock('../../components/layouts/DefaultLayout', () => ({
  DefaultLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock AddressNoteRow to test page-level rendering and interactions independently
jest.mock('./AddressNoteRow', () => ({
  AddressNoteRow: ({ note }: { note: AddressNoteAdminDto }) => (
    <div data-testid={`note-row-${note.id}`}>{note.note}</div>
  ),
}))

jest.mock('../../api/addressNoteApi', () => ({
  useGetFlaggedAddressNotesQuery: jest.fn(),
  useSearchAddressNotesQuery: jest.fn(),
}))

const mockUseGetFlaggedAddressNotesQuery = useGetFlaggedAddressNotesQuery as jest.Mock
const mockUseSearchAddressNotesQuery = useSearchAddressNotesQuery as jest.Mock

describe('AddressNotesPage (spec 0053, AC-7)', () => {
  const sampleFlaggedNote: AddressNoteAdminDto = {
    id: 'flagged-1',
    note: 'Gate requires code 5678',
    latitude: 39.364,
    longitude: 22.948,
    address: 'Iasonos 40',
    actor: 'COURIER',
    authorCourierId: 'c-1',
    authorName: 'Kostas',
    upvotes: 3,
    flags: [{ id: 'f-1', reason: 'Code expired', createdAt: '2026-11-20T10:00:00Z' }],
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-10T10:00:00Z',
    lastConfirmedAt: '2026-11-18T10:00:00Z',
  }

  const sampleSearchNote: AddressNoteAdminDto = {
    id: 'search-1',
    note: 'Deliver to second floor',
    latitude: 39.361,
    longitude: 22.942,
    address: 'Dimitriados 20',
    actor: 'COURIER',
    authorCourierId: 'c-2',
    authorName: 'Maria',
    upvotes: 1,
    flags: [],
    createdAt: '2026-11-12T10:00:00Z',
    updatedAt: '2026-11-12T10:00:00Z',
    lastConfirmedAt: '2026-11-19T10:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGetFlaggedAddressNotesQuery.mockReturnValue({
      currentData: [],
      isLoading: false,
      isError: false,
    })
    mockUseSearchAddressNotesQuery.mockReturnValue({
      currentData: { data: [], total: 0, page: 1, perPage: 20 },
      isLoading: false,
      isError: false,
    })
  })

  describe('Header and Page layout (AC-7)', () => {
    it('renders page header title and description', () => {
      render(<AddressNotesPage />)

      expect(screen.getByRole('heading', { level: 1, name: 'Address notes' })).toBeInTheDocument()
      expect(
        screen.getByText(
          'What riders wrote about places. Notes describe the place, never the person; delete any that break the rules.'
        )
      ).toBeInTheDocument()
    })
  })

  describe('Flagged notes section (AC-7)', () => {
    it('renders "Flagged by riders" heading and lists flagged notes', () => {
      mockUseGetFlaggedAddressNotesQuery.mockReturnValue({
        currentData: [sampleFlaggedNote],
        isLoading: false,
        isError: false,
      })

      render(<AddressNotesPage />)

      expect(screen.getByRole('heading', { level: 2, name: 'Flagged by riders' })).toBeInTheDocument()
      expect(screen.getByTestId('note-row-flagged-1')).toBeInTheDocument()
      expect(screen.getByText('Gate requires code 5678')).toBeInTheDocument()
    })

    it('displays "No flagged notes." when flagged list is empty', () => {
      mockUseGetFlaggedAddressNotesQuery.mockReturnValue({
        currentData: [],
        isLoading: false,
        isError: false,
      })

      render(<AddressNotesPage />)

      expect(screen.getByText('No flagged notes.')).toBeInTheDocument()
    })

    it('displays error message when flagged query fails', () => {
      mockUseGetFlaggedAddressNotesQuery.mockReturnValue({
        currentData: undefined,
        isLoading: false,
        isError: true,
      })

      render(<AddressNotesPage />)

      expect(screen.getByText('Could not load the flagged notes.')).toBeInTheDocument()
    })
  })

  describe('Search notes section (AC-7, cross check 9)', () => {
    it('renders search input and button with initial empty state', () => {
      render(<AddressNotesPage />)

      expect(screen.getByRole('heading', { level: 2, name: 'Find a note by street' })).toBeInTheDocument()
      const input = screen.getByRole('textbox', { name: 'Street, address or coordinates' })
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('maxLength', '100')
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
      expect(screen.getByText('No notes yet.')).toBeInTheDocument()
    })

    it('submits search query and updates parameters passed to useSearchAddressNotesQuery', () => {
      render(<AddressNotesPage />)

      // Initial call has empty search and page 1
      expect(mockUseSearchAddressNotesQuery).toHaveBeenCalledWith({
        search: '',
        page: 1,
        perPage: 20,
      })

      const input = screen.getByRole('textbox', { name: 'Street, address or coordinates' })
      fireEvent.change(input, { target: { value: '  Iasonos  ' } })
      fireEvent.click(screen.getByRole('button', { name: 'Search' }))

      // Submitting trims search and passes it to query
      expect(mockUseSearchAddressNotesQuery).toHaveBeenLastCalledWith({
        search: 'Iasonos',
        page: 1,
        perPage: 20,
      })
    })

    it('renders search results when data is returned', () => {
      mockUseSearchAddressNotesQuery.mockReturnValue({
        currentData: { data: [sampleSearchNote], total: 1, page: 1, perPage: 20 },
        isLoading: false,
        isError: false,
      })

      render(<AddressNotesPage />)

      expect(screen.getByTestId('note-row-search-1')).toBeInTheDocument()
      expect(screen.getByText('Deliver to second floor')).toBeInTheDocument()
    })

    it('displays "No notes match." when search is active and returns empty list', () => {
      render(<AddressNotesPage />)

      const input = screen.getByRole('textbox', { name: 'Street, address or coordinates' })
      fireEvent.change(input, { target: { value: 'Nonexistent street' } })
      fireEvent.click(screen.getByRole('button', { name: 'Search' }))

      expect(screen.getByText('No notes match.')).toBeInTheDocument()
    })

    it('displays error message when search query fails', () => {
      mockUseSearchAddressNotesQuery.mockReturnValue({
        currentData: undefined,
        isLoading: false,
        isError: true,
      })

      render(<AddressNotesPage />)

      expect(screen.getByText('Could not load the notes.')).toBeInTheDocument()
    })
  })

  describe('Pagination (AC-7)', () => {
    it('does not render pagination when pageCount <= 1', () => {
      mockUseSearchAddressNotesQuery.mockReturnValue({
        currentData: { data: [sampleSearchNote], total: 15, page: 1, perPage: 20 },
        isLoading: false,
        isError: false,
      })

      render(<AddressNotesPage />)

      expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
      expect(screen.queryByText(/Page 1 of/)).toBeNull()
    })

    it('renders pagination controls when total > perPage (pageCount > 1)', () => {
      mockUseSearchAddressNotesQuery.mockReturnValue({
        currentData: { data: [sampleSearchNote], total: 45, page: 1, perPage: 20 },
        isLoading: false,
        isError: false,
      })

      render(<AddressNotesPage />)

      const prevBtn = screen.getByRole('button', { name: 'Previous' })
      const nextBtn = screen.getByRole('button', { name: 'Next' })
      expect(prevBtn).toBeInTheDocument()
      expect(prevBtn).toBeDisabled() // On page 1, Previous is disabled
      expect(nextBtn).toBeInTheDocument()
      expect(nextBtn).not.toBeDisabled()
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
    })

    it('clicking Next increments page and triggers search query with next page', () => {
      mockUseSearchAddressNotesQuery.mockReturnValue({
        currentData: { data: [sampleSearchNote], total: 45, page: 1, perPage: 20 },
        isLoading: false,
        isError: false,
      })

      render(<AddressNotesPage />)

      fireEvent.click(screen.getByRole('button', { name: 'Next' }))

      expect(mockUseSearchAddressNotesQuery).toHaveBeenLastCalledWith({
        search: '',
        page: 2,
        perPage: 20,
      })
    })

    it('submitting a new search resets page back to 1', () => {
      mockUseSearchAddressNotesQuery.mockReturnValue({
        currentData: { data: [sampleSearchNote], total: 45, page: 1, perPage: 20 },
        isLoading: false,
        isError: false,
      })

      render(<AddressNotesPage />)

      // Advance to page 2
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(mockUseSearchAddressNotesQuery).toHaveBeenLastCalledWith({
        search: '',
        page: 2,
        perPage: 20,
      })

      // Run new search
      const input = screen.getByRole('textbox', { name: 'Street, address or coordinates' })
      fireEvent.change(input, { target: { value: 'New Street' } })
      fireEvent.click(screen.getByRole('button', { name: 'Search' }))

      expect(mockUseSearchAddressNotesQuery).toHaveBeenLastCalledWith({
        search: 'New Street',
        page: 1,
        perPage: 20,
      })
    })
  })
})
