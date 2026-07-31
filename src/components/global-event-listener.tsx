import React, { useEffect } from 'react'
import { NotificationEventType, adminBroadcastNotificationChannel } from '../shared-types'
import { useWebSocket } from '../admin-web-components'

import useAppSelector from '@/hooks/useAppSelector'

import { DeliveryAdminDto } from '../backend-admin-sdk'

const GlobalEventListener = () => {
  const { accessToken } = useAppSelector((state) => state.auth)

  const { ably, connectWebSocket, disconnectWebSocket, subscribeToEvent } = useWebSocket()

  useEffect(() => {
    if (accessToken) {
      connectWebSocket(accessToken)
    } else {
      disconnectWebSocket()
    }
  }, [accessToken])

  useEffect(() => {
    if (!ably) {
      return
    }

    const adminBroadcastChannel = adminBroadcastNotificationChannel()

    subscribeToEvent<DeliveryAdminDto>(
      adminBroadcastChannel,
      NotificationEventType.NEW_DELIVERY_OFFER,
      (eventData) => {
        console.log('Received new delivery offer', eventData)
      }
    )
  }, [ably])

  return <></>
}

export default GlobalEventListener
