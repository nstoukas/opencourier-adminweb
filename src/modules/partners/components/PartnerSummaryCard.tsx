import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/admin-web-components'
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block text-xs">Login Email</span>
            <span className="font-mono">{partner.email ?? '—'}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-xs">Phone Number</span>
            <span>{partner.phoneNumber ?? '—'}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-xs">Pickup Address</span>
            <span>{addressText}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-xs">Coordinates (Lat, Lng)</span>
            <span className="font-mono">
              {/* Coordinates are non-null on Location, so having the address is the only
                  question worth asking here. */}
              {loc ? `${loc.latitude}, ${loc.longitude}` : '—'}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-xs">Webhook URL</span>
            <span className="font-mono text-xs">{partner.webhookUrl ?? '—'}</span>
          </div>

          <div>
            <span className="text-muted-foreground block text-xs">Created</span>
            {/* The SDK builds createdAt with `new Date(...)`, which always yields a Date
                object — so there was never a case where the '—' fallback could show. */}
            <span>{formatDate(partner.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
