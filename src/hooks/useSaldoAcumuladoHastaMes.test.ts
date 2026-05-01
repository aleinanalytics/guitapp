import { describe, it, expect } from 'vitest'
import { ultimoDiaDelMes, cuotasPagadasHastaMes } from './useSaldoAcumuladoHastaMes'
import type { CompraCuotas } from '../lib/types'

describe('ultimoDiaDelMes (hook version)', () => {
  it('devuelve YYYY-MM-DD del último día', () => {
    expect(ultimoDiaDelMes(2024, 1)).toBe('2024-01-31')
    expect(ultimoDiaDelMes(2024, 2)).toBe('2024-02-29')
    expect(ultimoDiaDelMes(2023, 2)).toBe('2023-02-28')
    expect(ultimoDiaDelMes(2024, 12)).toBe('2024-12-31')
  })
})

describe('cuotasPagadasHastaMes', () => {
  it('cuenta cuotas vencidas hasta el mes indicado', () => {
    const c: Pick<CompraCuotas, 'cuotas_total' | 'fecha_primera_cuota'> = {
      cuotas_total: 6,
      fecha_primera_cuota: '2024-03-15',
    }
    expect(cuotasPagadasHastaMes(c, 2, 2024)).toBe(0)
    expect(cuotasPagadasHastaMes(c, 3, 2024)).toBe(1)
    expect(cuotasPagadasHastaMes(c, 5, 2024)).toBe(3)
    expect(cuotasPagadasHastaMes(c, 8, 2024)).toBe(6)
  })

  it('maneja cambio de año', () => {
    const c: Pick<CompraCuotas, 'cuotas_total' | 'fecha_primera_cuota'> = {
      cuotas_total: 6,
      fecha_primera_cuota: '2024-11-01',
    }
    expect(cuotasPagadasHastaMes(c, 1, 2025)).toBe(3)
    expect(cuotasPagadasHastaMes(c, 4, 2025)).toBe(6)
  })

  it('respeta cuotas_total como límite', () => {
    const c: Pick<CompraCuotas, 'cuotas_total' | 'fecha_primera_cuota'> = {
      cuotas_total: 3,
      fecha_primera_cuota: '2024-01-01',
    }
    expect(cuotasPagadasHastaMes(c, 12, 2025)).toBe(3)
  })
})
