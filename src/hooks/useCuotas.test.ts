import { describe, it, expect } from 'vitest'
import { getCuotaForMonth } from './useCuotas'
import type { CompraCuotas } from '../lib/types'

const crearCuota = (overrides: Partial<CompraCuotas> & { fecha_primera_cuota: string; cuotas_total: number }): CompraCuotas => ({
  id: '1',
  user_id: 'u1',
  descripcion: 'Test',
  monto_total: 10000,
  monto_cuota: 1000,
  moneda: 'ARS',
  categoria_id: null,
  created_at: '',
  ...overrides,
})

describe('getCuotaForMonth', () => {
  it('devuelve la cuota correcta para el mes de inicio', () => {
    const c = crearCuota({ fecha_primera_cuota: '2024-03-15', cuotas_total: 6 })
    const result = getCuotaForMonth(c, 3, 2024)
    expect(result).toEqual({ numero: 1, total: 6, monto: 1000 })
  })

  it('devuelve la cuota correcta para meses posteriores', () => {
    const c = crearCuota({ fecha_primera_cuota: '2024-01-10', cuotas_total: 12 })
    expect(getCuotaForMonth(c, 6, 2024)).toEqual({ numero: 6, total: 12, monto: 1000 })
    expect(getCuotaForMonth(c, 12, 2024)).toEqual({ numero: 12, total: 12, monto: 1000 })
  })

  it('maneja cambio de año', () => {
    const c = crearCuota({ fecha_primera_cuota: '2024-11-01', cuotas_total: 6 })
    expect(getCuotaForMonth(c, 1, 2025)).toEqual({ numero: 3, total: 6, monto: 1000 })
    expect(getCuotaForMonth(c, 4, 2025)).toEqual({ numero: 6, total: 6, monto: 1000 })
  })

  it('devuelve null si el mes es anterior al inicio', () => {
    const c = crearCuota({ fecha_primera_cuota: '2024-06-01', cuotas_total: 3 })
    expect(getCuotaForMonth(c, 5, 2024)).toBeNull()
  })

  it('devuelve null si ya se pagaron todas las cuotas', () => {
    const c = crearCuota({ fecha_primera_cuota: '2024-01-01', cuotas_total: 3 })
    expect(getCuotaForMonth(c, 5, 2024)).toBeNull()
  })

  it('maneja fecha en el último día del mes', () => {
    const c = crearCuota({ fecha_primera_cuota: '2024-01-31', cuotas_total: 3 })
    expect(getCuotaForMonth(c, 1, 2024)).toEqual({ numero: 1, total: 3, monto: 1000 })
    expect(getCuotaForMonth(c, 2, 2024)).toEqual({ numero: 2, total: 3, monto: 1000 })
  })
})
