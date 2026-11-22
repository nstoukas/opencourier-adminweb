import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { ComplaintPhoto } from './ComplaintPhoto'
import { fetchComplaintPhoto } from '@/api/complaintApi'
import useAppSelector from '@/hooks/useAppSelector'

// Spec 0052 (slice 2, AC-6, AC-9, cross check 8): tests for the photo component in Complaint details
jest.mock('../../api/complaintApi', () => ({
  fetchComplaintPhoto: jest.fn(),
}))

jest.mock('../../hooks/useAppSelector', () => ({
  __esModule: true,
  default: jest.fn(),
}))

const mockFetchComplaintPhoto = fetchComplaintPhoto as jest.Mock
const mockUseAppSelector = useAppSelector as jest.Mock

describe('ComplaintPhoto (spec 0052, AC-9, cross check 8)', () => {
  const originalCreateObjectURL = global.URL.createObjectURL
  const originalRevokeObjectURL = global.URL.revokeObjectURL

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAppSelector.mockReturnValue('admin-bearer-token')
    global.URL.createObjectURL = jest.fn((blob: any) => `blob:http://localhost:3080/mock-uuid-for-${blob?.size ?? 1}`)
    global.URL.revokeObjectURL = jest.fn()
  })

  afterAll(() => {
    global.URL.createObjectURL = originalCreateObjectURL
    global.URL.revokeObjectURL = originalRevokeObjectURL
  })

  it('renders loading state initially while fetching photo', () => {
    // Hang the promise so it stays in loading state
    mockFetchComplaintPhoto.mockReturnValue(new Promise(() => {}))

    render(<ComplaintPhoto complaintId="cmp-1" />)

    expect(screen.getByText('Loading the photo…')).toBeInTheDocument()
    expect(mockFetchComplaintPhoto).toHaveBeenCalledWith('admin-bearer-token', 'cmp-1')
  })

  it('renders photo image from object URL on successful load and shows metadata warning caption', async () => {
    const mockBlob = new Blob(['sample-jpeg-bytes'], { type: 'image/jpeg' })
    mockFetchComplaintPhoto.mockResolvedValueOnce(mockBlob)

    render(<ComplaintPhoto complaintId="cmp-1" />)

    await waitFor(() => {
      const img = screen.getByTestId('complaint-photo')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', expect.stringMatching(/^blob:/))
      expect(img).toHaveAttribute('alt', 'The photo the rider attached to this complaint')
    })

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
    expect(
      screen.getByText(/From the rider's gallery\. The server removed its metadata, including where it was taken\./)
    ).toBeInTheDocument()
  })

  it('revokes the object URL on component unmount to free memory (cross check 8)', async () => {
    const mockBlob = new Blob(['bytes'])
    mockFetchComplaintPhoto.mockResolvedValueOnce(mockBlob)

    const { unmount } = render(<ComplaintPhoto complaintId="cmp-1" />)

    await waitFor(() => {
      expect(screen.getByTestId('complaint-photo')).toBeInTheDocument()
    })

    const createdUrl = (global.URL.createObjectURL as jest.Mock).mock.results[0].value

    unmount()

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(createdUrl)
  })

  it('revokes object URL and aborts showing image if unmounted before fetch resolves', async () => {
    let resolvePromise: (blob: Blob) => void = () => {}
    const deferred = new Promise<Blob>((resolve) => {
      resolvePromise = resolve
    })
    mockFetchComplaintPhoto.mockReturnValue(deferred)

    const { unmount } = render(<ComplaintPhoto complaintId="cmp-1" />)
    expect(screen.getByText('Loading the photo…')).toBeInTheDocument()

    // Unmount before network request finishes
    unmount()

    // Resolve network request after unmount
    const mockBlob = new Blob(['bytes'])
    resolvePromise(mockBlob)

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob)
    })

    const createdUrl = (global.URL.createObjectURL as jest.Mock).mock.results[0].value
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(createdUrl)
    expect(screen.queryByTestId('complaint-photo')).toBeNull()
  })

  it('renders alert when photo fetch fails (e.g. 404 or network drop)', async () => {
    mockFetchComplaintPhoto.mockRejectedValueOnce(new Error('MinIO down or photo not found'))

    render(<ComplaintPhoto complaintId="cmp-err" />)

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('The photo could not be loaded. Reload the page to try again.')
    })
  })
})
