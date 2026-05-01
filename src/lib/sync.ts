import { supabase } from './supabase'
import { guardarPendiente, obtenerPendientes, eliminarPendiente, type TransaccionPendiente } from './offlineStore'
import { notify } from '../components/Toaster'

/**
 * Intenta guardar una transacción en Supabase.
 * Si falla por falta de conexión, la guarda en IndexedDB para sincronizar después.
 */
export async function guardarTransaccionConFallback(
  tx: Omit<TransaccionPendiente, 'id' | 'created_at'>,
): Promise<{ success: boolean; offline: boolean; id?: number }> {
  try {
    const { error } = await supabase.from('transacciones').insert(tx)
    if (error) throw error
    return { success: true, offline: false }
  } catch (err) {
    const isOffline = !navigator.onLine || (err as Error).message?.includes('fetch')
    if (isOffline) {
      const id = await guardarPendiente({ ...tx, created_at: new Date().toISOString() })
      notify.info('Sin conexión. Movimiento guardado localmente. Se sincronizará automáticamente.')
      // Register background sync if supported
      const sw = 'serviceWorker' in navigator ? (navigator as any).serviceWorker : null
      if (sw && 'sync' in (sw.registration ?? {})) {
        try {
          const registration = await navigator.serviceWorker.ready
          await (registration as any).sync.register('sync-transacciones')
        } catch {
          // Background sync not supported or failed
        }
      }
      return { success: true, offline: true, id }
    }
    throw err
  }
}

/**
 * Sincroniza todas las transacciones pendientes con Supabase.
 * Llama a onSuccess por cada transacción sincronizada.
 */
export async function sincronizarPendientes(onSuccess?: () => void): Promise<{
  sincronizadas: number
  errores: number
}> {
  const pendientes = await obtenerPendientes()
  if (pendientes.length === 0) return { sincronizadas: 0, errores: 0 }

  let sincronizadas = 0
  let errores = 0

  for (const p of pendientes) {
    try {
      const { id, ...tx } = p
      const { error } = await supabase.from('transacciones').insert(tx)
      if (error) throw error
      await eliminarPendiente(id!)
      sincronizadas++
    } catch {
      errores++
    }
  }

  if (sincronizadas > 0) {
    notify.success(`${sincronizadas} movimiento${sincronizadas > 1 ? 's' : ''} sincronizado${sincronizadas > 1 ? 's' : ''}`)
    onSuccess?.()
  }

  return { sincronizadas, errores }
}
