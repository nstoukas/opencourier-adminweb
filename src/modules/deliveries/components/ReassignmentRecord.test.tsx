import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  ReassignmentRecordCard,
  ReassignmentRecord,
} from './ReassignmentRecord'

const sampleRecord: ReassignmentRecord = {
  droppedCourierId: 'c1',
  droppedCourierName: 'Nikos Papadopoulos',
  newCourierId: 'c2',
  newCourierName: 'Eleni Georgiou',
  policy: 'HALF_COMPENSATION',
  percent: 50,
  amount: 400, // 4.00 EUR
  currencyCode: 'EUR',
  message: 'Moped flat tire mid-flight',
  submittedAt: new Date('2026-07-29T12:00:00Z'),
}

describe('ReassignmentRecordCard component', () => {
  it('renders exact dropped rider, new rider, policy, percentage, formatted amount, and note text', () => {
    render(<ReassignmentRecordCard record={sampleRecord} />)

    expect(screen.getByText('Nikos Papadopoulos')).toBeInTheDocument()
    expect(screen.getByText('Eleni Georgiou')).toBeInTheDocument()
    expect(screen.getByText('HALF_COMPENSATION (50%)')).toBeInTheDocument()
    expect(screen.getByText('€4.00')).toBeInTheDocument()
    expect(screen.getByText('Moped flat tire mid-flight')).toBeInTheDocument()
  })

  it('renders required §2 disclosure warning naming REASSIGNED DeliveryEvent and lost on reload statement', () => {
    render(<ReassignmentRecordCard record={sampleRecord} />)

    // Verify exact compliance with §2 disclosure statement required by Test Plan
    expect(screen.getByText('REASSIGNED')).toBeInTheDocument()
    expect(
      screen.getByText((content) =>
        content.includes("This panel is this browser's copy of what was submitted and is lost on reload")
      )
    ).toBeInTheDocument()
  })
})
