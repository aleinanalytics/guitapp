import { describe, it, expect } from 'vitest'
import {
  esCategoriaGastoPrincipal,
  esSubcategoriaGasto,
  principalesGastoOrdenadas,
  subcategoriasDe,
  idsFamiliaGastoPrincipal,
  categoriasGastoElegibles,
  esIdValidoParaKpiGastoHome,
  principalDeCategoria,
  esGastoOtrosExcluidoDePresupuesto,
  etiquetaCategoriaGasto,
} from './categoriasJerarquia'
import type { Categoria } from './types'

const crearCat = (overrides: Partial<Categoria> & { nombre: string }): Categoria => ({
  id: crypto.randomUUID(),
  tipo: 'gasto',
  color: '#000',
  parent_id: null,
  ...overrides,
})

describe('esCategoriaGastoPrincipal', () => {
  it('identifica principales', () => {
    expect(esCategoriaGastoPrincipal(crearCat({ nombre: 'Hogar' }))).toBe(true)
    expect(esCategoriaGastoPrincipal(crearCat({ nombre: 'Hogar', parent_id: '' }))).toBe(true)
  })

  it('rechaza subcategorías', () => {
    expect(esCategoriaGastoPrincipal(crearCat({ nombre: 'Expensas', parent_id: 'padre-id' }))).toBe(false)
  })

  it('rechaza no-gastos', () => {
    expect(esCategoriaGastoPrincipal({ id: '1', nombre: 'Sueldo', tipo: 'ingreso', color: '#000', parent_id: null })).toBe(false)
  })
})

describe('esSubcategoriaGasto', () => {
  it('identifica subcategorías', () => {
    expect(esSubcategoriaGasto(crearCat({ nombre: 'Expensas', parent_id: 'padre-id' }))).toBe(true)
  })

  it('rechaza principales', () => {
    expect(esSubcategoriaGasto(crearCat({ nombre: 'Hogar' }))).toBe(false)
  })
})

describe('principalesGastoOrdenadas', () => {
  it('ordena según ORDEN_PRINCIPALES_GASTO', () => {
    const transporte = crearCat({ nombre: 'Transporte', id: 'transporte-id' })
    const hogar = crearCat({ nombre: 'Hogar', id: 'hogar-id' })
    const alimentos = crearCat({ nombre: 'Alimentos', id: 'alimentos-id' })
    // Para que sean considerados "principales con hijos" necesitamos al menos una subcategoría
    const subHogar = crearCat({ nombre: 'Expensas', parent_id: 'hogar-id' })
    const subAlimentos = crearCat({ nombre: 'Panadería', parent_id: 'alimentos-id' })
    const subTransporte = crearCat({ nombre: 'Colectivo', parent_id: 'transporte-id' })

    const cats = [transporte, hogar, alimentos, subHogar, subAlimentos, subTransporte]
    const ordenadas = principalesGastoOrdenadas(cats)
    expect(ordenadas[0].nombre).toBe('Hogar')
    expect(ordenadas[1].nombre).toBe('Alimentos')
    expect(ordenadas[2].nombre).toBe('Transporte')
  })

  it('coloca legacy sin hijos al final', () => {
    const cats = [
      crearCat({ nombre: 'Legacy', id: 'legacy-1' }),
      crearCat({ nombre: 'Hogar' }),
    ]
    const ordenadas = principalesGastoOrdenadas(cats)
    expect(ordenadas[ordenadas.length - 1].nombre).toBe('Legacy')
  })
})

describe('subcategoriasDe', () => {
  it('devuelve solo hijas del principal indicado', () => {
    const padre = crearCat({ nombre: 'Hogar', id: 'hogar-id' })
    const hija1 = crearCat({ nombre: 'Expensas', parent_id: 'hogar-id' })
    const hija2 = crearCat({ nombre: 'Alquiler', parent_id: 'hogar-id' })
    const otra = crearCat({ nombre: 'Garage', parent_id: 'otro-id' })

    const subs = subcategoriasDe('hogar-id', [padre, hija1, hija2, otra])
    expect(subs.map((s) => s.nombre)).toEqual(['Alquiler', 'Expensas'])
  })
})

describe('idsFamiliaGastoPrincipal', () => {
  it('incluye al principal y sus subcategorías', () => {
    const padre = crearCat({ nombre: 'Hogar', id: 'hogar-id' })
    const hija = crearCat({ nombre: 'Expensas', parent_id: 'hogar-id' })

    expect(idsFamiliaGastoPrincipal('hogar-id', [padre, hija])).toEqual(['hogar-id', expect.any(String)])
  })
})

