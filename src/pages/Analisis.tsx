import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import type { PieLabelRenderProps } from 'recharts'
import KPICard from '../components/KPICard'
import { useAnalisis } from '../hooks/useAnalisis'
import { supabase } from '../lib/supabase'
import { convertirARS, formatARS } from '../lib/utils'
import type { TipoTransaccion } from '../lib/types'
import { TrendingUp, TrendingDown, RotateCcw, CalendarDays } from 'lucide-react'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MESES_FULL = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

const now = new Date()
const currentYear = now.getFullYear()

const CHART_COLORS = {
  ingresos: '#10b981',
  gastos: '#ef4444',
  suscripciones: '#a855f7',
  grid: '#1e1e32',
  axis: '#4a4a66',
  tooltipBg: '#151524',
  tooltipBorder: '#2d2d44',
}

export default function Analisis() {
  const [anioSeleccionado, setAnioSeleccionado] = useState(currentYear)
  const [mesSeleccionado, setMesSeleccionado] = useState(now.getMonth() + 1)
  const [tipoCambio, setTipoCambio] = useState(1000)

  const { transacciones, loading } = useAnalisis({ anio: anioSeleccionado })

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

  // Section 1: Monthly data
  const barData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      mes: MESES[i],
      Ingresos: 0,
      Gastos: 0,
      Suscripciones: 0,
    }))
    for (const t of transacciones) {
      const m = new Date(t.fecha + 'T00:00:00').getMonth()
      const ars = convertirARS(t.monto, t.moneda, tc)
      if (t.tipo === 'ingreso') months[m].Ingresos += ars
      else if (t.tipo === 'gasto') months[m].Gastos += ars
      else months[m].Suscripciones += ars
    }
    return months
  }, [transacciones, tc])

  // Balance area chart data
  const balanceData = useMemo(() => {
    return barData.map((m) => ({
      mes: m.mes,
      Balance: m.Ingresos - m.Gastos - m.Suscripciones,
    }))
  }, [barData])

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

  const donutTotal = donutData.reduce((s, d) => s + d.total, 0)

  // Section 3: MoM comparison
  const momData = useMemo(() => {
    const prevMes = mesSeleccionado === 1 ? 12 : mesSeleccionado - 1
    const prevAnio = mesSeleccionado === 1 ? anioSeleccionado - 1 : anioSeleccionado

    const currentTx = transacciones.filter(
      (t) => new Date(t.fecha + 'T00:00:00').getMonth() + 1 === mesSeleccionado,
    )
    let prevTx = transacciones.filter(
      (t) => new Date(t.fecha + 'T00:00:00').getMonth() + 1 === prevMes,
    )
    if (prevAnio !== anioSeleccionado) prevTx = []

    type CatRow = { catId: string; nombre: string; tipo: TipoTransaccion; anterior: number; actual: number }
    const map = new Map<string, CatRow>()

    for (const t of prevTx) {
      const catId = t.categoria_id ?? 'sin-cat'
      const row = map.get(catId)
      const ars = convertirARS(t.monto, t.moneda, tc)
      if (row) row.anterior += ars
      else map.set(catId, { catId, nombre: t.categoria?.nombre ?? 'Sin categoría', tipo: t.tipo, anterior: ars, actual: 0 })
    }

    for (const t of currentTx) {
      const catId = t.categoria_id ?? 'sin-cat'
      const row = map.get(catId)
      const ars = convertirARS(t.monto, t.moneda, tc)
      if (row) row.actual += ars
      else map.set(catId, { catId, nombre: t.categoria?.nombre ?? 'Sin categoría', tipo: t.tipo, anterior: 0, actual: ars })
    }

    const rows = Array.from(map.values())
    rows.sort((a, b) => {
      const absA = a.anterior === 0 ? 0 : Math.abs(((a.actual - a.anterior) / a.anterior) * 100)
      const absB = b.anterior === 0 ? 0 : Math.abs(((b.actual - b.anterior) / b.anterior) * 100)
      return absB - absA
    })
    return rows
  }, [transacciones, mesSeleccionado, anioSeleccionado, tc])

  const momTotals = useMemo(() => {
    const anterior = momData.reduce((s, r) => s + r.anterior, 0)
    const actual = momData.reduce((s, r) => s + r.actual, 0)
    return { anterior, actual }
  }, [momData])

  // Section 4: Annual summary
  const annualSummary = useMemo(() => {
    let ingresos = 0, gastos = 0, suscripciones = 0
    const monthlyGastos = new Array(12).fill(0)
    for (const t of transacciones) {
      const ars = convertirARS(t.monto, t.moneda, tc)
      if (t.tipo === 'ingreso') ingresos += ars
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

  function deltaColor(deltaPct: number, tipo: TipoTransaccion): string {
    if (deltaPct === 0) return 'text-gray-500'
    if (tipo === 'ingreso') return deltaPct > 0 ? 'text-emerald-400' : 'text-red-400'
    return deltaPct < 0 ? 'text-emerald-400' : 'text-red-400'
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) => {
    if (!active || !payload?.length) return null
    const ing = (payload[0]?.value as number) ?? 0
    const gas = (payload[1]?.value as number) ?? 0
    const sus = (payload[2]?.value as number) ?? 0
    return (
      <div className="glass p-3 text-sm border border-white/[0.08]" style={{ background: CHART_COLORS.tooltipBg }}>
        <p className="font-semibold text-gray-200 mb-1.5">{label}</p>
        <p className="text-emerald-400">Ingresos: {formatARS(ing)}</p>
        <p className="text-red-400">Gastos: {formatARS(gas)}</p>
        <p className="text-purple-400">Suscripciones: {formatARS(sus)}</p>
        <div className="border-t border-white/[0.06] mt-1.5 pt-1.5">
          <p className="font-medium text-gray-300">Balance: {formatARS(ing - gas - sus)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl lg:text-3xl font-bold text-gray-50 mb-6"
      >
        Análisis
      </motion.h1>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 mb-6"
      >
        <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(Number(e.target.value))} className="select-dark flex-1">
          {MESES_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(Number(e.target.value))} className="select-dark w-28">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Section 1 — Bar Chart */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-4 lg:p-6 mb-6"
          >
            <h2 className="text-base font-semibold text-gray-200 mb-4">Evolución anual {anioSeleccionado}</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData} barCategoryGap="20%">
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend
                  wrapperStyle={{ paddingTop: 12 }}
                  formatter={(value: string) => <span className="text-xs text-gray-400">{value}</span>}
                />
                <Bar dataKey="Ingresos" fill={CHART_COLORS.ingresos} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos" fill={CHART_COLORS.gastos} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Suscripciones" fill={CHART_COLORS.suscripciones} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.section>

          {/* Balance area chart */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass p-4 lg:p-6 mb-6"
          >
            <h2 className="text-base font-semibold text-gray-200 mb-4">Balance mensual</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={balanceData}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="glass p-2 text-sm" style={{ background: CHART_COLORS.tooltipBg }}>
                        <p className="text-gray-400 text-xs">{label}</p>
                        <p className="text-accent-blue font-semibold">{formatARS(Number(payload[0].value))}</p>
                      </div>
                    )
                  }}
                  cursor={false}
                />
                <Area type="monotone" dataKey="Balance" stroke="#6366f1" strokeWidth={2} fill="url(#balanceGrad)" dot={false} activeDot={{ r: 4, fill: '#6366f1', stroke: '#151524', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.section>

          {/* Section 2 — Donut */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass p-4 lg:p-6 mb-6"
          >
            <h2 className="text-base font-semibold text-gray-200 mb-4">
              Distribución de gastos — {MESES_FULL[mesSeleccionado - 1]}
            </h2>
            {donutData.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin gastos registrados este mes</p>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-full md:w-1/2">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="total"
                        nameKey="nombre"
                        innerRadius={55}
                        outerRadius={90}
                        strokeWidth={0}
                        label={(props: PieLabelRenderProps) =>
                          `${((props.percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {donutData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div className="glass p-2 text-sm" style={{ background: CHART_COLORS.tooltipBg }}>
                              <p className="text-gray-300 font-medium">{payload[0].name}</p>
                              <p className="text-gray-100">{formatARS(Number(payload[0].value))}</p>
                            </div>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-1/2 space-y-2">
                  {donutData.map((d, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-sm text-gray-300">{d.nombre}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-200">{formatARS(d.total)}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {donutTotal > 0 ? ((d.total / donutTotal) * 100).toFixed(1) : '0'}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Section 3 — MoM Table */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass p-4 lg:p-6 mb-6"
          >
            <h2 className="text-base font-semibold text-gray-200 mb-4">
              Comparativa {MESES_FULL[mesSeleccionado === 1 ? 11 : mesSeleccionado - 2]} vs {MESES_FULL[mesSeleccionado - 1]}
            </h2>
            {momData.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Sin datos para comparar</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs uppercase tracking-wider">
                      <th className="text-left pb-3 font-medium">Categoría</th>
                      <th className="text-right pb-3 font-medium">Anterior</th>
                      <th className="text-right pb-3 font-medium">Actual</th>
                      <th className="text-right pb-3 font-medium">Δ ARS</th>
                      <th className="text-right pb-3 font-medium">Δ %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {momData.map((r, i) => {
                      const delta = r.actual - r.anterior
                      const pct = r.anterior === 0 ? null : ((r.actual - r.anterior) / r.anterior) * 100
                      return (
                        <motion.tr
                          key={r.catId}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 + i * 0.03 }}
                          className="border-t border-white/[0.04]"
                        >
                          <td className="py-2.5 text-gray-300">{r.nombre}</td>
                          <td className="py-2.5 text-right text-gray-400">{formatARS(r.anterior)}</td>
                          <td className="py-2.5 text-right text-gray-300">{formatARS(r.actual)}</td>
                          <td className="py-2.5 text-right text-gray-400">
                            {delta >= 0 ? '+' : ''}{formatARS(delta)}
                          </td>
                          <td className={`py-2.5 text-right font-semibold ${pct === null ? 'text-gray-600' : deltaColor(pct, r.tipo)}`}>
                            {pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`}
                          </td>
                        </motion.tr>
                      )
                    })}
                    <tr className="border-t-2 border-white/[0.08] font-bold">
                      <td className="py-2.5 text-gray-100">TOTAL</td>
                      <td className="py-2.5 text-right text-gray-300">{formatARS(momTotals.anterior)}</td>
                      <td className="py-2.5 text-right text-gray-100">{formatARS(momTotals.actual)}</td>
                      <td className="py-2.5 text-right text-gray-300">
                        {momTotals.actual - momTotals.anterior >= 0 ? '+' : ''}
                        {formatARS(momTotals.actual - momTotals.anterior)}
                      </td>
                      <td className="py-2.5 text-right text-gray-300">
                        {momTotals.anterior === 0
                          ? '—'
                          : `${(((momTotals.actual - momTotals.anterior) / momTotals.anterior) * 100) >= 0 ? '+' : ''}${(((momTotals.actual - momTotals.anterior) / momTotals.anterior) * 100).toFixed(1)}%`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>

          {/* Section 4 — Annual summary */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h2 className="text-base font-semibold text-gray-200 mb-4">Resumen anual {anioSeleccionado}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard titulo="Total Ingresos" montoARS={annualSummary.ingresos} montoUSD={annualSummary.ingresos / tc} icon={<TrendingUp size={16} />} accentColor="#10b981" glowClass="glow-green" delay={0.35} />
              <KPICard titulo="Total Gastos" montoARS={annualSummary.gastos} montoUSD={annualSummary.gastos / tc} icon={<TrendingDown size={16} />} accentColor="#ef4444" glowClass="glow-red" delay={0.4} />
              <KPICard titulo="Total Suscripciones" montoARS={annualSummary.suscripciones} montoUSD={annualSummary.suscripciones / tc} icon={<RotateCcw size={16} />} accentColor="#a855f7" glowClass="glow-purple" delay={0.45} />
              <KPICard titulo="Mes mayor gasto" montoARS={annualSummary.maxVal} descripcion={annualSummary.maxVal > 0 ? MESES_FULL[annualSummary.maxMonth] : 'Sin gastos'} icon={<CalendarDays size={16} />} accentColor="#f59e0b" delay={0.5} />
            </div>
          </motion.section>
        </>
      )}
    </div>
  )
}
