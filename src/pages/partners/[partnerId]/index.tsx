import React, { useState } from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { ArrowLeft, Edit, KeyRound } from 'lucide-react'
import { useGetPartnerQuery } from '@/api/partnersApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { Button, Icons } from '@/admin-web-components'
import { PartnerSummaryCard } from '@/modules/partners/components/PartnerSummaryCard'
import { PartnerFormDialog } from '@/modules/partners/components/PartnerFormDialog'
import { RotateCredentialsDialog } from '@/modules/partners/components/RotateCredentialsDialog'

// Detail page for inspecting and managing a single restaurant (Partner).
const PartnerDetailsPage: NextPage = () => {
  const router = useRouter()
  const partnerId = typeof router.query.partnerId === 'string' ? router.query.partnerId : ''
  const { goToPartners } = useAdminPageNavigator()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false)

  const { data: partner, isLoading, isError } = useGetPartnerQuery({ id: partnerId }, { skip: !partnerId })

  return (
    <DefaultLayout>
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="pl-0 text-muted-foreground hover:text-foreground mb-2"
            onClick={() => goToPartners()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Restaurants
          </Button>

          {isLoading ? (
            <div className="flex items-center space-x-2 py-8">
              <Icons.spinner className="h-5 w-5 animate-spin" />
              <span>Loading restaurant details...</span>
            </div>
          ) : isError || !partner ? (
            <div className="bg-destructive/15 text-destructive p-4 rounded-md">
              Restaurant not found or error loading data.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-medium tracking-tight">{partner.name}</h2>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit restaurant
                  </Button>
                  <Button variant="outline" onClick={() => setRotateDialogOpen(true)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Set new password
                  </Button>
                </div>
              </div>

              <PartnerSummaryCard partner={partner} />

              <PartnerFormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                mode="update"
                partner={partner}
              />

              <RotateCredentialsDialog
                open={rotateDialogOpen}
                onOpenChange={setRotateDialogOpen}
                partnerId={partner.id}
                partnerName={partner.name}
              />
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  )
}

export default PartnerDetailsPage
