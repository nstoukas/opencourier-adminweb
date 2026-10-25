import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, DetailList } from '@/admin-web-components'
import type { PartnerAdminDto } from '@/backend-admin-sdk'
import { formatPickupAddressForDisplay } from '@/utils/partnerPickupAddress'
import { formatDate } from '@/ui-shared-utils'

interface PartnerSummaryCardProps {
  partner: PartnerAdminDto
}

// Read-only summary card displaying a restaurant's details, login info, and pickup location.
export const PartnerSummaryCard: React.FC<PartnerSummaryCardProps> = ({ partner }) => {
  const addressText = formatPickupAddressForDisplay(partner.pickupAddress)
  const loc = partner.pickupAddress

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{partner.name}</CardTitle>
          {!partner.pickupAddress ? (
            <Badge variant="destructive">No Pickup Address</Badge>
          ) : (
            <Badge variant="outline">Active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!partner.pickupAddress ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-sm font-medium">
            ⚠️ No pickup address — this restaurant cannot create a Delivery until one is set.
          </div>
        ) : null}

        {/* DetailList (the design system's label and value list) shows an em dash for a
            missing value, so the '—' fallbacks the old grid spelled out are no longer needed. */}
        <DetailList
          items={[
            { label: 'Login Email', value: partner.email, mono: true },
            { label: 'Phone Number', value: partner.phoneNumber },
            { label: 'Pickup Address', value: addressText },
            {
              label: 'Coordinates (Lat, Lng)',
              // Coordinates are non-null on Location, so having the address is the only
              // question worth asking here.
              value: loc ? `${loc.latitude}, ${loc.longitude}` : null,
              mono: true,
            },
            { label: 'Webhook URL', value: partner.webhookUrl, mono: true },
            // The SDK builds createdAt with `new Date(...)`, which always yields a Date object.
            { label: 'Created', value: formatDate(partner.createdAt) },
          ]}
        />
      </CardContent>
    </Card>
  )
}
