import React from 'react'
import { Clock, HourglassMedium } from '@phosphor-icons/react'
import { describeOffer, deliveryOffer, type DeliveryOfferFields } from '../utils/offer'

interface OfferSummaryProps {
  delivery: DeliveryOfferFields
  // Passed in rather than read here, so every row of a table ages from the same clock.
  now: Date
  nameStyle?: 'short' | 'full'
}

// One line about the delivery's open offer (spec 0002, AC-11): "Ana P., 2 min" with a clock,
// or "No rider free, 4 min" with an hourglass. Nothing at all when the delivery is not
// looking for a rider. The icon only repeats what the words say, so it is hidden from screen
// readers (Phosphor icons are aria-hidden by default here) and the text carries the meaning.
export function OfferSummary({ delivery, now, nameStyle = 'short' }: OfferSummaryProps) {
  const offer = deliveryOffer(delivery)
  const text = describeOffer(delivery, now, nameStyle)
  if (!offer || !text) return null
  const Icon = offer.kind === 'waiting' ? HourglassMedium : Clock
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm" data-offer-kind={offer.kind}>
      <Icon className="shrink-0 text-muted-foreground" />
      {text}
    </span>
  )
}
