import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import EditableTransaccionListRow from '../components/EditableTransaccionListRow'
import MobileUserMenu from '../components/MobileUserMenu'
import { useTransacciones } from '../hooks/useTransacciones'
import { useTarjetaConfig } from '../hooks/useTarjetaConfig'
import { useSaldoAcumuladoHastaMes } from '../hooks/useSaldoAcumuladoHastaMes'
import { useTipoCambio } from '../hooks/useTipoCambio'
import {
  convertirARS,
  cuentaComoSalidaDeEfectivo,
  esIngresoReintegroTarjetaCredito,
  formatARS,
  formatUSD,
  grupoGastoPorMedio,
  montoDisplayClass,
  transaccionEnMesVista,
  type GrupoGastoPorMedio,
} from '../lib/utils'
import type { Categoria, Transaccion } from '../lib/types'
import { ordenarCategoriasPorTema } from '../lib/categoriasOrden'
import {
  idsFamiliaGastoPrincipal,
  principalesGastoOrdenadas,
  subcategoriasDe,
} from '../lib/categoriasJerarquia'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function parseTipo(raw: string | null): 'ingreso' | 'gasto' | 'suscripcion' | 'todos' {
  if (raw === 'ingreso' || raw === 'gasto' || raw === 'suscripcion' || raw === 'todos') return raw
  return 'todos'
}

const GASTOS_MEDIO_GRUPOS: {
  key: GrupoGastoPorMedio
  titulo: string
  subtitulo: string
}[] = [
  { key: 'transferencias', titulo: 'Transferencias', subtitulo: 'Pagos con transferencia' },
  { key: 'debito', titulo: 'Débito', subtitulo: 'Efectivo y compras con débito' },
  { key: 'credito', titulo: 'Crédito', subtitulo: 'Tarjeta de crédito' },
]

type FiltroGastoCategoria = {
  principalId: string | null
  subId: string | null
  legacyExactId: string | null
}

/** Combina `padre`/`hijo` en la URL con enlaces viejos `categoria_id` (KPI dashboard). */
function derivarFiltroGastoCategoria(
  categorias: Categoria[],
  padreQ: string,
  hijoQ: string,
  legacyCategoriaId: string | null,
): FiltroGastoCategoria {
  const padre = padreQ.trim()
  const hijo = hijoQ.trim()
  const legacy = legacyCategoriaId?.trim() || ''

  if (padre || hijo) {
    let principalId = padre
    let subId = hijo
    if (!principalId && subId) {
      const subCat = categorias.find((c) => c.id === subId && c.tipo === 'gasto')
      principalId = (subCat?.parent_id ?? '').trim()
      if (!principalId) subId = ''
    }
    return {
      principalId: principalId || null,
      subId: subId || null,
      legacyExactId: null,
    }
  }

  if (legacy) {
    const cat = categorias.find((c) => c.id === legacy)
    if (!cat || cat.tipo !== 'gasto') {
      return { principalId: null, subId: null, legacyExactId: legacy }
    }
    const tieneHijos = categorias.some((c) => c.parent_id === cat.id)
    if (cat.parent_id) {
      return { principalId: cat.parent_id, subId: cat.id, legacyExactId: null }
    }
    if (tieneHijos) {
      return { principalId: cat.id, subId: null, legacyExactId: null }
    }
    // Hoja sin hijos: un solo id en la familia (mismo efecto que match exacto).
    return { principalId: cat.id, subId: null, legacyExactId: null }
  }

  return { principalId: null, subId: null, legacyExactId: null }
}

