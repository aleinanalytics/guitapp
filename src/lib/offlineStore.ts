/**
 * IndexedDB store for offline transactions.
 * Queues transacciones when the user is offline and syncs them later.
 */

const DB_NAME = 'guitaapp-offline'
const DB_VERSION = 1
const STORE_NAME = 'transacciones_pendientes'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export interface TransaccionPendiente {
  id?: number
  user_id: string
  fecha: string
  tipo: string
  categoria_id: string
  descripcion: string
  monto: number
  moneda: string
  medio_pago: string
  es_gasto_fijo?: boolean
  excluye_saldo?: boolean
  created_at: string
}

export async function guardarPendiente(tx: TransaccionPendiente): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(tx)
    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => reject(request.error)
  })
}

export async function obtenerPendientes(): Promise<TransaccionPendiente[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as TransaccionPendiente[])
    request.onerror = () => reject(request.error)
  })
}

export async function obtenerPendientesPorUsuario(userId: string): Promise<TransaccionPendiente[]> {
  const todos = await obtenerPendientes()
  return todos.filter((p) => p.user_id === userId)
}

export async function eliminarPendiente(id: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function contarPendientes(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function contarPendientesPorUsuario(userId: string): Promise<number> {
  const todos = await obtenerPendientes()
  return todos.filter((p) => p.user_id === userId).length
}

export async function limpiarPendientes(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
