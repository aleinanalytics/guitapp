import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import KPICard from '../components/KPICard'
import AnalisisCharts from '../components/AnalisisCharts'
import AnalisisCashflow from '../components/AnalisisCashflow'
import { useAnalisis } from '../hooks/useAnalisis'
import { supabase } from '../lib/supabase'
import { convertirARS, cuentaComoSalidaDeEfectivo, esIngresoReintegroTarjetaCredito, formatARS } from '../lib/utils'
import type { Moneda, TipoTransaccion, Transaccion } from '../lib/types'
import { ultimoDiaDelMes } from '../hooks/useSaldoAcumuladoHastaMes'
import {
  getIpcMensual,
  writeIpcOverride,
  ipcMonthKey,
  IPC_MENSUAL_VARIACION_PCT,
} from '../lib/ipcArgentinaMensual'
import { TrendingUp, TrendingDown, RotateCcw, CalendarDays } from 'lucide-react'
import MobileUserMenu from '../components/MobileUserMenu'
import { useCuotas } from '../hooks/useCuotas'
import { useDeudas } from '../hooks/useDeudas'
import { proyectarCashflow, resumenAlertasCashflow } from '../lib/cashflow'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_FULL = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const now = new Date()
const currentYear = now.getFullYear()

type MomCatRow = { catId: string; nombre: string; tipo: TipoTransaccion; anterior: number; actual: number }

type TxSaldoMin = {
  fecha: string
  monto: number
  moneda: string
  tipo: string
  medio_pago: string
  excluye_saldo?: boolean | null
  es_gasto_fijo?: boolean | null
}

function aggregateMomRows(rows: MomCatRow[]) {
  const anterior = rows.reduce((s, r) => s + r.anterior, 0)
  const actual = rows.reduce((s, r) => s + r.actual, 0)
  const delta = actual - anterior
  const pct = anterior > 0 ? ((actual - anterior) / anterior) * 100 : null
  return { anterior, actual, delta, pct }
}

/** Variación % mes a mes; null si no se puede calcular (división por cero). */
function pctMoM(anterior: number, actual: number): number | null {
  if (anterior <= 0) return null
  return ((actual - anterior) / anterior) * 100
}