export default function MovimientosMes() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tipo = parseTipo(searchParams.get('tipo'))
  const now = new Date()
  const mesRaw = Number(searchParams.get('mes'))
  const anioRaw = Number(searchParams.get('anio'))
  const mes = mesRaw >= 1 && mesRaw <= 12 ? mesRaw : now.getMonth() + 1
  const anio = Number.isFinite(anioRaw) && anioRaw >= 2000 && anioRaw <= 2100 ? anioRaw : now.getFullYear()
  const padreQ = searchParams.get('padre') ?? ''
  const hijoQ = searchParams.get('hijo') ?? ''
  const categoriaIdLegacy = searchParams.get('categoria_id')
  const sinTarjetaCredito = searchParams.get('sin_tc') === '1'

  const { transacciones, loading, error, refetch } = useTransacciones({ mes, anio })
  const { config: tcConfig } = useTarjetaConfig()
  const { tipoCambio } = useTipoCambio()
  const tc = tipoCambio?.usd_ars ?? 1000
  const { saldoAcumulado, loading: loadingSaldoAcum } = useSaldoAcumuladoHastaMes({ mes, anio, tc })
  const [categorias, setCategorias] = useState<Categoria[]>([])
  /** Total mostrado: con check suma TC; sin check solo efectivo/transf./débito (misma lista filtrada). */
  const [totalIncluyeTc, setTotalIncluyeTc] = useState(true)

  useEffect(() => {
    supabase.from('categorias').select('*').then(({ data }) => {
      if (data) setCategorias(data as Categoria[])
    })
  }, [])

  const filtroGastoCat = useMemo(
    () => derivarFiltroGastoCategoria(categorias, padreQ, hijoQ, categoriaIdLegacy),
    [categorias, padreQ, hijoQ, categoriaIdLegacy],
  )

  const principalesGasto = useMemo(() => principalesGastoOrdenadas(categorias), [categorias])
  const padreParaListaSub = filtroGastoCat.principalId ?? ''
  const subcategoriasOpciones = useMemo(
    () => (padreParaListaSub ? subcategoriasDe(padreParaListaSub, categorias) : []),
    [padreParaListaSub, categorias],
  )

  const onCambioPadreGasto = useCallback(
    (principalId: string) => {
      const s = new URLSearchParams(searchParams)
      s.delete('categoria_id')
      if (!principalId) {
        s.delete('padre')
        s.delete('hijo')
      } else {
        s.set('padre', principalId)
        s.delete('hijo')
      }
      setSearchParams(s, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const onCambioSubGasto = useCallback(
    (subId: string) => {
      const s = new URLSearchParams(searchParams)
      s.delete('categoria_id')
      const p = filtroGastoCat.principalId ?? padreQ
      if (!subId) {
        s.delete('hijo')
        if (p) s.set('padre', p)
      } else {
        if (p) s.set('padre', p)
        s.set('hijo', subId)
      }
      setSearchParams(s, { replace: true })
    },
    [searchParams, setSearchParams, filtroGastoCat.principalId, padreQ],
  )

  const diaCierreTc =
    tcConfig?.fecha_cierre != null
      ? new Date(tcConfig.fecha_cierre + 'T12:00:00').getDate()
      : null
  const transaccionesDelMes = useMemo(
    () => transacciones.filter((t) => transaccionEnMesVista(t, mes, anio, diaCierreTc)),
    [transacciones, mes, anio, diaCierreTc],
  )

  const filtradas = useMemo(() => {
    let list = tipo === 'todos' ? transaccionesDelMes : transaccionesDelMes.filter((t) => t.tipo === tipo)
    if (tipo === 'gasto') {
      const f = filtroGastoCat
      if (f.legacyExactId) {
        list = list.filter((t) => t.categoria_id === f.legacyExactId)
      } else if (f.subId) {
        list = list.filter((t) => t.categoria_id === f.subId)
      } else if (f.principalId) {
        const ids = new Set(idsFamiliaGastoPrincipal(f.principalId, categorias))
        list = list.filter((t) => t.categoria_id != null && ids.has(t.categoria_id))
      }
    } else if (categoriaIdLegacy) {
      list = list.filter((t) => t.categoria_id === categoriaIdLegacy)
    }
    if (sinTarjetaCredito && tipo === 'gasto') {
      list = list.filter((t) => t.medio_pago !== 'tarjeta')
    }
    return [...list].sort((a, b) => {
      const fd = b.fecha.localeCompare(a.fecha)
      if (fd !== 0) return fd
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })
  }, [transaccionesDelMes, tipo, filtroGastoCat, categorias, categoriaIdLegacy, sinTarjetaCredito])

  const totalGastoMostrado = useMemo(() => {
    if (tipo !== 'gasto') return 0
    const lista =
      sinTarjetaCredito || totalIncluyeTc
        ? filtradas
        : filtradas.filter((t) => t.medio_pago !== 'tarjeta')
    return lista.reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
  }, [filtradas, tipo, tc, totalIncluyeTc, sinTarjetaCredito])

  const gastosPorGrupoMedio = useMemo(() => {
    if (tipo !== 'gasto') return null
    const map: Record<GrupoGastoPorMedio, Transaccion[]> = {
      transferencias: [],
      debito: [],
      credito: [],
    }
    for (const t of filtradas) {
      const g = grupoGastoPorMedio(t)
      if (g) map[g].push(t)
    }
    return GASTOS_MEDIO_GRUPOS.map((def) => ({ ...def, items: map[def.key] })).filter((x) => x.items.length > 0)
  }, [filtradas, tipo])

  const resumen = useMemo(() => {
    const ing = transaccionesDelMes
      .filter((t) => t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t))
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const reintegrosTc = transaccionesDelMes
      .filter(esIngresoReintegroTarjetaCredito)
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const gas = transaccionesDelMes.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const sus = transaccionesDelMes.filter((t) => t.tipo === 'suscripcion').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const salidasEf = transaccionesDelMes
      .filter(cuentaComoSalidaDeEfectivo)
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    return {
      ingresos: ing,
      reintegrosTc,
      gastos: gas,
      suscripciones: sus,
      resultadoMes: ing - salidasEf,
    }
  }, [transaccionesDelMes, tc])

  const nombreFiltroGastoTitulo = useMemo(() => {
    if (tipo !== 'gasto') return undefined
    const f = filtroGastoCat
    if (f.legacyExactId) {
      return categorias.find((c) => c.id === f.legacyExactId)?.nombre
    }
    if (f.subId) {
      return categorias.find((c) => c.id === f.subId)?.nombre
    }
    if (f.principalId) {
      const n = categorias.find((c) => c.id === f.principalId)?.nombre
      return n ? `${n} (todo el rubro)` : undefined
    }
    return undefined
  }, [tipo, filtroGastoCat, categorias])

  const titulo =
    tipo === 'ingreso'
      ? 'Ingresos del mes'
      : tipo === 'gasto'
        ? nombreFiltroGastoTitulo
          ? sinTarjetaCredito
            ? `Gastos del mes — ${nombreFiltroGastoTitulo} (sin TC)`
            : `Gastos del mes — ${nombreFiltroGastoTitulo}`
          : sinTarjetaCredito
            ? 'Gastos del mes — sin tarjeta de crédito'
            : 'Gastos del mes'
        : tipo === 'suscripcion'
          ? 'Suscripciones del mes'
          : 'Todas las operaciones'

  const sub = `${MESES[mes - 1]} ${anio}`

  const dashLink = `/?mes=${mes}&anio=${anio}`

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <Link
        to={dashLink}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Volver al dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-50 lg:text-3xl">{titulo}</h1>
          <p className="mt-1 text-sm text-gray-500">{sub}</p>
        </div>
        <div className="shrink-0 lg:hidden">
          <MobileUserMenu />
        </div>
      </motion.div>

      {tipo === 'gasto' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-3 sm:p-4 rounded-xl mb-6 space-y-3 border border-white/[0.06]"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              Filtrar por categoría
            </p>
            {!sinTarjetaCredito && (
              <label className="inline-flex items-center justify-center gap-2.5 cursor-pointer select-none text-sm text-gray-400 hover:text-gray-300 transition-colors">
                <input
                  type="checkbox"
                  checked={totalIncluyeTc}
                  onChange={(e) => setTotalIncluyeTc(e.target.checked)}
                  className="h-4 w-4 shrink-0 rounded border-white/25 bg-dark-900/80 accent-rose-500 text-rose-500 focus:ring-rose-500/40 focus:ring-offset-0 focus:ring-2"
                />
                <span>Con tarjeta de crédito</span>
              </label>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className="text-[11px] text-gray-500 mb-1 block">Categoría</span>
              <select
                className="w-full rounded-lg border border-white/10 bg-dark-900/80 px-3 py-2 text-sm text-gray-200"
                value={filtroGastoCat.principalId ?? ''}
                onChange={(e) => onCambioPadreGasto(e.target.value)}
                disabled={loading && categorias.length === 0}
              >
                <option value="">Todas las categorías</option>
                {principalesGasto.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="text-[11px] text-gray-500 mb-1 block">Subcategoría</span>
              <select
                className="w-full rounded-lg border border-white/10 bg-dark-900/80 px-3 py-2 text-sm text-gray-200 disabled:opacity-45"
                value={filtroGastoCat.subId ?? ''}
                onChange={(e) => onCambioSubGasto(e.target.value)}
                disabled={!filtroGastoCat.principalId || subcategoriasOpciones.length === 0}
              >
                <option value="">
                  {subcategoriasOpciones.length === 0 && filtroGastoCat.principalId
                    ? 'Sin subcategorías (solo esta categoría)'
                    : 'Todas las subcategorías (total del rubro)'}
                </option>
                {subcategoriasOpciones.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </motion.div>
      )}

      {loading || (tipo === 'todos' && loadingSaldoAcum) ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-red-400 text-sm">{error}</p>
      ) : (
        <>
          {tipo === 'todos' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass p-4 grid grid-cols-2 gap-3 mb-6"
            >
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Ingresos (efectivo)</p>
                <p className="text-lg font-semibold text-emerald-400">{formatARS(resumen.ingresos)}</p>
                <p className="text-xs text-gray-500">{formatUSD(resumen.ingresos / tc)}</p>
                {resumen.reintegrosTc > 0 && (
                  <p className="text-[10px] text-rose-400/90 mt-1 leading-snug">
                    +{formatARS(resumen.reintegrosTc)} reintegro/promo TC (no suma acá; resta en resumen tarjeta)
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Gastos</p>
                <p className="text-lg font-semibold text-red-400">{formatARS(resumen.gastos)}</p>
                <p className="text-xs text-gray-500">{formatUSD(resumen.gastos / tc)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Suscripciones</p>
                <p className="text-lg font-semibold text-purple-400">{formatARS(resumen.suscripciones)}</p>
                <p className="text-xs text-gray-500">{formatUSD(resumen.suscripciones / tc)}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Resultado del mes</p>
                <p className={`text-lg font-semibold ${resumen.resultadoMes >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatARS(resumen.resultadoMes)}
                </p>
                <p className="text-xs text-gray-500">{formatUSD(resumen.resultadoMes / tc)}</p>
              </div>
              <div className="col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Saldo acumulado hasta fin de {MESES[mes - 1]}
                </p>
                <p className={`text-xl font-bold tabular-nums ${saldoAcumulado >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatARS(saldoAcumulado)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{formatUSD(saldoAcumulado / tc)}</p>
                <p className="text-[10px] text-gray-600 mt-2 leading-snug">
                  Suma de todo tu historial hasta el último día de este mes (sin consumos en tarjeta de crédito ni reintegros/promos TC). Si el mes anterior te sobró plata, acá sigue contando.
                </p>
              </div>
              <p className="col-span-2 text-[10px] text-gray-600 leading-snug -mt-1">
                Resultado del mes = ingresos del mes − gastos y suscripciones en efectivo, transferencia o débito (sin tarjeta de crédito).
              </p>
            </motion.div>
          )}

          {tipo === 'gasto' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 text-center"
            >
              <p
                className={`font-bold tabular-nums text-red-400 break-words px-1 ${montoDisplayClass(totalGastoMostrado, 'kpiStatProminent')}`}
              >
                {formatARS(totalGastoMostrado)}
              </p>
              <p className="mt-2 text-base sm:text-lg text-gray-400 tabular-nums">
                {formatUSD(totalGastoMostrado / tc)}
              </p>
            </motion.div>
          )}

          {filtradas.length === 0 ? (
            <div className="glass p-8 text-center text-gray-500 text-sm">No hay movimientos en este período.</div>
          ) : tipo === 'gasto' && gastosPorGrupoMedio && gastosPorGrupoMedio.length > 0 ? (
            <div className="space-y-8">
              {gastosPorGrupoMedio.map((grupo) => (
                <div key={grupo.key}>
                  <div className="mb-2.5">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{grupo.titulo}</h2>
                    <p className="text-[11px] text-gray-600 mt-0.5">{grupo.subtitulo}</p>
                  </div>
                  <ul className="space-y-2">
                    {grupo.items.map((t, i) => (
                      <EditableTransaccionListRow
                        key={t.id}
                        t={t}
                        categorias={ordenarCategoriasPorTema(categorias.filter((c) => c.tipo === t.tipo))}
                        delay={i * 0.02}
                        mostrarTipo={false}
                        onMutated={() => refetch()}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtradas.map((t, i) => (
                <EditableTransaccionListRow
                  key={t.id}
                  t={t}
                  categorias={ordenarCategoriasPorTema(categorias.filter((c) => c.tipo === t.tipo))}
                  delay={i * 0.02}
                  mostrarTipo={tipo === 'todos'}
                  onMutated={() => refetch()}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
