import React, { useState } from 'react'
import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import { ArrowLeft, PencilSimple, Key } from '@phosphor-icons/react'
import { useGetPartnerQuery } from '@/api/partnersApi'
import { DefaultLayout } from '@/components/layouts/DefaultLayout'
import { PageHeader } from '@/components/layouts/PageHeader'
import { useAdminPageNavigator } from '@/hooks/useAdminPageNavigator'
import { Button, Spinner } from '@/admin-web-components'
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

          {/* The h1 is there in every state: "Restaurant" while loading or on an error. */}
          <PageHeader
            title={partner?.name || 'Restaurant'}
            action={
              partner ? (
                <>
                  <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                    <PencilSimple className="mr-2 h-4 w-4" />
                    Edit restaurant
                  </Button>
                  <Button variant="outline" onClick={() => setRotateDialogOpen(true)}>
                    <Key className="mr-2 h-4 w-4" />
                    Set new password
                  </Button>
                </>
              ) : undefined
            }
          />

          {isLoading ? (
            <div className="flex items-center space-x-2 py-8">
              <Spinner className="h-5 w-5" />
              <span>Loading restaurant details...</span>
            </div>
          ) : isError || !partner ? (
            <div className="bg-destructive/15 text-destructive p-4 rounded-md">
              Restaurant not found or error loading data.
            </div>
          ) : (
            <div className="space-y-6">
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