export default function Analisis() {
  const [anioSeleccionado, setAnioSeleccionado] = useState(currentYear)
  const [mesSeleccionado, setMesSeleccionado] = useState(now.getMonth() + 1)
  const [tipoCambio, setTipoCambio] = useState(1000)

  const { transacciones, loading } = useAnalisis({ anio: anioSeleccionado })

  /** Historial completo (mínimo) para saldo acumulado por mes, alineado con Inicio. */
  const [txSaldoHist, setTxSaldoHist] = useState<TxSaldoMin[]>([])
  const [loadingSaldoHist, setLoadingSaldoHist] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingSaldoHist(true)
    void supabase
      .from('transacciones')
      .select('fecha,monto,moneda,tipo,medio_pago,excluye_saldo,es_gasto_fijo')
      .order('fecha', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setTxSaldoHist([])
        } else {
          setTxSaldoHist((data as TxSaldoMin[]) ?? [])
        }
        setLoadingSaldoHist(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    supabase
      .from('tipo_cambio')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setTipoCambio((data as { usd_ars: number }).usd_ars)
      })
  }, [])

  const tc = tipoCambio

  const { cuotas } = useCuotas()
  const { deudas } = useDeudas()

  // Section 1: Monthly data
  const barData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      mes: MESES[i],
      Ingresos: 0,
      Gastos: 0,
      Suscripciones: 0,
      SalidaEfectivo: 0,
    }))
    for (const t of transacciones) {
      const m = new Date(t.fecha + 'T00:00:00').getMonth()
      const ars = convertirARS(t.monto, t.moneda, tc)
      if (t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t)) months[m].Ingresos += ars
      else if (t.tipo === 'gasto') months[m].Gastos += ars
      else months[m].Suscripciones += ars
      if (cuentaComoSalidaDeEfectivo(t)) months[m].SalidaEfectivo += ars
    }
    return months
  }, [transacciones, tc])

  /** Balance solo del mes + saldo acumulado hasta fin de cada mes (todo el historial; sin TC). */
  const balanceDualData = useMemo(() => {
    let ti = 0
    let running = 0
    const sorted = txSaldoHist
    return barData.map((row, idx) => {
      const m = idx + 1
      const hasta = ultimoDiaDelMes(anioSeleccionado, m)
      while (ti < sorted.length && sorted[ti].fecha <= hasta) {
        const t = sorted[ti++]
        const ars = convertirARS(Number(t.monto), t.moneda as Moneda, tc)
        if (t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t as Transaccion)) running += ars
        else if (cuentaComoSalidaDeEfectivo(t as Transaccion)) running -= ars
      }
      return {
        mes: row.mes,
        BalanceMes: row.Ingresos - row.SalidaEfectivo,
        SaldoAcumulado: running,
      }
    })
  }, [txSaldoHist, barData, anioSeleccionado, tc])

  const saldosAcumuladosMom = useMemo(() => {
    const acumHasta = (hasta: string) => {
      let ing = 0
      let sal = 0
      for (const t of txSaldoHist) {
        if (t.fecha > hasta) break
        const ars = convertirARS(Number(t.monto), t.moneda as Moneda, tc)
        if (t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t as Transaccion)) ing += ars
        else if (cuentaComoSalidaDeEfectivo(t as Transaccion)) sal += ars
      }
      return ing - sal
    }
    const prevMes = mesSeleccionado === 1 ? 12 : mesSeleccionado - 1
    const prevAnio = mesSeleccionado === 1 ? anioSeleccionado - 1 : anioSeleccionado
    const hastaAct = ultimoDiaDelMes(anioSeleccionado, mesSeleccionado)
    const hastaPrev = ultimoDiaDelMes(prevAnio, prevMes)
    return {
      finMesActual: acumHasta(hastaAct),
      finMesAnterior: acumHasta(hastaPrev),
    }
  }, [txSaldoHist, tc, anioSeleccionado, mesSeleccionado])

  /** Proyección de cashflow: próximos 6 meses basado en promedios históricos + cuotas + deudas. */
  const proyeccionCashflow = useMemo(() => {
    if (txSaldoHist.length === 0) return []
    return proyectarCashflow({
      transacciones: txSaldoHist,
      cuotas,
      deudas,
      saldoActual: saldosAcumuladosMom.finMesActual,
      tc,
      mesActual: mesSeleccionado,
      anioActual: anioSeleccionado,
      mesesProyectar: 6,
    })
  }, [txSaldoHist, cuotas, deudas, saldosAcumuladosMom.finMesActual, tc, mesSeleccionado, anioSeleccionado])

  const alertasCashflow = useMemo(() => {
    return resumenAlertasCashflow(proyeccionCashflow, 0)
  }, [proyeccionCashflow])

  // Section 2: Category donut
  const donutData = useMemo(() => {
    const gastosMes = transacciones.filter(
      (t) => t.tipo === 'gasto' && new Date(t.fecha + 'T00:00:00').getMonth() + 1 === mesSeleccionado,
    )
    const map = new Map<string, { nombre: string; color: string; total: number }>()
    for (const t of gastosMes) {
      const catId = t.categoria_id ?? 'sin-cat'
      const existing = map.get(catId)
      const ars = convertirARS(t.monto, t.moneda, tc)
      if (existing) {
        existing.total += ars
      } else {
        map.set(catId, {
          nombre: t.categoria?.nombre ?? 'Sin categoría',
          color: t.categoria?.color ?? '#94a3b8',
          total: ars,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [transacciones, mesSeleccionado, tc])

  /** Gastos del mes seleccionado acumulados por día del calendario (equivalente ARS). */
  const gastosPorDiaData = useMemo(() => {
    const dim = new Date(anioSeleccionado, mesSeleccionado, 0).getDate()
    const totals = new Map<number, number>()
    for (let d = 1; d <= dim; d++) totals.set(d, 0)
    for (const t of transacciones) {
      if (t.tipo !== 'gasto') continue
      const dt = new Date(t.fecha + 'T00:00:00')
      if (dt.getMonth() + 1 !== mesSeleccionado || dt.getFullYear() !== anioSeleccionado) continue
      const day = dt.getDate()
      const ars = convertirARS(t.monto, t.moneda, tc)
      totals.set(day, (totals.get(day) ?? 0) + ars)
    }
    return Array.from({ length: dim }, (_, i) => {
      const dia = i + 1
      return { dia, Gastos: totals.get(dia) ?? 0 }
    })
  }, [transacciones, mesSeleccionado, anioSeleccionado, tc])

  const gastosPorDiaTotal = useMemo(
    () => gastosPorDiaData.reduce((s, d) => s + d.Gastos, 0),
    [gastosPorDiaData],
  )

  const donutTotal = donutData.reduce((s, d) => s + d.total, 0)

  const momGrouped = useMemo(() => {
    const prevMes = mesSeleccionado === 1 ? 12 : mesSeleccionado - 1
    const prevAnio = mesSeleccionado === 1 ? anioSeleccionado - 1 : anioSeleccionado

    const currentTx = transacciones.filter(
      (t) => new Date(t.fecha + 'T00:00:00').getMonth() + 1 === mesSeleccionado,
    )
    let prevTx = transacciones.filter(
      (t) => new Date(t.fecha + 'T00:00:00').getMonth() + 1 === prevMes,
    )
    if (prevAnio !== anioSeleccionado) prevTx = []

    const rowKey = (t: { categoria_id: string | null; tipo: string }) =>
      `${t.categoria_id ?? 'sin-cat'}__${t.tipo}`

    const map = new Map<string, MomCatRow>()

    for (const t of prevTx) {
      const k = rowKey(t)
      const row = map.get(k)
      const ars = convertirARS(t.monto, t.moneda, tc)
      if (row) row.anterior += ars
      else
        map.set(k, {
          catId: t.categoria_id ?? 'sin-cat',
          nombre: t.categoria?.nombre ?? 'Sin categoría',
          tipo: t.tipo,
          anterior: ars,
          actual: 0,
        })
    }

    for (const t of currentTx) {
      const k = rowKey(t)
      const row = map.get(k)
      const ars = convertirARS(t.monto, t.moneda, tc)
      if (row) row.actual += ars
      else
        map.set(k, {
          catId: t.categoria_id ?? 'sin-cat',
          nombre: t.categoria?.nombre ?? 'Sin categoría',
          tipo: t.tipo,
          anterior: 0,
          actual: ars,
        })
    }

    const sortRows = (rows: MomCatRow[]) =>
      [...rows].sort((a, b) => {
        const mag = (r: MomCatRow) =>
          r.anterior > 0
            ? Math.abs(((r.actual - r.anterior) / r.anterior) * 100)
            : r.actual > 0
              ? 1e6
              : 0
        return mag(b) - mag(a)
      })

    const all = Array.from(map.values())
    return {
      gasto: sortRows(all.filter((r) => r.tipo === 'gasto')),
      ingreso: sortRows(all.filter((r) => r.tipo === 'ingreso')),
      suscripcion: sortRows(all.filter((r) => r.tipo === 'suscripcion')),
      all,
    }
  }, [transacciones, mesSeleccionado, anioSeleccionado, tc])

  const momSaldo = useMemo(() => {
    const saldoMes = (mes: number, anio: number) => {
      let ing = 0
      let salidas = 0
      for (const t of txSaldoHist) {
        const d = new Date(t.fecha + 'T00:00:00')
        if (d.getMonth() + 1 !== mes || d.getFullYear() !== anio) continue
        const ars = convertirARS(Number(t.monto), t.moneda as Moneda, tc)
        if (t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t as Transaccion)) ing += ars
        else if (cuentaComoSalidaDeEfectivo(t as Transaccion)) salidas += ars
      }
      return ing - salidas
    }
    const prevMes = mesSeleccionado === 1 ? 12 : mesSeleccionado - 1
    const prevAnio = mesSeleccionado === 1 ? anioSeleccionado - 1 : anioSeleccionado
    const anterior = saldoMes(prevMes, prevAnio)
    const actual = saldoMes(mesSeleccionado, anioSeleccionado)
    return { anterior, actual, delta: actual - anterior }
  }, [txSaldoHist, mesSeleccionado, anioSeleccionado, tc])

  // Section 4: Annual summary
  const annualSummary = useMemo(() => {
    let ingresos = 0, gastos = 0, suscripciones = 0
    const monthlyGastos = new Array(12).fill(0)
    for (const t of transacciones) {
      const ars = convertirARS(t.monto, t.moneda, tc)
      if (t.tipo === 'ingreso' && !esIngresoReintegroTarjetaCredito(t)) ingresos += ars
      else if (t.tipo === 'gasto') {
        gastos += ars
        monthlyGastos[new Date(t.fecha + 'T00:00:00').getMonth()] += ars
      } else suscripciones += ars
    }
    let maxMonth = 0, maxVal = 0
    for (let i = 0; i < 12; i++) {
      if (monthlyGastos[i] > maxVal) { maxVal = monthlyGastos[i]; maxMonth = i }
    }
    return { ingresos, gastos, suscripciones, maxMonth, maxVal }
  }, [transacciones, tc])

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const [downloading, setDownloading] = useState(false)
  const [ipcUiTick, setIpcUiTick] = useState(0)
  const [ipcDraft, setIpcDraft] = useState('')

  const ipcMesReferencia = getIpcMensual(anioSeleccionado, mesSeleccionado)

  useEffect(() => {
    const v = getIpcMensual(anioSeleccionado, mesSeleccionado)
    setIpcDraft(v !== null ? String(v).replace('.', ',') : '')
  }, [anioSeleccionado, mesSeleccionado, ipcUiTick])

  const aplicarIpcPersonalizado = () => {
    const raw = ipcDraft.trim().replace(/\s/g, '').replace(',', '.')
    if (raw === '') {
      writeIpcOverride(anioSeleccionado, mesSeleccionado, null)
    } else {
      const n = parseFloat(raw)
      if (Number.isFinite(n)) writeIpcOverride(anioSeleccionado, mesSeleccionado, n)
    }
    setIpcUiTick((x) => x + 1)
  }

  const restablecerIpcTabla = () => {
    writeIpcOverride(anioSeleccionado, mesSeleccionado, null)
    setIpcUiTick((x) => x + 1)
  }

  const handleDescargarCSV = async () => {
    setDownloading(true)
    try {
      const [{ data: txData }, { data: cuotasData }] = await Promise.all([
        supabase.from('transacciones').select('*, categoria:categorias(nombre)').order('fecha', { ascending: true }),
        supabase.from('compras_cuotas').select('*, categoria:categorias(nombre)').order('fecha_primera_cuota', { ascending: true }),
      ])

      const esc = (s: unknown) => {
        const str = String(s ?? '')
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str
      }

      const lines: string[] = []

      // — Transacciones —
      lines.push('TRANSACCIONES')
      lines.push('fecha,tipo,descripcion,categoria,monto,moneda,medio_pago')
      for (const t of (txData ?? []) as Array<Record<string, unknown>>) {
        const cat = (t.categoria as { nombre?: string } | null)?.nombre ?? ''
        lines.push([t.fecha, t.tipo, t.descripcion, cat, t.monto, t.moneda, t.medio_pago].map(esc).join(','))
      }

      lines.push('')

      // — Compras en cuotas —
      lines.push('COMPRAS EN CUOTAS')
      lines.push('fecha_primera_cuota,descripcion,categoria,monto_total,cuotas_total,monto_cuota,moneda')
      for (const c of (cuotasData ?? []) as Array<Record<string, unknown>>) {
        const cat = (c.categoria as { nombre?: string } | null)?.nombre ?? ''
        lines.push([c.fecha_primera_cuota, c.descripcion, cat, c.monto_total, c.cuotas_total, c.monto_cuota, c.moneda].map(esc).join(','))
      }

      const csv = lines.join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `guita_datos_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  function deltaColor(deltaPct: number, tipo: TipoTransaccion): string {
    if (deltaPct === 0) return 'text-gray-500'
    if (tipo === 'ingreso') return deltaPct > 0 ? 'text-emerald-400' : 'text-red-400'
    return deltaPct < 0 ? 'text-emerald-400' : 'text-red-400'
  }

  function deltaPctCell(ant: number, act: number, tipo: TipoTransaccion) {
    const pct = pctMoM(ant, act)
    if (ant <= 0 && act <= 0) return <span className="text-gray-600">—</span>
    if (pct === null && act > 0) return <span className="text-amber-400/90 text-xs">Nuevo</span>
    if (pct === null) return <span className="text-gray-600">—</span>
    const cls = deltaColor(pct, tipo)
    return (
      <span className={`font-semibold ${cls}`}>
        {pct >= 0 ? '+' : ''}
        {pct.toFixed(1)}%
      </span>
    )
  }

  /** Gastos: diferencia en puntos porcentuales vs IPC del mes actual (misma lógica mes a mes). */
  function vsIpcPp(ant: number, act: number) {
    const pct = pctMoM(ant, act)
    if (ipcMesReferencia === null || pct === null) {
      return <span className="text-gray-600">—</span>
    }
    const pp = pct - ipcMesReferencia
    const cls =
      pp > 0.5 ? 'text-rose-400' : pp < -0.5 ? 'text-emerald-400' : 'text-gray-400'
    return (
      <span className={cls} title="Puntos porcentuales respecto al IPC nacional del mes">
        {pp >= 0 ? '+' : ''}
        {pp.toFixed(1)} pp
      </span>
    )
  }

  return (
    <div className="px-4 pt-4 pb-28 lg:px-8 lg:pt-8 lg:pb-12 max-w-5xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <p className="text-primary text-xs font-bold tracking-[0.25em] uppercase mb-1">Finanzas Personales</p>
          <h1 className="text-2xl font-extrabold text-slate-50 tracking-tight lg:text-3xl">Análisis</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDescargarCSV}
            disabled={downloading}
            className="flex items-center gap-2 glass px-3 py-2 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
          >
            {downloading
              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              : <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>}
            <span className="hidden sm:inline">{downloading ? 'Descargando...' : 'Descargar CSV'}</span>
          </button>
          <div className="lg:hidden">
            <MobileUserMenu />
          </div>
        </div>
      </motion.div>

      {/* ── Selectores ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(Number(e.target.value))} className="select-dark flex-1">
          {MESES_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(Number(e.target.value))} className="select-dark w-28">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </motion.div>

      {loading || loadingSaldoHist ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <AnalisisCharts
            barData={barData}
            balanceDualData={balanceDualData}
            gastosPorDiaData={gastosPorDiaData}
            gastosPorDiaTotal={gastosPorDiaTotal}
            donutData={donutData}
            donutTotal={donutTotal}
            anioSeleccionado={anioSeleccionado}
            mesSeleccionado={mesSeleccionado}
          />

          {/* Section 3 — MoM Table */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-4 lg:p-6 rounded-xl"
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">
              Comparativa {MESES_FULL[mesSeleccionado === 1 ? 11 : mesSeleccionado - 2]} vs{' '}
              {MESES_FULL[mesSeleccionado - 1]} {anioSeleccionado}
            </h2>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Cada bloque suma solo su tipo (gastos, ingresos o suscripciones). El total de gastos ya no mezcla
              sueldos ni ingresos. La columna <span className="text-gray-400">Δ %</span> es la variación mes a mes
              de cada categoría; <span className="text-gray-400">vs IPC</span> compara esa variación con la
              inflación oficial del mes actual (referencia INDEC, editable abajo).
            </p>

            <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.01] px-3 py-3 space-y-2">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[10rem]">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    IPC nacional — {MESES_FULL[mesSeleccionado - 1]} (% mensual vs mes anterior)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ej: 2,9"
                    value={ipcDraft}
                    onChange={(e) => setIpcDraft(e.target.value)}
                    className="input-dark !py-2 !text-sm w-full max-w-[8rem]"
                  />
                </div>
                <button
                  type="button"
                  onClick={aplicarIpcPersonalizado}
                  className="rounded-xl bg-sky-500/15 px-3 py-2 text-xs font-medium text-sky-300 ring-1 ring-sky-500/25 hover:bg-sky-500/25"
                >
                  Guardar IPC
                </button>
                <button
                  type="button"
                  onClick={restablecerIpcTabla}
                  className="rounded-xl px-3 py-2 text-xs text-gray-500 hover:text-gray-400"
                >
                  Quitar personalizado
                </button>
              </div>
              <p className="text-[11px] text-gray-600 leading-snug">
                Valor en app:{' '}
                <span className="text-gray-400 font-medium">
                  {ipcMesReferencia !== null ? `${ipcMesReferencia.toFixed(1)}%` : 'sin dato — cargá el % del INDEC'}
                </span>
                {IPC_MENSUAL_VARIACION_PCT[ipcMonthKey(anioSeleccionado, mesSeleccionado)] !== undefined && (
                  <span className="text-gray-600"> (tabla interna; podés sobreescribir)</span>
                )}
              </p>
            </div>

            {mesSeleccionado === 1 && (
              <p className="text-amber-400/80 text-xs mb-4">
                En <strong>enero</strong> el mes anterior es diciembre del año previo; por ahora solo se cargan
                movimientos del año elegido arriba, así que la columna «Anterior» suele salir en $0. Compará
                febrero en adelante para ver el mes previo completo.
              </p>
            )}

            {momGrouped.all.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin datos para comparar</p>
            ) : (
              <div className="space-y-8">
                {(
                  [
                    {
                      key: 'gasto',
                      title: 'Gastos',
                      rows: momGrouped.gasto,
                      showIpc: true,
                    },
                    {
                      key: 'ingreso',
                      title: 'Ingresos',
                      rows: momGrouped.ingreso,
                      showIpc: false,
                    },
                    {
                      key: 'suscripcion',
                      title: 'Suscripciones',
                      rows: momGrouped.suscripcion,
                      showIpc: false,
                    },
                  ] as const
                ).map((block) => {
                  if (block.rows.length === 0) return null
                  const sub = aggregateMomRows(block.rows)
                  return (
                    <div key={block.key} className="overflow-x-auto">
                      <h3 className="text-sm font-semibold text-gray-300 mb-2">{block.title}</h3>
                      <table className="w-full text-sm min-w-[28rem]">
                        <thead>
                          <tr className="text-gray-500 text-xs uppercase tracking-wider">
                            <th className="text-left pb-3 font-medium">Categoría</th>
                            <th className="text-right pb-3 font-medium">Anterior</th>
                            <th className="text-right pb-3 font-medium">Actual</th>
                            <th className="text-right pb-3 font-medium">Δ ARS</th>
                            <th className="text-right pb-3 font-medium">Δ %</th>
                            {block.showIpc && (
                              <th className="text-right pb-3 font-medium">vs IPC</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {block.rows.map((r, i) => {
                            const delta = r.actual - r.anterior
                            return (
                              <motion.tr
                                key={`${block.key}-${r.catId}-${r.nombre}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.05 + i * 0.02 }}
                                className="border-t border-white/[0.04]"
                              >
                                <td className="py-2.5 text-gray-300">{r.nombre}</td>
                                <td className="py-2.5 text-right text-gray-400">{formatARS(r.anterior)}</td>
                                <td className="py-2.5 text-right text-gray-300">{formatARS(r.actual)}</td>
                                <td className="py-2.5 text-right text-gray-400">
                                  {delta >= 0 ? '+' : ''}
                                  {formatARS(delta)}
                                </td>
                                <td className="py-2.5 text-right">{deltaPctCell(r.anterior, r.actual, r.tipo)}</td>
                                {block.showIpc && (
                                  <td className="py-2.5 text-right text-xs">{vsIpcPp(r.anterior, r.actual)}</td>
                                )}
                              </motion.tr>
                            )
                          })}
                          <tr className="border-t-2 border-white/[0.1] font-semibold bg-white/[0.02]">
                            <td className="py-2.5 text-gray-100">Subtotal {block.title.toLowerCase()}</td>
                            <td className="py-2.5 text-right text-gray-300">{formatARS(sub.anterior)}</td>
                            <td className="py-2.5 text-right text-gray-100">{formatARS(sub.actual)}</td>
                            <td className="py-2.5 text-right text-gray-300">
                              {sub.delta >= 0 ? '+' : ''}
                              {formatARS(sub.delta)}
                            </td>
                            <td className="py-2.5 text-right">{deltaPctCell(sub.anterior, sub.actual, block.key)}</td>
                            {block.showIpc && (
                              <td className="py-2.5 text-right text-xs">{vsIpcPp(sub.anterior, sub.actual)}</td>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )
                })}

                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-4 py-3 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-indigo-200/90 mb-1">Flujo del mes (sin tarjeta de crédito)</p>
                    <p className="text-sm text-gray-400">
                      Mes anterior: <span className="text-gray-200">{formatARS(momSaldo.anterior)}</span>
                      {' · '}
                      Mes actual: <span className="text-gray-200">{formatARS(momSaldo.actual)}</span>
                      {' · '}
                      <span className={momSaldo.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        Cambio: {momSaldo.delta >= 0 ? '+' : ''}
                        {formatARS(momSaldo.delta)}
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1 leading-snug">
                      Solo ingresos y salidas en efectivo / transferencia / débito de cada mes.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-indigo-500/15">
                    <p className="text-xs font-semibold text-emerald-200/85 mb-1">Saldo acumulado (como en Inicio)</p>
                    <p className="text-sm text-gray-400">
                      Fin mes anterior: <span className="text-gray-200">{formatARS(saldosAcumuladosMom.finMesAnterior)}</span>
                      {' · '}
                      Fin mes seleccionado: <span className="text-gray-200">{formatARS(saldosAcumuladosMom.finMesActual)}</span>
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1 leading-snug">
                      Suma de todo tu historial hasta el último día de cada mes; el superávit previo se mantiene al cambiar de mes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.section>

          <AnalisisCashflow
            proyeccionCashflow={proyeccionCashflow}
            alertasCashflow={alertasCashflow}
          />

          {/* Section 4 — Annual summary */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Resumen anual {anioSeleccionado}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard titulo="Total Ingresos" montoARS={annualSummary.ingresos} montoUSD={annualSummary.ingresos / tc} icon={<TrendingUp size={16} />} delay={0.35} />
              <KPICard titulo="Total Gastos" montoARS={annualSummary.gastos} montoUSD={annualSummary.gastos / tc} icon={<TrendingDown size={16} />} delay={0.4} />
              <KPICard titulo="Total Suscripciones" montoARS={annualSummary.suscripciones} montoUSD={annualSummary.suscripciones / tc} icon={<RotateCcw size={16} />} delay={0.45} />
              <KPICard titulo="Mes mayor gasto" montoARS={annualSummary.maxVal} descripcion={annualSummary.maxVal > 0 ? MESES_FULL[annualSummary.maxMonth] : 'Sin gastos'} icon={<CalendarDays size={16} />} delay={0.5} />
            </div>
          </motion.section>
        </>
      )}
    </div>
  )
}
