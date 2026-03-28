import type { Moneda } from './types'

export function formatARS(n: number): string {
  return '$ ' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatUSD(n: number): string {
  return 'USD ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function convertirARS(monto: number, moneda: Moneda, tipoCambio: number): number {
  return moneda === 'USD' ? monto * tipoCambio : monto
}

export function calcularVariacion(actual: number, anterior: number): number {
  if (anterior === 0) return 0
  return ((actual - anterior) / anterior) * 100
}
