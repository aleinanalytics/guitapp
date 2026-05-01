import { useState, useEffect, useCallback } from 'react'
import { contarPendientes } from '../lib/offlineStore'
import { sincronizarPendientes } from '../lib/sync'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendientesCount, setPendientesCount] = useState(0)

  const refreshPendientes = useCallback(async () => {
    const count = await contarPendientes()
    setPendientesCount(count)
  }, [])

  useEffect(() => {
    refreshPendientes()

    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when coming back online
      void sincronizarPendientes(refreshPendientes)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for SW sync messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_TRANSACCIONES') {
        void sincronizarPendientes(refreshPendientes)
      }
    }
    navigator.serviceWorker?.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [refreshPendientes])

  return { isOnline, pendientesCount, refreshPendientes }
}
