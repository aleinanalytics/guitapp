import type { Categoria } from './types'

/**
 * Orden visual por tema (alimentos, transporte, vivienda, etc.).
 * Categorías desconocidas van al final, ordenadas por nombre.
 */
const GASTO_POR_TEMA: Record<string, readonly [grupo: number, dentro: number]> = {
  Supermercado: [1, 0],
  Verduleria: [1, 1],
  Carniceria: [1, 2],
  Fiambreria: [1, 3],
  Alimentos: [1, 4],
  Helado: [1, 5],
  Panadería: [1, 6],
  Restaurante: [1, 7],
  Transporte: [2, 0],
  Auto: [2, 1],
  Combustible: [2, 2],
  Estacionamiento: [2, 3],
  Vivienda: [3, 0],
  Alquiler: [3, 1],
  Servicios: [3, 2],
  Salud: [4, 0],
  Entretenimiento: [5, 0],
  'Otros gastos': [6, 0],
}

const INGRESO_ORDEN: Record<string, number> = {
  Sueldo: 0,
  Freelance: 1,
  Reingreso: 2,
  Varios: 3,
}

export function ordenarCategoriasPorTema(categorias: Categoria[]): Categoria[] {
  return [...categorias].sort((a, b) => {
    if (a.tipo !== b.tipo) {
      const t: Record<Categoria['tipo'], number> = { ingreso: 0, gasto: 1, suscripcion: 2 }
      return t[a.tipo] - t[b.tipo]
    }
    if (a.tipo === 'gasto') {
      const ka = GASTO_POR_TEMA[a.nombre] ?? [99, 0]
      const kb = GASTO_POR_TEMA[b.nombre] ?? [99, 0]
      if (ka[0] !== kb[0]) return ka[0] - kb[0]
      if (ka[1] !== kb[1]) return ka[1] - kb[1]
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