describe('categoriasGastoElegibles', () => {
  it('devuelve subcategorías ordenadas cuando existen', () => {
    const padre = crearCat({ nombre: 'Hogar', id: 'hogar-id' })
    const hija = crearCat({ nombre: 'Expensas', parent_id: 'hogar-id' })

    const elegibles = categoriasGastoElegibles([padre, hija])
    expect(elegibles.map((c) => c.nombre)).toEqual(['Expensas'])
  })

  it('devuelve gastos planos si no hay subcategorías', () => {
    const cat1 = crearCat({ nombre: 'Hogar' })
    const cat2 = crearCat({ nombre: 'Auto' })

    const elegibles = categoriasGastoElegibles([cat1, cat2])
    expect(elegibles.map((c) => c.nombre)).toEqual(['Auto', 'Hogar'])
  })
})

describe('esIdValidoParaKpiGastoHome', () => {
  it('acepta subcategorías', () => {
    const hogar = crearCat({ nombre: 'Hogar', id: 'hogar-id' })
    const sub = crearCat({ nombre: 'Expensas', parent_id: 'hogar-id' })
    expect(esIdValidoParaKpiGastoHome(sub.id, [hogar, sub])).toBe(true)
  })

  it('acepta principales con hijos', () => {
    const padre = crearCat({ nombre: 'Hogar', id: 'hogar-id' })
    const hija = crearCat({ nombre: 'Expensas', parent_id: 'hogar-id' })
    expect(esIdValidoParaKpiGastoHome('hogar-id', [padre, hija])).toBe(true)
  })

  it('rechaza IDs vacíos o inexistentes', () => {
    expect(esIdValidoParaKpiGastoHome('', [])).toBe(false)
    expect(esIdValidoParaKpiGastoHome('fake-id', [])).toBe(false)
  })
})

describe('principalDeCategoria', () => {
  it('devuelve el principal de una subcategoría', () => {
    const padre = crearCat({ nombre: 'Hogar', id: 'hogar-id' })
    const hija = crearCat({ nombre: 'Expensas', parent_id: 'hogar-id' })
    expect(principalDeCategoria(hija, [padre, hija])?.nombre).toBe('Hogar')
  })

  it('devuelve null para ingresos', () => {
    const ingreso = crearCat({ nombre: 'Sueldo', tipo: 'ingreso' })
    expect(principalDeCategoria(ingreso, [ingreso])).toBeNull()
  })

  it('devuelve la misma categoría si es principal con hijos', () => {
    const padre = crearCat({ nombre: 'Hogar', id: 'hogar-id' })
    const hija = crearCat({ nombre: 'Expensas', parent_id: 'hogar-id' })
    expect(principalDeCategoria(padre, [padre, hija])?.nombre).toBe('Hogar')
  })
})

describe('esGastoOtrosExcluidoDePresupuesto', () => {
  it('identifica categoría llamada Otros', () => {
    const otros = crearCat({ nombre: 'Otros' })
    expect(esGastoOtrosExcluidoDePresupuesto(otros, [otros])).toBe(true)
  })

  it('identifica subcategoría de principal Otros', () => {
    const padre = crearCat({ nombre: 'Otros', id: 'otros-id' })
    const hija = crearCat({ nombre: 'General', parent_id: 'otros-id' })
    expect(esGastoOtrosExcluidoDePresupuesto(hija, [padre, hija])).toBe(true)
  })

  it('devuelve false para otras categorías', () => {
    const hogar = crearCat({ nombre: 'Hogar' })
    expect(esGastoOtrosExcluidoDePresupuesto(hogar, [hogar])).toBe(false)
  })
})

describe('etiquetaCategoriaGasto', () => {
  it('muestra Principal › Sub para subcategorías', () => {
    const padre = crearCat({ nombre: 'Hogar', id: 'hogar-id' })
    const hija = crearCat({ nombre: 'Expensas', parent_id: 'hogar-id' })
    expect(etiquetaCategoriaGasto(hija, [padre, hija])).toBe('Hogar › Expensas')
  })

  it('muestra solo nombre para principales sin padre', () => {
    const cat = crearCat({ nombre: 'Hogar' })
    expect(etiquetaCategoriaGasto(cat, [cat])).toBe('Hogar')
  })
})
