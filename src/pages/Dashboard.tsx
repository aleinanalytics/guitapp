import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pencil, X, TrendingUp, TrendingDown, CreditCard, RotateCcw, Store, Banknote } from 'lucide-react'
import KPICard from '../components/KPICard'
import PorcentajeDelIngresoKpi from '../components/PorcentajeDelIngresoKpi'
import VariacionIngresosMesAnteriorKpi from '../components/VariacionIngresosMesAnteriorKpi'
import MobileUserMenu from '../components/MobileUserMenu'
import DashboardTarjetaSection from '../components/DashboardTarjetaSection'
import DashboardFondoSection from '../components/DashboardFondoSection'
import { DashboardPieChart, DashboardBarChart, DashboardLineChart } from '../components/DashboardCharts'
import { useTransacciones } from '../hooks/useTransacciones'
import { useSaldoAcumuladoHastaMes } from '../hooks/useSaldoAcumuladoHastaMes'
import { useTipoCambio } from '../hooks/useTipoCambio'
import { useCuotas, getCuotaForMonth } from '../hooks/useCuotas'
import { useTarjetaConfig } from '../hooks/useTarjetaConfig'
import { useAnalisis } from '../hooks/useAnalisis'
import type { Categoria, Moneda, Transaccion } from '../lib/types'

/** Gastos que suman en KPIs del home (excluye “solo seguimiento” / `excluye_saldo`). */
function esGastoEnKpisDelMes(t: Pick<Transaccion, 'tipo' | 'excluye_saldo'>): boolean {
  return t.tipo === 'gasto' && t.excluye_saldo !== true
}
import { supabase } from '../lib/supabase'
import {
  convertirARS,
  esIngresoReintegroTarjetaCredito,
  formatARS,
  formatUSD,
  montoDisplayClass,
  sumarPorMoneda,
  transaccionEnMesVista,
} from '../lib/utils'
import {
  categoriasGastoElegibles,
  esIdValidoParaKpiGastoHome,
  idsFamiliaGastoPrincipal,
  principalesGastoOrdenadas,
  subcategoriasDe,
} from '../lib/categoriasJerarquia'
import { useAuth } from '../lib/AuthContext'
import { useBolsillos } from '../hooks/useBolsillos'

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const now = new Date()
const currentYear = now.getFullYear()

const LS_KPI_GASTO_CATEGORIA = 'guita_dashboard_kpi_gasto_categoria_id'

