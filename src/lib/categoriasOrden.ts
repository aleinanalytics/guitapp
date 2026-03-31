import type { Categoria } from './types'
import { categoriasGastoElegibles } from './categoriasJerarquia'

const INGRESO_ORDEN: Record<string, number> = {
  Sueldo: 0,
  Freelance: 1,
  Reingreso: 2,
  Varios: 3,
}

export function ordenarCategoriasPorTema(categorias: Categoria[]): Categoria[] {
  const gastosOrdenados = categoriasGastoElegibles(categorias.filter((c) => c.tipo === 'gasto'))
  const ordenGasto = new Map(gastosOrdenados.map((c, i) => [c.id, i]))

  return [...categorias].sort((a, b) => {
    if (a.tipo !== b.tipo) {
      const t: Record<Categoria['tipo'], number> = { ingreso: 0, gasto: 1, suscripcion: 2 }
      return t[a.tipo] - t[b.tipo]
    }
    if (a.tipo === 'gasto') {
      const ia = ordenGasto.get(a.id)
      const ib = ordenGasto.get(b.id)
      if (ia !== undefined && ib !== undefined && ia !== ib) return ia - ib
      if (ia !== undefined && ib === undefined) return -1
      if (ia === undefined && ib !== undefined) return 1
      return a.nombre.localeCompare(b.nombre, 'es')
    }
    if (a.tipo === 'ingreso') {
      const oa = INGRESO_ORDEN[a.nombre] ?? 50
      const ob = INGRESO_ORDEN[b.nombre] ?? 50
      if (oa !== ob) return oa - ob
      return a.nombre.localeCompare(b.nombre, 'es')
    }
    return a.nombre.localeCompare(b.nombre, 'es')
  })
}
