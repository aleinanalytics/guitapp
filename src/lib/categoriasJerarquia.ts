import type { Categoria } from './types'

/** Orden fijo de categorías principales (gasto). */
export const ORDEN_PRINCIPALES_GASTO = [
  'Hogar',
  'Servicios',
  'Supermercado',
  'Alimentos',
  'Compras online',
  'Regalos',
  'Auto',
  'Transporte',
  'Salud',
  'Entretenimiento',
] as const

export type NombrePrincipal = (typeof ORDEN_PRINCIPALES_GASTO)[number]

function idxPrincipal(nombre: string): number {
  const i = ORDEN_PRINCIPALES_GASTO.indexOf(nombre as NombrePrincipal)
  return i === -1 ? 999 : i
}

/** Gasto raíz: principal (parent_id null) o categoría vieja sin padre. */
export function esCategoriaGastoPrincipal(c: Categoria): boolean {
  return c.tipo === 'gasto' && (c.parent_id == null || c.parent_id === '')
}

/** Subcategoría de gasto (hoja con parent_id). */
export function esSubcategoriaGasto(c: Categoria): boolean {
  return c.tipo === 'gasto' && !!c.parent_id
}

export function principalesGastoOrdenadas(categorias: Categoria[]): Categoria[] {
  const p = categorias.filter(esCategoriaGastoPrincipal)
  const hijos = new Set(categorias.filter(esSubcategoriaGasto).map((s) => s.parent_id))
  const soloPrincipales = p.filter((c) => hijos.has(c.id))
  const legacy = p.filter((c) => !hijos.has(c.id))
  const ordenadas = [...soloPrincipales].sort(
    (a, b) => idxPrincipal(a.nombre) - idxPrincipal(b.nombre) || a.nombre.localeCompare(b.nombre, 'es'),
  )
  return [...ordenadas, ...legacy.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))]
}

export function subcategoriasDe(principalId: string, categorias: Categoria[]): Categoria[] {
  return categorias
    .filter((c) => c.tipo === 'gasto' && c.parent_id === principalId)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

/** Principal más todas sus subcategorías (para filtrar “todo el rubro”). */
export function idsFamiliaGastoPrincipal(principalId: string, categorias: Categoria[]): string[] {
  const subs = subcategoriasDe(principalId, categorias).map((s) => s.id)
  return [principalId, ...subs]
}

/** Hojas elegibles para transacciones: subcategorías + gastos planos legacy (sin hijos). */
export function categoriasGastoElegibles(categorias: Categoria[]): Categoria[] {
  const subs = categorias.filter(esSubcategoriaGasto)
  if (subs.length > 0) {
    const ordenados: Categoria[] = []
    for (const p of principalesGastoOrdenadas(categorias)) {
      for (const s of subcategoriasDe(p.id, categorias)) {
        ordenados.push(s)
      }
    }
    const legacy = categorias.filter(
      (c) => c.tipo === 'gasto' && !c.parent_id && !subs.some((s) => s.parent_id === c.id),
    )
    return [...ordenados, ...legacy.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))]
  }
  return categorias.filter((c) => c.tipo === 'gasto').sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

/**
 * ID guardado en el KPI de categoría del home: subcategoría, categoría plana legacy,
 * o principal con hijos (opción "Todo el rubro" del select).
 */
export function esIdValidoParaKpiGastoHome(id: string, categorias: Categoria[]): boolean {
  if (!id) return false
  const cat = categorias.find((c) => c.tipo === 'gasto' && c.id === id)
  if (!cat) return false
  if (categoriasGastoElegibles(categorias).some((c) => c.id === id)) return true
  const esPrincipalConHijos =
    !cat.parent_id && categorias.some((c) => c.tipo === 'gasto' && c.parent_id === cat.id)
  return esPrincipalConHijos
}

export function principalDeCategoria(
  cat: Categoria | undefined,
  categorias: Categoria[],
): Categoria | null {
  if (!cat || cat.tipo !== 'gasto') return null
  if (cat.parent_id) {
    return categorias.find((c) => c.id === cat.parent_id) ?? null
  }
  const tieneHijos = categorias.some((c) => c.parent_id === cat.id)
  if (tieneHijos) return cat
  return null
}

/**
 * Gastos en categoría o principal llamada "Otros" no entran al presupuesto (imprevistos).
 * Nombre exacto "otros" (sin distinguir mayúsculas).
 */
export function esGastoOtrosExcluidoDePresupuesto(
  cat: Categoria | undefined,
  categorias: Categoria[],
): boolean {
  if (!cat || cat.tipo !== 'gasto') return false
  if (cat.nombre.trim().toLowerCase() === 'otros') return true
  const p = principalDeCategoria(cat, categorias)
  return !!(p && p.nombre.trim().toLowerCase() === 'otros')
}

/** Etiqueta "Principal › Sub" para selects. */
export function etiquetaCategoriaGasto(cat: Categoria, categorias: Categoria[]): string {
  const p = principalDeCategoria(cat, categorias)
  if (p && p.id !== cat.id) return `${p.nombre} › ${cat.nombre}`
  return cat.nombre
}