export default function Dashboard() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [anio, setAnio] = useState(currentYear)

  useEffect(() => {
    const m = searchParams.get('mes')
    const a = searchParams.get('anio')
    if (m) {
      const mn = Number(m)
      if (mn >= 1 && mn <= 12) setMes(mn)
    }
    if (a) {
      const yr = Number(a)
      if (yr >= 2000 && yr <= 2100) setAnio(yr)
    }
  }, [searchParams])
  const { transacciones, loading } = useTransacciones({ mes, anio })
  const { tipoCambio, dolarLive } = useTipoCambio()
  const { cuotas } = useCuotas()
  const { config: tcConfig, toggleModoCredito } = useTarjetaConfig()
  const { transacciones: txAnio } = useAnalisis({ anio })
  const modoCredito = !!tcConfig?.modo_credito
  const {
    disponible: disponibleReservas,
    saldoEquivARS,
    configs: bolsillosConfigs,
    loading: loadingBolsillos,
  } = useBolsillos({ modoCredito })

  const diaCierreTc =
    tcConfig?.fecha_cierre != null
      ? new Date(tcConfig.fecha_cierre + 'T12:00:00').getDate()
      : null
  const transaccionesDelMes = useMemo(
    () => transacciones.filter((t) => transaccionEnMesVista(t, mes, anio, diaCierreTc)),
    [transacciones, mes, anio, diaCierreTc],
  )

  const mesAnteriorKpi = mes === 1 ? 12 : mes - 1
  const anioAnteriorKpi = mes === 1 ? anio - 1 : anio
  const transaccionesMesAnteriorIngresos = useMemo(
    () =>
      transacciones.filter((t) =>
        transaccionEnMesVista(t, mesAnteriorKpi, anioAnteriorKpi, diaCierreTc),
      ),
    [transacciones, mes, anio, diaCierreTc, mesAnteriorKpi, anioAnteriorKpi],
  )

  const [categoriasGasto, setCategoriasGasto] = useState<Categoria[]>([])
  const [kpiCatId, setKpiCatId] = useState('')
  const [kpiCatSelectorAbierto, setKpiCatSelectorAbierto] = useState(false)

  useEffect(() => {
    supabase
      .from('categorias')
      .select('*')
      .eq('tipo', 'gasto')
      .then(({ data }) => {
        if (data) setCategoriasGasto(data as Categoria[])
      })
  }, [])

  useEffect(() => {
    if (categoriasGasto.length === 0) return
    const eleg = categoriasGastoElegibles(categoriasGasto)
    if (!eleg.length) return
    const stored = localStorage.getItem(LS_KPI_GASTO_CATEGORIA)
    if (stored && esIdValidoParaKpiGastoHome(stored, categoriasGasto)) {
      setKpiCatId(stored)
      return
    }
    const comp = eleg.find((c) => c.nombre === 'Compra Mensual')
    const legacySup = eleg.find((c) => c.nombre.toLowerCase() === 'supermercado')
    const id = comp?.id ?? legacySup?.id ?? eleg[0].id
    setKpiCatId(id)
    localStorage.setItem(LS_KPI_GASTO_CATEGORIA, id)
  }, [categoriasGasto])

  /** Prioriza cotización de la API (dolarapi); si no hay, fila en BD; último recurso 1000. */
  const tc = dolarLive ?? tipoCambio?.usd_ars ?? 1000
  const { saldoAcumulado, loading: loadingSaldoAcum } = useSaldoAcumuladoHastaMes({ mes, anio, tc, modoCredito })

  const ingresosMesAnterior = useMemo(
    () =>
      transaccionesMesAnteriorIngresos
        .filter((t) => t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t))
        .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0),
    [transaccionesMesAnteriorIngresos, tc],
  )

  const ingresos = transaccionesDelMes
    .filter((t) => t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t))
    .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)

  const gastos = transaccionesDelMes
    .filter(esGastoEnKpisDelMes)
    .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)

  /** Solo tipo gasto y sin tarjeta de crédito (alineado al saldo acumulado para gastos). */
  const gastosSinTc = transaccionesDelMes
    .filter((t) => esGastoEnKpisDelMes(t) && t.medio_pago !== 'tarjeta')
    .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)

  const suscripciones = transaccionesDelMes
    .filter((t) => t.tipo === 'suscripcion')
    .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)

  const suscripcionesNativoArsUsd = useMemo(() => {
    const subs = transaccionesDelMes.filter((t) => t.tipo === 'suscripcion')
    const ars = subs.filter((t) => t.moneda === 'ARS').reduce((s, t) => s + t.monto, 0)
    const usd = subs.filter((t) => t.moneda === 'USD').reduce((s, t) => s + t.monto, 0)
    return { ars, usd }
  }, [transaccionesDelMes])

  /** Gastos sin tarjeta de crédito, solo ARS (no mezcla consumos en USD). */
  const gastosSinTcArs = transaccionesDelMes.filter(
    (t) => esGastoEnKpisDelMes(t) && t.medio_pago !== 'tarjeta' && t.moneda === 'ARS',
  )
  const mayorGasto = gastosSinTcArs.length > 0
    ? gastosSinTcArs.reduce((max, t) => (t.monto > max.monto ? t : max))
    : null
  /** % que el movimiento “Mayor gasto” (sin TC, solo ARS) representa sobre ingresos del mes */
  const pctMayorGastoDelIngreso =
    mayorGasto && ingresos > 0 ? (mayorGasto.monto / ingresos) * 100 : null
  const menorGasto = gastosSinTcArs.length > 0
    ? gastosSinTcArs.reduce((min, t) => (t.monto < min.monto ? t : min))
    : null

  /** Gastos y suscripciones abonados con tarjeta de crédito (mismo criterio que el KPI / resumen TC). */
  const consumosTc = transaccionesDelMes.filter(
    (t) => (t.tipo === 'gasto' || t.tipo === 'suscripcion') && t.medio_pago === 'tarjeta',
  )
  const mayorGastoTc = consumosTc.length > 0
    ? consumosTc.reduce((max, t) =>
        convertirARS(t.monto, t.moneda, tc) > convertirARS(max.monto, max.moneda, tc) ? t : max,
      )
    : null
  const menorGastoTc = consumosTc.length > 0
    ? consumosTc.reduce((min, t) =>
        convertirARS(t.monto, t.moneda, tc) < convertirARS(min.monto, min.moneda, tc) ? t : min,
      )
    : null

  /** % de gastos (solo tipo gasto) respecto a ingresos del mes */
  const pctGastoDelIngreso = ingresos > 0 ? (gastos / ingresos) * 100 : null

  /** % gastos sin TC sobre ingresos */
  const pctGastoSinTcDelIngreso = ingresos > 0 ? (gastosSinTc / ingresos) * 100 : null

  /** % suscripciones sobre ingresos (montos ya en equivalente ARS, USD convertido con tc) */
  const pctSuscripcionDelIngreso = ingresos > 0 ? (suscripciones / ingresos) * 100 : null

  const gastoCategoriaKpi = useMemo(() => {
    if (!kpiCatId) return 0
    const cat = categoriasGasto.find((c) => c.id === kpiCatId)
    let idsCategoria: Set<string>
    if (!cat || cat.tipo !== 'gasto') {
      idsCategoria = new Set([kpiCatId])
    } else {
      const tieneHijos = categoriasGasto.some((c) => c.parent_id === cat.id)
      if (cat.parent_id) {
        idsCategoria = new Set([kpiCatId])
      } else if (tieneHijos) {
        idsCategoria = new Set(idsFamiliaGastoPrincipal(cat.id, categoriasGasto))
      } else {
        idsCategoria = new Set([kpiCatId])
      }
    }
    return transaccionesDelMes
      .filter(
        (t) => esGastoEnKpisDelMes(t) && t.categoria_id && idsCategoria.has(t.categoria_id),
      )
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
  }, [transaccionesDelMes, kpiCatId, tc, categoriasGasto])

  const pctGastoCategoriaKpi = ingresos > 0 ? (gastoCategoriaKpi / ingresos) * 100 : null

  const categoriaKpiSeleccionada = categoriasGasto.find((c) => c.id === kpiCatId)

  // Tarjeta KPI: pagos únicos + cuotas del mes, ARS y USD por separado (sin convertir para el resumen)
  const tarjetaData = useMemo(() => {
    const txTarjeta = transaccionesDelMes.filter(
      (t) => (t.tipo === 'gasto' || t.tipo === 'suscripcion') && t.medio_pago === 'tarjeta',
    )
    const singles = sumarPorMoneda(txTarjeta.map((t) => ({ monto: t.monto, moneda: t.moneda })))

    let cuotasArs = 0
    let cuotasUsd = 0
    const cuotaDetails: {
      desc: string
      numero: number
      total: number
      monto: number
      moneda: Moneda
    }[] = []
    for (const c of cuotas) {
      const info = getCuotaForMonth(c, mes, anio)
      if (info) {
        if (c.moneda === 'USD') cuotasUsd += info.monto
        else cuotasArs += info.monto
        cuotaDetails.push({ desc: c.descripcion, moneda: c.moneda, ...info })
      }
    }

    const nextMes = mes === 12 ? 1 : mes + 1
    const nextAnio = mes === 12 ? anio + 1 : anio
    let nextArs = 0
    let nextUsd = 0
    const nextDetails: {
      desc: string
      numero: number
      total: number
      monto: number
      moneda: Moneda
    }[] = []
    for (const c of cuotas) {
      const info = getCuotaForMonth(c, nextMes, nextAnio)
      if (info) {
        if (c.moneda === 'USD') nextUsd += info.monto
        else nextArs += info.monto
        nextDetails.push({ desc: c.descripcion, moneda: c.moneda, ...info })
      }
    }

    const reintegrosTx = transaccionesDelMes.filter(esIngresoReintegroTarjetaCredito)
    const reintegrosPorMoneda = sumarPorMoneda(reintegrosTx.map((t) => ({ monto: t.monto, moneda: t.moneda })))
    const consumoArs = singles.ars + cuotasArs
    const consumoUsd = singles.usd + cuotasUsd
    const totalArs = consumoArs - reintegrosPorMoneda.ars
    const totalUsd = consumoUsd - reintegrosPorMoneda.usd

    return {
      totalArs,
      totalUsd,
      consumoArs,
      consumoUsd,
      reintegroArs: reintegrosPorMoneda.ars,
      reintegroUsd: reintegrosPorMoneda.usd,
      cuotaDetails,
      nextMonthArs: nextArs,
      nextMonthUsd: nextUsd,
      nextDetails,
    }
  }, [transaccionesDelMes, cuotas, mes, anio])

  // Chart data — desktop only
  const pieData = useMemo(() => {
    const gastosEfectivo = transaccionesDelMes
      .filter((t) => esGastoEnKpisDelMes(t) && t.medio_pago !== 'tarjeta')
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const out: { name: string; value: number; color: string; tarjetaUsdMonto?: number }[] = [
      { name: 'Ingresos', value: ingresos, color: '#10b981' },
      { name: 'Gastos', value: gastosEfectivo, color: '#ef4444' },
    ]
    const pieTarjetaArs = Math.max(0, tarjetaData.totalArs)
    const pieTarjetaUsdEq = Math.max(0, tarjetaData.totalUsd) * tc
    if (pieTarjetaArs > 0) out.push({ name: 'Tarjeta ARS', value: pieTarjetaArs, color: '#f43f5e' })
    if (pieTarjetaUsdEq > 0) {
      out.push({
        name: 'Tarjeta USD',
        value: pieTarjetaUsdEq,
        color: '#fda4af',
        tarjetaUsdMonto: Math.max(0, tarjetaData.totalUsd),
      })
    }
    out.push({ name: 'Suscripciones', value: suscripciones, color: '#a855f7' })
    return out.filter((d) => d.value > 0)
  }, [transaccionesDelMes, ingresos, suscripciones, tarjetaData.totalArs, tarjetaData.totalUsd, tc])

  const barData = useMemo(() => {
    const byCategory: Record<string, { nombre: string; color: string; total: number }> = {}
    for (const t of transaccionesDelMes) {
      if (!esGastoEnKpisDelMes(t)) continue
      const key = t.categoria_id ?? '__sin__'
      const nombre = t.categoria?.nombre ?? 'Sin categoría'
      const color = t.categoria?.color ?? '#94a3b8'
      if (!byCategory[key]) byCategory[key] = { nombre, color, total: 0 }
      byCategory[key].total += convertirARS(t.monto, t.moneda, tc)
    }
    // Include cuotas for this month as "Cuotas TC"
    for (const c of cuotas) {
      const info = getCuotaForMonth(c, mes, anio)
      if (!info) continue
      const key = c.categoria_id ?? '__cuotas__'
      const nombre = c.categoria?.nombre ?? 'Cuotas TC'
      const color = c.categoria?.color ?? '#f43f5e'
      if (!byCategory[key]) byCategory[key] = { nombre, color, total: 0 }
      byCategory[key].total += convertirARS(info.monto, c.moneda, tc)
    }
    return Object.values(byCategory)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)
      .map((d) => ({ nombre: d.nombre, total: Math.round(d.total), color: d.color }))
  }, [transaccionesDelMes, cuotas, mes, anio, tc])

  const lineData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const txMes = txAnio.filter((t) => {
        const d = new Date(t.fecha + 'T00:00:00')
        return d.getMonth() + 1 === m
      })
      const ing = txMes
        .filter((t) => t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t))
        .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
      const gas = txMes
        .filter(esGastoEnKpisDelMes)
        .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
      // add cuotas for this month
      let cuotasMes = 0
      for (const c of cuotas) {
        const info = getCuotaForMonth(c, m, anio)
        if (info) cuotasMes += convertirARS(info.monto, c.moneda, tc)
      }
      return {
        mes: MESES_CORTOS[i],
        Ingresos: Math.round(ing),
        Gastos: Math.round(gas + cuotasMes),
        activo: m <= (anio === now.getFullYear() ? now.getMonth() + 1 : 12),
      }
    }).filter((d) => d.activo)
  }, [txAnio, cuotas, anio, tc])

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? ''

  const saldoFondoEmergencia = saldoEquivARS('emergencia')
  const metaFondoEmergencia = bolsillosConfigs.emergencia?.objetivo_monto
  const kpiReserva = useMemo(() => {
    const act = saldoFondoEmergencia
    const meta = metaFondoEmergencia
    const tieneMeta = meta != null && meta > 0
    if (!tieneMeta) {
      return {
        tieneMeta: false as const,
        actual: act,
        falta: null as number | null,
        meta: null as number | null,
        pct: null as number | null,
        metaAlcanzada: false,
      }
    }
    const falta = Math.max(0, meta - act)
    const metaAlcanzada = act >= meta
    const pct = Math.min(100, (act / meta) * 100)
    return { tieneMeta: true as const, actual: act, falta, meta, pct, metaAlcanzada }
  }, [saldoFondoEmergencia, metaFondoEmergencia])

  const qMesAnio = `mes=${mes}&anio=${anio}`
  const toIngresos = `/movimientos?tipo=ingreso&${qMesAnio}`
  const toGastos = `/movimientos?tipo=gasto&${qMesAnio}`
  const toGastosSinTc = `/movimientos?tipo=gasto&sin_tc=1&${qMesAnio}`
  const toSuscripciones = `/movimientos?tipo=suscripcion&${qMesAnio}`
  const toResumenMesCompleto = `/movimientos?tipo=todos&${qMesAnio}`
  const toTarjetaCredito = `/tarjeta-credito?${qMesAnio}`
  const toGastoCategoriaKpi = useMemo(() => {
    if (!kpiCatId) return `/movimientos?tipo=gasto&${qMesAnio}`
    const cat = categoriasGasto.find((c) => c.id === kpiCatId)
    const tieneHijos = cat ? categoriasGasto.some((c) => c.parent_id === cat!.id) : false
    if (cat && !cat.parent_id && tieneHijos) {
      return `/movimientos?tipo=gasto&padre=${encodeURIComponent(kpiCatId)}&${qMesAnio}`
    }
    if (cat?.parent_id) {
      return `/movimientos?tipo=gasto&padre=${encodeURIComponent(cat.parent_id)}&hijo=${encodeURIComponent(kpiCatId)}&${qMesAnio}`
    }
    return `/movimientos?tipo=gasto&categoria_id=${encodeURIComponent(kpiCatId)}&${qMesAnio}`
  }, [kpiCatId, categoriasGasto, qMesAnio])

  return (
    <div className="px-4 pt-4 pb-28 lg:px-8 lg:pt-8 lg:pb-12 max-w-5xl mx-auto space-y-6">

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pr-2">
            <p className="text-primary text-xs font-bold tracking-[0.25em] uppercase mb-1">
              Control de Gastos Personales
            </p>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-50 tracking-tighter">
              {firstName ? `Hola, ${firstName}.` : 'Hola.'}
            </h1>
          </div>
          <div className="shrink-0 pt-0.5 lg:hidden">
            <MobileUserMenu />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(dolarLive != null || tipoCambio != null) && (
            <div className="glass flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full px-3 py-1.5">
              <span className="material-symbols-outlined shrink-0 text-emerald-400" style={{ fontSize: 14 }}>
                payments
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {dolarLive != null ? (
                  <>
                    Dólar oficial:{' '}
                    <span className="text-slate-50 tabular-nums">{formatARS(dolarLive)}</span>
                  </>
                ) : (
                  <>
                    Tipo de cambio:{' '}
                    <span className="text-slate-50 tabular-nums">{formatARS(tipoCambio!.usd_ars)}</span>
                  </>
                )}
              </span>
              {dolarLive != null && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
          )}

          <div className="flex gap-1 rounded-full border border-white/5 bg-surface-container-low p-1">
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="cursor-pointer border-none bg-transparent px-2 py-1 text-xs font-bold text-slate-300 focus:outline-none"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="cursor-pointer border-none bg-transparent px-2 py-1 text-xs font-bold text-slate-500 focus:outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {dolarLive == null && !tipoCambio && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center gap-2 glass rounded-xl p-3 text-sm text-yellow-300/80 border border-yellow-500/20 bg-yellow-500/[0.04]"
        >
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse-slow flex-shrink-0" />
          Tipo de cambio no configurado — usando $1.000 por defecto
        </motion.div>
      )}

      {loading || loadingSaldoAcum ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>

        <Link
          to={toResumenMesCompleto}
          className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
          aria-label="Ver resumen del mes: ingresos, gastos, tarjeta de crédito y suscripciones"
        >
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative cursor-pointer overflow-hidden rounded-xl p-7 md:p-10 flex flex-col items-center justify-center text-center transition-colors duration-300 hover:bg-white/[0.04]"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.25) 0%, rgba(99,102,241,0.08) 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <span className="text-primary-fixed-dim text-[10px] font-bold tracking-[0.3em] uppercase mb-4 relative z-10 opacity-80">
              Balance Acumulado
            </span>
            <p className={`relative z-10 font-black text-slate-50 tabular-nums tracking-tighter leading-none mb-3 ${montoDisplayClass(saldoAcumulado, 'saldoHero')} ${saldoAcumulado < 0 ? 'text-rose-400' : ''}`}>
              {formatARS(saldoAcumulado)}
            </p>
            <div className="relative z-10 glass px-5 py-1.5 rounded-full inline-flex items-center gap-2">
              <span className="text-slate-400 text-sm">Equivalente aprox.</span>
              <span className="text-emerald-400 font-black tabular-nums tracking-tight text-sm">{formatUSD(saldoAcumulado / tc)}</span>
            </div>
          </motion.section>
        </Link>

        <div className="flex min-w-0 flex-col gap-4">
          <div
            className={`grid min-w-0 grid-cols-2 gap-3 lg:gap-4 ${
              kpiCatId !== '' && categoriaKpiSeleccionada ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
            }`}
          >
            <KPICard
              titulo="Ingresos"
              montoARS={ingresos}
              montoUSD={ingresos / tc}
              icon={<TrendingUp size={18} />}
              delay={0.05}
              to={toIngresos}
              mobileStatLayout
            >
              <VariacionIngresosMesAnteriorKpi
                ingresosActual={ingresos}
                ingresosAnterior={ingresosMesAnterior}
                nombreMesAnterior={MESES[mesAnteriorKpi - 1]}
              />
            </KPICard>
            <KPICard
              titulo="Gastos"
              montoARS={gastos}
              montoUSD={gastos / tc}
              icon={<TrendingDown size={18} />}
              delay={0.08}
              to={toGastos}
              mobileStatLayout
            >
              <PorcentajeDelIngresoKpi
                pct={pctGastoDelIngreso}
                hayMontoSinIngreso={gastos > 0}
              />
            </KPICard>
            <div className="col-span-2 min-w-0 lg:col-span-1">
              <KPICard
                titulo="Gastos sin TC"
                montoARS={gastosSinTc}
                montoUSD={gastosSinTc / tc}
                icon={<Banknote size={18} />}
                delay={0.09}
                to={toGastosSinTc}
                mobileStatLayout
                montoProtagonista
              >
                <PorcentajeDelIngresoKpi
                  pct={pctGastoSinTcDelIngreso}
                  hayMontoSinIngreso={gastosSinTc > 0}
                />
              </KPICard>
            </div>
            {kpiCatId !== '' && categoriaKpiSeleccionada ? (
              <div className="col-span-2 grid min-w-0 grid-cols-2 gap-3 lg:contents">
                <div className="flex h-full min-h-0 w-full min-w-0">
                  <KPICard
                    titulo="Suscripciones"
                    montoARS={suscripciones}
                    montoUSD={suscripciones / tc}
                    icon={<RotateCcw size={18} />}
                    delay={0.1}
                    to={toSuscripciones}
                    mobileStatLayout
                  >
                    <div className="mt-1 w-full space-y-1 border-t border-white/[0.06] pt-2 text-center">
                      <p className="text-[11px] text-gray-500">
                        En ARS{' '}
                        <span className="font-medium tabular-nums text-purple-200/90">{formatARS(suscripcionesNativoArsUsd.ars)}</span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        En USD{' '}
                        <span className="font-medium tabular-nums text-purple-200/90">{formatUSD(suscripcionesNativoArsUsd.usd)}</span>
                      </p>
                    </div>
                    <PorcentajeDelIngresoKpi
                      pct={pctSuscripcionDelIngreso}
                      hayMontoSinIngreso={suscripciones > 0}
                    />
                  </KPICard>
                </div>
                <div className="flex h-full min-h-0 w-full min-w-0">
                  <KPICard
                    titulo={categoriaKpiSeleccionada.nombre}
                    montoARS={gastoCategoriaKpi}
                    montoUSD={gastoCategoriaKpi / tc}
                    icon={<Store size={18} />}
                    delay={0.11}
                    to={toGastoCategoriaKpi}
                    mobileStatLayout
                    topAccessory={
                      kpiCatSelectorAbierto ? (
                        <div className="flex min-w-0 items-center gap-1">
                          <label className="sr-only" htmlFor="kpi-gasto-categoria">
                            Categoría de gasto para este indicador
                          </label>
                          <select
                            id="kpi-gasto-categoria"
                            value={kpiCatId}
                            onChange={(e) => {
                              const v = e.target.value
                              setKpiCatId(v)
                              localStorage.setItem(LS_KPI_GASTO_CATEGORIA, v)
                              setKpiCatSelectorAbierto(false)
                            }}
                            className="select-dark min-w-0 flex-1 py-1 text-[11px]"
                            aria-label="Elegir categoría de gasto"
                          >
                            {categoriasGasto.some((c) => !!c.parent_id) ? (
                              <>
                                {principalesGastoOrdenadas(categoriasGasto).map((p) => (
                                  <optgroup key={p.id} label={p.nombre}>
                                    <option value={p.id}>Todo el rubro</option>
                                    {subcategoriasDe(p.id, categoriasGasto).map((s) => (
                                      <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                  </optgroup>
                                ))}
                                {categoriasGasto
                                  .filter(
                                    (c) =>
                                      !c.parent_id &&
                                      !categoriasGasto.some((s) => s.parent_id === c.id),
                                  )
                                  .map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                  ))}
                              </>
                            ) : (
                              categoriasGastoElegibles(categoriasGasto).map((c) => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                              ))
                            )}
                          </select>
                          <button
                            type="button"
                            className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                            aria-label="Cerrar selector de categoría"
                            onClick={() => setKpiCatSelectorAbierto(false)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-gray-300"
                            aria-label="Editar categoría del indicador"
                            onClick={() => setKpiCatSelectorAbierto(true)}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )
                    }
                  >
                    <PorcentajeDelIngresoKpi
                      pct={pctGastoCategoriaKpi}
                      hayMontoSinIngreso={gastoCategoriaKpi > 0}
                      nombreCategoria={categoriaKpiSeleccionada.nombre}
                    />
                  </KPICard>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-0 w-full min-w-0">
                <KPICard
                  titulo="Suscripciones"
                  montoARS={suscripciones}
                  montoUSD={suscripciones / tc}
                  icon={<RotateCcw size={18} />}
                  delay={0.1}
                  to={toSuscripciones}
                  mobileStatLayout
                >
                  <div className="mt-1 w-full space-y-1 border-t border-white/[0.06] pt-2 text-center">
                    <p className="text-[11px] text-gray-500">
                      En ARS{' '}
                      <span className="font-medium tabular-nums text-purple-200/90">{formatARS(suscripcionesNativoArsUsd.ars)}</span>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      En USD{' '}
                      <span className="font-medium tabular-nums text-purple-200/90">{formatUSD(suscripcionesNativoArsUsd.usd)}</span>
                    </p>
                  </div>
                  <PorcentajeDelIngresoKpi
                    pct={pctSuscripcionDelIngreso}
                    hayMontoSinIngreso={suscripciones > 0}
                  />
                </KPICard>
              </div>
            )}
          </div>

          <DashboardTarjetaSection
            tcConfig={tcConfig}
            toggleModoCredito={toggleModoCredito}
            tarjetaData={tarjetaData}
            toTarjetaCredito={toTarjetaCredito}
          />

          <DashboardFondoSection
            saldoFondoEmergencia={saldoFondoEmergencia}
            kpiReserva={kpiReserva}
          />

          <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <KPICard
              titulo="Mayor Gasto"
              delay={0.22}
              montoARS={mayorGasto?.monto ?? 0}
              montoUSD={(mayorGasto?.monto ?? 0) / tc}
              descripcion={mayorGasto?.descripcion}
              icon={<Banknote size={18} />}
              mobileStatLayout
            >
              <PorcentajeDelIngresoKpi
                pct={pctMayorGastoDelIngreso}
                hayMontoSinIngreso={!!mayorGasto && mayorGasto.monto > 0}
              />
            </KPICard>
            <KPICard
              titulo="Menor Gasto"
              delay={0.24}
              montoARS={menorGasto?.monto ?? 0}
              montoUSD={(menorGasto?.monto ?? 0) / tc}
              descripcion={menorGasto?.descripcion}
              icon={<Banknote size={18} />}
              mobileStatLayout
            />
            <KPICard
              titulo="Mayor gasto TC"
              delay={0.25}
              montoARS={mayorGastoTc ? convertirARS(mayorGastoTc.monto, mayorGastoTc.moneda, tc) : 0}
              montoUSD={mayorGastoTc ? convertirARS(mayorGastoTc.monto, mayorGastoTc.moneda, tc) / tc : 0}
              descripcion={mayorGastoTc?.descripcion}
              icon={<CreditCard size={18} />}
              mobileStatLayout
            />
            <KPICard
              titulo="Menor gasto TC"
              delay={0.26}
              montoARS={menorGastoTc ? convertirARS(menorGastoTc.monto, menorGastoTc.moneda, tc) : 0}
              montoUSD={menorGastoTc ? convertirARS(menorGastoTc.monto, menorGastoTc.moneda, tc) / tc : 0}
              descripcion={menorGastoTc?.descripcion}
              icon={<CreditCard size={18} />}
              mobileStatLayout
            />
          </div>

        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.32 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-50 tracking-tight">Available</h3>
            <span className="text-cyan-400 text-xl font-black tabular-nums tracking-tighter">
              {loadingBolsillos ? '—' : formatARS(disponibleReservas)}
            </span>
          </div>
          <div className="space-y-3">
            <Link
              to="/ahorros"
              className="glass-card flex items-center gap-4 p-4 rounded-xl hover:bg-white/[0.05] cursor-pointer transition-all active:scale-[0.98] focus:outline-none"
            >
              <div className="w-11 h-11 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-cyan-400" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>savings</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-0.5">Ahorros</p>
                <p className="text-lg font-black text-slate-50 tabular-nums tracking-tighter">{formatARS(saldoEquivARS('ahorro'))}</p>
              </div>
              <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 20 }}>chevron_right</span>
            </Link>

            <Link
              to="/fondo-emergencia"
              className="glass-card flex items-center gap-4 p-4 rounded-xl hover:bg-white/[0.05] cursor-pointer transition-all active:scale-[0.98] focus:outline-none"
            >
              <div className="w-11 h-11 rounded-full bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-sky-400" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>emergency</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-0.5">Fondo Emergencia</p>
                <p className="text-lg font-black text-slate-50 tabular-nums tracking-tighter">{formatARS(saldoFondoEmergencia)}</p>
              </div>
              <span className="material-symbols-outlined text-slate-600" style={{ fontSize: 20 }}>chevron_right</span>
            </Link>

            <Link
              to="/inversiones"
              className="glass-card flex items-center gap-4 p-4 rounded-xl opacity-50 hover:opacity-90 cursor-pointer transition-all active:scale-[0.98] focus:outline-none"
            >
              <div className="w-11 h-11 rounded-full bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-violet-400" style={{ fontSize: 22 }}>add_circle</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Inversiones</p>
                <p className="text-xs font-medium text-amber-400/80">En desarrollo</p>
              </div>
              <span className="material-symbols-outlined text-slate-700" style={{ fontSize: 20 }}>chevron_right</span>
            </Link>
          </div>
        </motion.div>
        </>
      )}

      {!loading && (
        <div className="hidden lg:grid lg:grid-cols-2 gap-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="glass p-5"
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Distribución del mes</p>
            <DashboardPieChart data={pieData} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="glass p-5"
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Gastos por categoría</p>
            <DashboardBarChart data={barData} />
          </motion.div>
        </div>
      )}

      <DashboardLineChart data={lineData} anio={anio} />
    </div>
  )
}
