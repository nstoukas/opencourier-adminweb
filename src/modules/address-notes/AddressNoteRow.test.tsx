import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddressNoteRow, pointText } from './AddressNoteRow'
import {
  useDeleteAddressNoteMutation,
  useDismissAddressNoteFlagsMutation,
} from '../../api/addressNoteApi'
import { formatDate } from '../../ui-shared-utils'
import type { AddressNoteAdminDto } from '../../backend-admin-sdk'

const mockToast = jest.fn()
jest.mock('../../admin-web-components', () => {
  const actual = jest.requireActual('../../admin-web-components')
  return {
    ...actual,
    useToast: () => ({ toast: mockToast }),
  }
})

jest.mock('../../api/addressNoteApi', () => ({
  useDeleteAddressNoteMutation: jest.fn(),
  useDismissAddressNoteFlagsMutation: jest.fn(),
}))

const mockUseDeleteAddressNoteMutation = useDeleteAddressNoteMutation as jest.Mock
const mockUseDismissAddressNoteFlagsMutation = useDismissAddressNoteFlagsMutation as jest.Mock

describe('AddressNoteRow component (spec 0053, AC-7)', () => {
  const mockDeleteNote = jest.fn()
  const mockDismissFlags = jest.fn()

  const sampleNote: AddressNoteAdminDto = {
    id: 'note-001',
    note: 'Back door is open after 14:00',
    latitude: 39.364,
    longitude: 22.948,
    address: 'Iasonos 50, Volos',
    actor: 'COURIER',
    authorCourierId: 'c-10',
    authorName: 'Alexandros',
    upvotes: 4,
    flags: [
      {
        id: 'flag-101',
        reason: 'Incorrect code',
        createdAt: '2026-11-20T10:00:00Z',
      },
    ],
    createdAt: '2026-11-10T12:00:00Z',
    updatedAt: '2026-11-10T12:00:00Z',
    lastConfirmedAt: '2026-11-19T14:30:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockDeleteNote.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue(null),
    })
    mockDismissFlags.mockReturnValue({
      unwrap: jest.fn().mockResolvedValue(null),
    })
    mockUseDeleteAddressNoteMutation.mockReturnValue([
      mockDeleteNote,
      { isLoading: false },
    ])
    mockUseDismissAddressNoteFlagsMutation.mockReturnValue([
      mockDismissFlags,
      { isLoading: false },
    ])
  })

  describe('pointText helper', () => {
    it('formats latitude and longitude to 5 decimal places', () => {
      expect(pointText({ latitude: 39.364, longitude: 22.948 })).toBe('39.36400, 22.94800')
      expect(pointText({ latitude: 39.1234567, longitude: 22.9876543 })).toBe('39.12346, 22.98765')
    })
  })

  describe('Note content and author rendering (AC-7)', () => {
    it('renders note text, address, coordinates, courier author with link, and dates', () => {
      render(<AddressNoteRow note={sampleNote} />)

      expect(screen.getByText('Back door is open after 14:00')).toBeInTheDocument()
      expect(screen.getByText(/Iasonos 50, Volos ·/)).toBeInTheDocument()
      expect(screen.getByText('39.36400, 22.94800')).toBeInTheDocument()

      // Author is a courier with link to courier detail page (admin only, for abuse)
      const authorLink = screen.getByRole('link', { name: 'Alexandros' })
      expect(authorLink).toBeInTheDocument()
      expect(authorLink).toHaveAttribute('href', '/couriers/c-10')

      expect(screen.getByText(`· ${formatDate(sampleNote.createdAt)}`)).toBeInTheDocument()
      expect(screen.getByText(new RegExp(`Last confirmed ${formatDate(sampleNote.lastConfirmedAt)}`))).toBeInTheDocument()
      expect(screen.getByText(/4 upvotes from other riders/)).toBeInTheDocument()
    })

    it('renders "1 upvote from other riders" when upvotes count is 1', () => {
      render(<AddressNoteRow note={{ ...sampleNote, upvotes: 1 }} />)
      expect(screen.getByText(/1 upvote from other riders/)).toBeInTheDocument()
    })

    it('renders "0 upvotes from other riders" when upvotes count is 0', () => {
      render(<AddressNoteRow note={{ ...sampleNote, upvotes: 0 }} />)
      expect(screen.getByText(/0 upvotes from other riders/)).toBeInTheDocument()
    })

    it('renders "A rider" when authorCourierId is present but authorName is null', () => {
      render(<AddressNoteRow note={{ ...sampleNote, authorName: null }} />)
      const authorLink = screen.getByRole('link', { name: 'A rider' })
      expect(authorLink).toHaveAttribute('href', '/couriers/c-10')
    })

    it('renders "An admin" without a link when actor is ADMIN and no courier id', () => {
      render(<AddressNoteRow note={{ ...sampleNote, authorCourierId: null, authorName: null, actor: 'ADMIN' }} />)
      expect(screen.getByText('An admin')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /admin/i })).toBeNull()
    })

    it('renders "A restaurant" without a link when actor is PARTNER and no courier id', () => {
      render(<AddressNoteRow note={{ ...sampleNote, authorCourierId: null, authorName: null, actor: 'PARTNER' }} />)
      expect(screen.getByText('A restaurant')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /restaurant/i })).toBeNull()
    })

    it('renders "Unknown" when actor is unrecognized and no courier id', () => {
      render(<AddressNoteRow note={{ ...sampleNote, authorCourierId: null, authorName: null, actor: 'OTHER' }} />)
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('shows edited date when updatedAt differs from createdAt', () => {
      const editedNote: AddressNoteAdminDto = {
        ...sampleNote,
        updatedAt: '2026-11-12T15:00:00Z',
      }
      render(<AddressNoteRow note={editedNote} />)
      expect(screen.getByText(`· edited ${formatDate(editedNote.updatedAt)}`)).toBeInTheDocument()
    })

    it('does not show edited date when updatedAt matches createdAt', () => {
      render(<AddressNoteRow note={sampleNote} />)
      expect(screen.queryByText(/· edited/)).toBeNull()
    })

    it('renders coordinates only when address is null', () => {
      render(<AddressNoteRow note={{ ...sampleNote, address: null }} />)
      expect(screen.getByText('39.36400, 22.94800')).toBeInTheDocument()
      expect(screen.queryByText(/· 39.36400/)).toBeNull()
    })

    it('renders flags list with reason and formatted date', () => {
      render(<AddressNoteRow note={sampleNote} />)

      const flagsList = screen.getByRole('list', { name: 'Flags' })
      expect(flagsList).toBeInTheDocument()
      expect(flagsList.textContent).toContain(`Flagged ${formatDate('2026-11-20T10:00:00Z')}: Incorrect code`)
    })

    it('renders flag without reason suffix when reason is null', () => {
      const noteWithEmptyFlagReason: AddressNoteAdminDto = {
        ...sampleNote,
        flags: [{ id: 'flag-2', reason: null, createdAt: '2026-11-20T10:00:00Z' }],
      }
      render(<AddressNoteRow note={noteWithEmptyFlagReason} />)

      const flagsList = screen.getByRole('list', { name: 'Flags' })
      expect(flagsList.textContent?.trim()).toBe(`Flagged ${formatDate('2026-11-20T10:00:00Z')}`)
    })

    it('does not render flags list when flags array is empty', () => {
      render(<AddressNoteRow note={{ ...sampleNote, flags: [] }} />)
      expect(screen.queryByRole('list', { name: 'Flags' })).toBeNull()
    })
  })

  describe('Delete action with two-step confirmation (AC-7, decision 82.7, row 82 review)', () => {
    it('shows Delete button initially; clicking it shows "Yes, delete this note" and "Keep it"', () => {
      render(<AddressNoteRow note={sampleNote} />)

      const deleteBtn = screen.getByRole('button', { name: 'Delete' })
      expect(deleteBtn).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Yes, delete this note' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Keep it' })).toBeNull()

      fireEvent.click(deleteBtn)

      expect(screen.getByRole('button', { name: 'Yes, delete this note' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
    })

    it('clicking "Keep it" cancels confirmation and returns to Delete button', () => {
      render(<AddressNoteRow note={sampleNote} />)

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      expect(screen.getByRole('button', { name: 'Keep it' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Keep it' }))

      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Yes, delete this note' })).toBeNull()
      expect(mockDeleteNote).not.toHaveBeenCalled()
    })

    it('clicking "Yes, delete this note" calls delete mutation and toasts success', async () => {
      render(<AddressNoteRow note={sampleNote} />)

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      fireEvent.click(screen.getByRole('button', { name: 'Yes, delete this note' }))

      expect(mockDeleteNote).toHaveBeenCalledWith({ id: 'note-001' })
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({ title: 'Note deleted.' })
      })
    })

    it('handles delete mutation error, shows destructive toast, and resets confirmation state', async () => {
      mockDeleteNote.mockReturnValueOnce({
        unwrap: jest.fn().mockRejectedValue({ message: 'Server rejected deletion.' }),
      })

      render(<AddressNoteRow note={sampleNote} />)

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      fireEvent.click(screen.getByRole('button', { name: 'Yes, delete this note' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Server rejected deletion.',
          variant: 'destructive',
        })
      })

      // Resets confirming state on error
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Yes, delete this note' })).toBeNull()
    })

    it('uses fallback error message when delete error has no message property', async () => {
      mockDeleteNote.mockReturnValueOnce({
        unwrap: jest.fn().mockRejectedValue({}),
      })

      render(<AddressNoteRow note={sampleNote} />)

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      fireEvent.click(screen.getByRole('button', { name: 'Yes, delete this note' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'The note could not be deleted.',
          variant: 'destructive',
        })
      })
    })

    it('moves focus to "Keep it" when delete ask opens and returns focus to Delete when closed', () => {
      render(<AddressNoteRow note={sampleNote} />)

      const deleteBtn = screen.getByRole('button', { name: 'Delete' })
      fireEvent.click(deleteBtn)

      const keepBtn = screen.getByRole('button', { name: 'Keep it' })
      expect(document.activeElement).toBe(keepBtn)

      fireEvent.click(keepBtn)
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Delete' }))
    })
  })

  describe('Dismiss flags action with two-step confirmation (AC-7, row 82 review, decision 82.12)', () => {
    it('shows "Dismiss flags" button when flags exist, and hides it when note has no flags', () => {
      const { rerender } = render(<AddressNoteRow note={sampleNote} />)
      expect(screen.getByRole('button', { name: 'Dismiss flags' })).toBeInTheDocument()

      rerender(<AddressNoteRow note={{ ...sampleNote, flags: [] }} />)
      expect(screen.queryByRole('button', { name: 'Dismiss flags' })).toBeNull()
    })

    it('hides "Dismiss flags" button while confirming deletion', () => {
      render(<AddressNoteRow note={sampleNote} />)

      expect(screen.getByRole('button', { name: 'Dismiss flags' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

      expect(screen.queryByRole('button', { name: 'Dismiss flags' })).toBeNull()
    })

    it('shows "Yes, dismiss the flag" and "Keep it" when single flag, and "Keep it" cancels', () => {
      render(<AddressNoteRow note={sampleNote} />)

      const dismissBtn = screen.getByRole('button', { name: 'Dismiss flags' })
      fireEvent.click(dismissBtn)

      expect(screen.getByRole('button', { name: 'Yes, dismiss the flag' })).toBeInTheDocument()
      const keepBtn = screen.getByRole('button', { name: 'Keep it' })
      expect(keepBtn).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Dismiss flags' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()

      // Clicking "Keep it" cancels without calling mutation
      fireEvent.click(keepBtn)

      expect(screen.getByRole('button', { name: 'Dismiss flags' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Yes, dismiss the flag' })).toBeNull()
      expect(mockDismissFlags).not.toHaveBeenCalled()
    })

    it('shows "Yes, dismiss all 2 flags" and "Keep them" when multiple flags, and "Keep them" cancels', () => {
      const multiFlagNote: AddressNoteAdminDto = {
        ...sampleNote,
        flags: [
          { id: 'flag-1', reason: 'Old info', createdAt: '2026-11-20T10:00:00Z' },
          { id: 'flag-2', reason: 'Incorrect code', createdAt: '2026-11-21T11:00:00Z' },
        ],
      }
      render(<AddressNoteRow note={multiFlagNote} />)

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss flags' }))

      expect(screen.getByRole('button', { name: 'Yes, dismiss all 2 flags' })).toBeInTheDocument()
      const keepBtn = screen.getByRole('button', { name: 'Keep them' })
      expect(keepBtn).toBeInTheDocument()

      fireEvent.click(keepBtn)

      expect(screen.getByRole('button', { name: 'Dismiss flags' })).toBeInTheDocument()
      expect(mockDismissFlags).not.toHaveBeenCalled()
    })

    it('clicking "Yes, dismiss the flag" calls dismiss mutation and toasts success', async () => {
      render(<AddressNoteRow note={sampleNote} />)

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss flags' }))
      fireEvent.click(screen.getByRole('button', { name: 'Yes, dismiss the flag' }))

      expect(mockDismissFlags).toHaveBeenCalledWith({ id: 'note-001' })
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Flags dismissed. The note stays.',
        })
      })
    })

    it('handles dismiss mutation error, shows destructive toast, and resets confirmation state', async () => {
      mockDismissFlags.mockReturnValueOnce({
        unwrap: jest.fn().mockRejectedValue({ message: 'Flags already dismissed.' }),
      })

      render(<AddressNoteRow note={sampleNote} />)

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss flags' }))
      fireEvent.click(screen.getByRole('button', { name: 'Yes, dismiss the flag' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Flags already dismissed.',
          variant: 'destructive',
        })
      })

      // Resets state on error
      expect(screen.getByRole('button', { name: 'Dismiss flags' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })

    it('uses fallback error message when dismiss error has no message property', async () => {
      mockDismissFlags.mockReturnValueOnce({
        unwrap: jest.fn().mockRejectedValue({}),
      })

      render(<AddressNoteRow note={sampleNote} />)

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss flags' }))
      fireEvent.click(screen.getByRole('button', { name: 'Yes, dismiss the flag' }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'The flags could not be dismissed.',
          variant: 'destructive',
        })
      })
    })

    it('moves focus to "Keep it" when dismiss ask opens and returns focus to Dismiss flags when closed', () => {
      render(<AddressNoteRow note={sampleNote} />)

      const dismissBtn = screen.getByRole('button', { name: 'Dismiss flags' })
      fireEvent.click(dismissBtn)

      const keepBtn = screen.getByRole('button', { name: 'Keep it' })
      expect(document.activeElement).toBe(keepBtn)

      fireEvent.click(keepBtn)
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Dismiss flags' }))
    })
  })

  describe('Busy / loading states', () => {
    it('disables action buttons while delete mutation isLoading is true', () => {
      mockUseDeleteAddressNoteMutation.mockReturnValue([
        mockDeleteNote,
        { isLoading: true },
      ])

      render(<AddressNoteRow note={sampleNote} />)

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Dismiss flags' })).toBeDisabled()
    })

    it('disables action buttons while dismissFlags mutation isLoading is true', () => {
      mockUseDismissAddressNoteFlagsMutation.mockReturnValue([
        mockDismissFlags,
        { isLoading: true },
      ])

      render(<AddressNoteRow note={sampleNote} />)

      expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Dismiss flags' })).toBeDisabled()
    })
  })
})
