import React from 'react'
import { render, screen } from '@testing-library/react'
import SosIncidentPage from '@/pages/sos/[sosId]'

jest.mock('./SosIncidentDetails', () => ({
  SosIncidentDetails: ({ incidentId }: { incidentId: string }) => (
    <div data-testid="sos-incident-details" data-incident-id={incidentId}>
      Incident Details for {incidentId}
    </div>
  ),
}))

const mockRouter = {
  query: { sosId: 'sos-test-99' },
}

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}))

describe('SosIncidentPage route component (/sos/[sosId]) (spec 0022, AC-9)', () => {
  it('reads sosId from router.query and renders SosIncidentDetails', () => {
    render(<SosIncidentPage />)

    const details = screen.getByTestId('sos-incident-details')
    expect(details).toBeInTheDocument()
    expect(details).toHaveAttribute('data-incident-id', 'sos-test-99')
  })

  it('passes empty string when router.query.sosId is not yet available', () => {
    mockRouter.query = {} as any
    render(<SosIncidentPage />)

    const details = screen.getByTestId('sos-incident-details')
    expect(details).toHaveAttribute('data-incident-id', '')
  })
})
