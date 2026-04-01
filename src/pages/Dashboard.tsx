import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pencil, Check, X, TrendingUp, TrendingDown, CreditCard, RotateCcw, DollarSign, Zap, Plus, PiggyBank, Shield, Store, Banknote } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import KPICard from '../components/KPICard'
import PorcentajeDelIngresoKpi from '../components/PorcentajeDelIngresoKpi'
import VariacionIngresosMesAnteriorKpi from '../components/VariacionIngresosMesAnteriorKpi'
import MobileUserMenu from '../components/MobileUserMenu'
import { useTransacciones } from '../hooks/useTransacciones'
import { useSaldoAcumuladoHastaMes } from '../hooks/useSaldoAcumuladoHastaMes'
import { useTipoCambio } from '../hooks/useTipoCambio'
import { useCuotas, getCuotaForMonth } from '../hooks/useCuotas'
import { useTarjetaConfig, countdownTarjeta, formatFechaTarjeta } from '../hooks/useTarjetaConfig'
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
  const { tipoCambio, dolarLive, upsertTipoCambio } = useTipoCambio()
  const { cuotas } = useCuotas()
  const { config: tcConfig } = useTarjetaConfig()
  const { transacciones: txAnio } = useAnalisis({ anio })
  const {
    disponible: disponibleReservas,
    saldo: saldoBolsillo,
    configs: bolsillosConfigs,
    loading: loadingBolsillos,
  } = useBolsillos()

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

  const [editingTC, setEditingTC] = useState(false)
  const [tcInput, setTcInput] = useState('')
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
    if (stored && eleg.some((c) => c.id === stored)) {
      setKpiCatId(stored)
      return
    }
    const comp = eleg.find((c) => c.nombre === 'Compra Mensual')
    const legacySup = eleg.find((c) => c.nombre.toLowerCase() === 'supermercado')
    const id = comp?.id ?? legacySup?.id ?? eleg[0].id
    setKpiCatId(id)
    localStorage.setItem(LS_KPI_GASTO_CATEGORIA, id)
  }, [categoriasGasto])

  const tc = tipoCambio?.usd_ars ?? 1000
  const { saldoAcumulado, loading: loadingSaldoAcum } = useSaldoAcumuladoHastaMes({ mes, anio, tc })

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
      nextMesName: MESES[nextMes - 1],
    }
  }, [transaccionesDelMes, cuotas, mes, anio])

  // Chart data — desktop only
  type PieSlice = {
    name: string
    value: number
    color: string
    /** Si existe, el tooltip/leyenda muestran USD real; value sigue en ARS equivalente solo para el área del gráfico */
    tarjetaUsdMonto?: number
  }

  const pieData = useMemo((): PieSlice[] => {
    const gastosEfectivo = transaccionesDelMes
      .filter((t) => esGastoEnKpisDelMes(t) && t.medio_pago !== 'tarjeta')
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    const out: PieSlice[] = [
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

  const handleTcSave = async () => {
    const val = parseFloat(tcInput)
    if (isNaN(val) || val <= 0) return
    await upsertTipoCambio(val)
    setEditingTC(false)
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? ''

  const saldoFondoEmergencia = saldoBolsillo('emergencia')
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
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500">{firstName ? `Hola, ${firstName}` : 'Hola'}</p>
          <h1 className="text-xl leading-snug sm:text-2xl lg:text-3xl lg:leading-tight font-bold text-gray-50">
            Control de Gastos Personales
          </h1>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {dolarLive && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg">
              <Zap size={12} />
              Dólar Oficial: {formatARS(dolarLive)}
            </div>
          )}
          <div className="lg:hidden">
            <MobileUserMenu />
          </div>
        </div>
      </motion.div>

      {/* Warning */}
      {!tipoCambio && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass border-yellow-500/20 bg-yellow-500/[0.05] text-yellow-300/80 text-sm rounded-xl p-3 mb-4 flex items-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse-slow" />
          Tipo de cambio no configurado — usando $1.000 por defecto
        </motion.div>
      )}

      {/* Selectors */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-6"
      >
        <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="select-dark flex-1 lg:flex-none lg:w-40">
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} className="select-dark w-28">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </motion.div>

      {loading || loadingSaldoAcum ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        </div>
      ) : (
        <>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 min-w-0 text-center lg:mb-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 mb-3">Saldo acumulado</p>
          <p
            className={`font-bold tabular-nums leading-[1.05] break-words px-1 max-w-[100vw] ${saldoAcumulado >= 0 ? 'text-white' : 'text-rose-400'} ${montoDisplayClass(saldoAcumulado, 'saldoHero')}`}
          >
            {formatARS(saldoAcumulado)}
          </p>
          <p
            className={`mt-2 text-gray-400 break-words px-2 ${montoDisplayClass(saldoAcumulado / tc, 'saldoHeroUsd')}`}
          >
            {formatUSD(saldoAcumulado / tc)}
          </p>
        </motion.div>

        {/* Móvil: misma grilla 2+2 que antes. Escritorio: fila de KPI con columnas amplias (evita tarjetas de ~1/6 de pantalla). */}
        <div className="flex min-w-0 flex-col gap-3 lg:gap-4">
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
              accentColor="#10b981"
              glowClass="glow-green"
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
              accentColor="#ef4444"
              glowClass="glow-red"
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
                accentColor="#f97316"
                glowClass="glow-orange"
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
                    accentColor="#a855f7"
                    glowClass="glow-purple"
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
                    accentColor={categoriaKpiSeleccionada.color}
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
                  accentColor="#a855f7"
                  glowClass="glow-purple"
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

          <Link
            to={toTarjetaCredito}
            className="block h-full w-full min-w-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
            aria-label="Ver detalle de tarjeta de crédito"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="glass h-full p-4 relative overflow-hidden cursor-pointer hover:border-white/[0.18] hover:bg-white/[0.02] transition-all duration-300"
              style={{ boxShadow: '0 0 20px rgba(244, 63, 94, 0.12), 0 0 60px rgba(244, 63, 94, 0.04)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
                style={{ background: 'linear-gradient(90deg, transparent, #f43f5e, transparent)' }}
              />
              <div className="flex items-center justify-center gap-2 mb-3">
                <CreditCard size={20} className="text-gray-500 shrink-0" />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center">
                  Tarjeta de Crédito
                </p>
              </div>

              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 sm:gap-4">
                <div className="text-center min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">ARS</p>
                  <p
                    className={`font-bold text-gray-50 tabular-nums leading-tight mt-0.5 break-words ${montoDisplayClass(tarjetaData.totalArs, 'pairArsTarjeta')}`}
                  >
                    {formatARS(tarjetaData.totalArs)}
                  </p>
                </div>
                <div className="text-center min-w-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">USD</p>
                  <p
                    className={`font-bold text-gray-50 tabular-nums leading-tight mt-0.5 break-words ${montoDisplayClass(tarjetaData.totalUsd, 'pairUsdTarjeta')}`}
                  >
                    {formatUSD(tarjetaData.totalUsd)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-gray-600 mt-2 text-center">Neto del mes por moneda (consumo − reintegros/promos TC), sin convertir.</p>
              {(tarjetaData.reintegroArs > 0 || tarjetaData.reintegroUsd > 0) && (
                <p className="text-[10px] text-emerald-400/85 mt-1.5 text-center leading-snug">
                  Reintegros/promos: −{formatARS(tarjetaData.reintegroArs)}
                  {tarjetaData.reintegroUsd > 0 && (
                    <>
                      {' · '}−{formatUSD(tarjetaData.reintegroUsd)}
                    </>
                  )}
                </p>
              )}

              {tcConfig ? (
                <div className="mt-3 pt-3 border-t border-white/[0.06] grid gap-x-5 gap-y-2.5 text-[11px] sm:text-xs text-center [grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))]">
                  <div className="min-w-0">
                    <p className="text-gray-500 uppercase tracking-wide">Fecha de cierre</p>
                    <p className="mt-0.5 text-gray-200 leading-snug">
                      {formatFechaTarjeta(tcConfig.fecha_cierre)}
                      <span className="text-rose-400/90"> · {countdownTarjeta(tcConfig.fecha_cierre)}</span>
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-500 uppercase tracking-wide">Vencimiento</p>
                    <p className="mt-0.5 text-gray-200 leading-snug">
                      {formatFechaTarjeta(tcConfig.fecha_vencimiento)}
                      <span className="text-amber-400/90"> · {countdownTarjeta(tcConfig.fecha_vencimiento)}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-[11px] text-gray-500">
                  Configurá cierre y vencimiento en el detalle de tarjeta.
                </p>
              )}

              {tarjetaData.cuotaDetails.length > 0 && (
                <div className="mt-3 space-y-1">
                  {tarjetaData.cuotaDetails.map((d, i) => (
                    <p key={i} className="text-xs text-gray-400">
                      <span className="text-gray-300">{d.desc}</span> — cuota {d.numero}/{d.total} ·{' '}
                      {d.moneda === 'USD' ? formatUSD(d.monto) : formatARS(d.monto)}
                    </p>
                  ))}
                </div>
              )}

              {(tarjetaData.nextMonthArs > 0 || tarjetaData.nextMonthUsd > 0) && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <p className="text-xs text-amber-400/80 text-center">
                    El próximo resumen ({tarjetaData.nextMesName}): cuotas{' '}
                    {tarjetaData.nextMonthArs > 0 && <span>{formatARS(tarjetaData.nextMonthArs)}</span>}
                    {tarjetaData.nextMonthArs > 0 && tarjetaData.nextMonthUsd > 0 && (
                      <span className="text-gray-500"> · </span>
                    )}
                    {tarjetaData.nextMonthUsd > 0 && <span>{formatUSD(tarjetaData.nextMonthUsd)}</span>}
                  </p>
                  {tarjetaData.nextDetails.map((d, i) => (
                    <p key={i} className="text-[11px] text-gray-500 mt-0.5 text-center">
                      {d.desc} — cuota {d.numero}/{d.total} ·{' '}
                      {d.moneda === 'USD' ? formatUSD(d.monto) : formatARS(d.monto)}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          </Link>

          {!loadingBolsillos && saldoFondoEmergencia > 0 && (
            <div className="min-w-0 w-full">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.22 }}
              >
                <Link
                  to="/fondo-emergencia"
                  className="block glass relative overflow-hidden rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-500/[0.07] to-transparent p-5 sm:p-6 lg:p-7 transition-all duration-300 hover:border-sky-400/35 hover:from-sky-500/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
                >
                  <div
                    className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] opacity-70"
                    style={{ background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)' }}
                  />
                  <div className="relative flex flex-col items-center text-center gap-6">
                    <div className="w-full max-w-xl mx-auto px-1">
                      <div className="flex items-center justify-center gap-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                          <Shield size={22} strokeWidth={2} />
                        </span>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/80">
                          Fondo de reserva
                        </p>
                      </div>
                      {kpiReserva.tieneMeta ? (
                        kpiReserva.metaAlcanzada ? (
                          <>
                            <p
                              className={`mt-4 font-bold tabular-nums leading-[1.08] break-words ${montoDisplayClass(kpiReserva.actual, 'kpiStatProminent')} text-emerald-400`}
                            >
                              {formatARS(kpiReserva.actual)}
                            </p>
                            <p className="mt-2 text-sm text-gray-400">Meta alcanzada · en tu fondo</p>
                            {kpiReserva.meta != null && kpiReserva.actual > kpiReserva.meta && (
                              <p className="mt-1 text-xs text-emerald-400/85">
                                {formatARS(kpiReserva.actual - kpiReserva.meta)} por encima de la meta
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p
                              className={`mt-4 font-bold tabular-nums leading-[1.08] break-words ${montoDisplayClass(kpiReserva.actual, 'kpiStatProminent')} text-sky-100`}
                            >
                              {formatARS(kpiReserva.actual)}
                            </p>
                            <p className="mt-2 text-sm text-gray-400">En tu fondo ahora</p>
                            <p className="mt-3 text-sm text-sky-200/85 tabular-nums leading-snug">
                              Te falta{' '}
                              <span className="font-semibold text-sky-100">{formatARS(kpiReserva.falta ?? 0)}</span> para la
                              meta de <span className="font-semibold text-sky-100">{formatARS(kpiReserva.meta ?? 0)}</span>
                            </p>
                          </>
                        )
                      ) : (
                        <>
                          <p
                            className={`mt-4 font-bold tabular-nums leading-[1.08] break-words ${montoDisplayClass(kpiReserva.actual, 'kpiStatProminent')} text-gray-50`}
                          >
                            {formatARS(kpiReserva.actual)}
                          </p>
                          <p className="mt-2 text-sm text-gray-400">
                            Definí una meta en pesos en el detalle para ver cuánto te falta.
                          </p>
                        </>
                      )}
                    </div>
                    {kpiReserva.tieneMeta && kpiReserva.pct != null && (
                      <div className="w-full max-w-md mx-auto px-1">
                        <div className="mb-1.5 flex items-center justify-center gap-3 text-[10px] uppercase tracking-wide text-gray-500">
                          <span>Progreso</span>
                          <span className="tabular-nums text-sky-300/90">
                            {kpiReserva.metaAlcanzada && kpiReserva.pct > 100
                              ? '100%+'
                              : `${Math.round(kpiReserva.pct)}%`}
                          </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
                          <div
                            className={`h-full rounded-full transition-[width] duration-500 ${
                              kpiReserva.metaAlcanzada
                                ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                                : 'bg-gradient-to-r from-sky-600 to-cyan-400'
                            }`}
                            style={{ width: `${Math.min(100, kpiReserva.pct)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="relative mt-2 text-center text-[11px] text-sky-400/70">
                    Tocá para asignar fondos o editar la meta →
                  </p>
                </Link>
              </motion.div>
            </div>
          )}

          <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <KPICard
              titulo="Mayor Gasto"
              delay={0.22}
              montoARS={mayorGasto?.monto ?? 0}
              montoUSD={(mayorGasto?.monto ?? 0) / tc}
              descripcion={mayorGasto?.descripcion}
              icon={<Banknote size={18} />}
              accentColor="#f59e0b"
              mobileStatLayout
            />
            <KPICard
              titulo="Menor Gasto"
              delay={0.24}
              montoARS={menorGasto?.monto ?? 0}
              montoUSD={(menorGasto?.monto ?? 0) / tc}
              descripcion={menorGasto?.descripcion}
              icon={<Banknote size={18} />}
              accentColor="#78716c"
              mobileStatLayout
            />
            <KPICard
              titulo="Mayor gasto TC"
              delay={0.25}
              montoARS={mayorGastoTc ? convertirARS(mayorGastoTc.monto, mayorGastoTc.moneda, tc) : 0}
              montoUSD={mayorGastoTc ? convertirARS(mayorGastoTc.monto, mayorGastoTc.moneda, tc) / tc : 0}
              descripcion={mayorGastoTc?.descripcion}
              icon={<CreditCard size={18} />}
              accentColor="#f43f5e"
              mobileStatLayout
            />
            <KPICard
              titulo="Menor gasto TC"
              delay={0.26}
              montoARS={menorGastoTc ? convertirARS(menorGastoTc.monto, menorGastoTc.moneda, tc) : 0}
              montoUSD={menorGastoTc ? convertirARS(menorGastoTc.monto, menorGastoTc.moneda, tc) / tc : 0}
              descripcion={menorGastoTc?.descripcion}
              icon={<CreditCard size={18} />}
              accentColor="#fb7185"
              mobileStatLayout
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="glass relative w-full max-w-full overflow-hidden p-4 transition-all duration-300 glow-cyan hover:border-white/[0.12] lg:max-w-md lg:self-start"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] opacity-60"
              style={{ background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)' }}
            />
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tipo de Cambio</p>
              <DollarSign size={18} className="text-gray-500" />
            </div>
            {editingTC ? (
              <div className="flex items-center gap-2 mt-1">
                <input type="number" value={tcInput} onChange={(e) => setTcInput(e.target.value)}
                  className="input-dark w-24 !py-1.5 !text-base" min="0.01" step="0.01" autoFocus />
                <button onClick={handleTcSave} className="text-emerald-400 hover:text-emerald-300 transition-colors"><Check size={18} /></button>
                <button onClick={() => setEditingTC(false)} className="text-red-400 hover:text-red-300 transition-colors"><X size={18} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-gray-50">{formatARS(tc)}</p>
                <button onClick={() => { setTcInput(String(tc)); setEditingTC(true) }}
                  className="text-gray-600 hover:text-gray-400 transition-colors">
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">{formatUSD(1)} = {formatARS(tc)}</p>
            {dolarLive && (
              <p className="text-[11px] text-cyan-500/60 mt-1 flex items-center gap-1">
                <Zap size={10} /> Oficial hoy: {formatARS(dolarLive)}
              </p>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.32 }}
          className="mt-5 lg:mt-6"
        >
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Reservas</p>
          <p className="text-[11px] text-gray-500 mb-3 leading-snug">
            Asigná plata al margen de tus gastos (cifra acumulada de todo tu historial, no solo el mes del selector).{' '}
            {!loadingBolsillos ? (
              <>
                Disponible:{' '}
                <span className={disponibleReservas >= 0 ? 'text-cyan-400/90' : 'text-rose-400/90'}>
                  {formatARS(disponibleReservas)}
                </span>
                {saldoBolsillo('ahorro') + saldoBolsillo('emergencia') > 0 && (
                  <span className="text-gray-600">
                    {' '}
                    · En bolsillos: {formatARS(saldoBolsillo('ahorro') + saldoBolsillo('emergencia'))}
                  </span>
                )}
              </>
            ) : (
              <span className="text-gray-600">Calculando disponible…</span>
            )}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Link
              to="/ahorros"
              className="glass flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 sm:p-4 border border-white/[0.06] hover:border-emerald-500/25 hover:bg-emerald-500/[0.04] transition-all min-h-[5.5rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <Plus size={20} strokeWidth={2.5} />
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-gray-200 text-center leading-tight">Ahorros</span>
              <span className="text-[9px] text-gray-600 text-center flex items-center gap-0.5">
                <PiggyBank size={10} /> Objetivos
              </span>
            </Link>
            <Link
              to="/fondo-emergencia"
              className="glass flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 sm:p-4 border border-white/[0.06] hover:border-sky-500/25 hover:bg-sky-500/[0.04] transition-all min-h-[5.5rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-sky-400">
                <Plus size={20} strokeWidth={2.5} />
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-gray-200 text-center leading-tight">
                Fondo emergencia
              </span>
              <span className="text-[9px] text-gray-600 text-center flex items-center gap-0.5">
                <Shield size={10} /> Meta sugerida
              </span>
            </Link>
            <Link
              to="/inversiones"
              className="glass flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 sm:p-4 border border-white/[0.06] hover:border-violet-500/20 transition-all min-h-[5.5rem] opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/35"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 text-violet-400/80">
                <Plus size={20} strokeWidth={2.5} />
              </span>
              <span className="text-[11px] sm:text-xs font-medium text-gray-300 text-center leading-tight">
                Inversiones
              </span>
              <span className="text-[9px] text-amber-400/80 text-center font-medium">En desarrollo</span>
            </Link>
          </div>
        </motion.div>
        </>
      )}

      {/* Desktop-only charts */}
      {!loading && (
        <div className="hidden lg:grid lg:grid-cols-2 gap-4 mt-6">
          {/* Pie: distribución del mes */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="glass p-5"
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Distribución del mes</p>
            {pieData.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-10">Sin datos</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={2}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, item) => {
                        const p = item?.payload as PieSlice
                        if (p?.tarjetaUsdMonto != null) {
                          return [
                            `${formatUSD(p.tarjetaUsdMonto)} (≈ ${formatARS(Number(value ?? 0))} al TC)`,
                            name,
                          ]
                        }
                        return [formatARS(Number(value ?? 0)), name]
                      }}
                      contentStyle={{ background: '#151524', border: '1px solid #2d2d44', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#e2e8f0' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="flex-1 space-y-2">
                  {pieData.map((d, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-400 truncate">{d.name}</span>
                      </span>
                      <span className="text-gray-200 font-medium shrink-0 text-right">
                        {d.tarjetaUsdMonto != null ? formatUSD(d.tarjetaUsdMonto) : formatARS(d.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>

          {/* Bar: top categorías de gastos */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="glass p-5"
          >
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">Gastos por categoría</p>
            {barData.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-10">Sin gastos registrados</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={90}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => formatARS(Number(value ?? 0))}
                    contentStyle={{ background: '#151524', border: '1px solid #2d2d44', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#e2e8f0' }}
                    labelStyle={{ color: '#94a3b8' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={18}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>
      )}

      {/* Evolución anual — desktop only */}
      {!loading && lineData.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="hidden lg:block glass p-5 mt-4"
        >
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
            Evolución de los gastos — {anio}
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData} margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e32" vertical={false} />
              <XAxis dataKey="mes" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip
                formatter={(value, name) => [formatARS(Number(value ?? 0)), String(name ?? '')]}
                contentStyle={{ background: '#151524', border: '1px solid #2d2d44', borderRadius: 8, fontSize: 12 }}
                itemStyle={{ color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="Ingresos"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="Gastos"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  )
}
