import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, CloudCheck } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { sincronizarPendientes } from '../lib/sync'

export default function OfflineBanner() {
  const { isOnline, pendientesCount, refreshPendientes } = useOnlineStatus()
  const [syncing, setSyncing] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!isOnline || pendientesCount > 0)
  }, [isOnline, pendientesCount])

  if (!visible) return null

  const handleSync = async () => {
    setSyncing(true)
    await sincronizarPendientes(refreshPendientes)
    setSyncing(false)
  }

  return (
    <div
      className={`sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-medium backdrop-blur-md ${
        !isOnline
          ? 'bg-amber-500/10 text-amber-300 border-b border-amber-500/20'
          : 'bg-emerald-500/10 text-emerald-300 border-b border-emerald-500/20'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff size={14} className="shrink-0" />
            <span>Sin conexión. Los movimientos se guardan localmente.</span>
          </>
        ) : pendientesCount > 0 ? (
          <>
            <CloudCheck size={14} className="shrink-0" />
            <span>
              {pendientesCount} movimiento{pendientesCount > 1 ? 's' : ''} pendiente{pendientesCount > 1 ? 's' : ''} de sincronizar
            </span>
          </>
        ) : null}
      </div>
      {isOnline && pendientesCount > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/15 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={`shrink-0 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
        </button>
      )}
    </div>
  )
}
