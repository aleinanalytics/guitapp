import { motion } from 'framer-motion'
import type { PieLabelRenderProps } from 'recharts'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  ComposedChart, Area, Line, CartesianGrid,
} from 'recharts'
import { formatARS } from '../lib/utils'

const CHART_COLORS = {
  ingresos: '#10b981',
  gastos: '#ef4444',
  suscripciones: '#a855f7',
  grid: '#2a2931',
  axis: '#464555',
  tooltipBg: '#1b1b23',
  tooltipBorder: 'rgba(70,69,85,0.6)',
}

const MESES_FULL = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

type BarItem = { mes: string; Ingresos: number; Gastos: number; Suscripciones: number; SalidaEfectivo: number }
type BalanceItem = { mes: string; BalanceMes: number; SaldoAcumulado: number }
type DiaItem = { dia: number; Gastos: number }
type DonutItem = { nombre: string; color: string; total: number }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) => {
  if (!active || !payload?.length) return null
  const ing = (payload[0]?.value as number) ?? 0
  const gas = (payload[1]?.value as number) ?? 0
  const sus = (payload[2]?.value as number) ?? 0
  return (
    <div className="glass p-3 text-sm border border-white/[0.08]" style={{ background: CHART_COLORS.tooltipBg }}>
      <p className="font-semibold text-gray-200 mb-1.5">{label}</p>
      <p className="text-emerald-400 text-xs">Ingresos: <span className="font-semibold">{formatARS(ing)}</span></p>
      <p className="text-red-400 text-xs mt-0.5">Gastos: <span className="font-semibold">{formatARS(gas)}</span></p>
      <p className="text-purple-400 text-xs mt-0.5">Suscripciones: <span className="font-semibold">{formatARS(sus)}</span></p>
    </div>
  )
}

export default function AnalisisCharts({
  barData,
  balanceDualData,
  gastosPorDiaData,
  gastosPorDiaTotal,
  donutData,
  donutTotal,
  anioSeleccionado,
  mesSeleccionado,
}: {
  barData: BarItem[]
  balanceDualData: BalanceItem[]
  gastosPorDiaData: DiaItem[]
  gastosPorDiaTotal: number
  donutData: DonutItem[]
  donutTotal: number
  anioSeleccionado: number
  mesSeleccionado: number
}) {
  return (
    <>
      {/* Section 1 — Bar Chart */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 lg:p-6 rounded-xl"
      >
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Evolución anual {anioSeleccionado}</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={barData} barCategoryGap="20%">
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Legend wrapperStyle={{ paddingTop: 12 }} formatter={(value: string) => <span className="text-xs text-gray-400">{value}</span>} />
            <Bar dataKey="Ingresos" fill={CHART_COLORS.ingresos} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos" fill={CHART_COLORS.gastos} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Suscripciones" fill={CHART_COLORS.suscripciones} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.section>

      {/* Balance del mes + saldo acumulado */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-4 lg:p-6 rounded-xl"
      >
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">Balance del mes y saldo acumulado</h2>
        <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
          <strong className="text-gray-400">Balance del mes</strong> (área): solo ese mes, ingresos menos salidas en efectivo, transferencia o débito; sin tarjeta de crédito.{' '}
          <strong className="text-gray-400">Saldo acumulado</strong> (línea): todo tu historial hasta el último día de cada mes — el superávit de meses previos se arrastra, igual que en el inicio.
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={balanceDualData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#818cf8' }} axisLine={false} tickLine={false} width={44} />
            <YAxis yAxisId="right" orientation="right" tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#34d399' }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const bal = payload.find((p) => p.dataKey === 'BalanceMes')
                const acu = payload.find((p) => p.dataKey === 'SaldoAcumulado')
                return (
                  <div className="glass p-2.5 text-sm border border-white/[0.08]" style={{ background: CHART_COLORS.tooltipBg }}>
                    <p className="text-gray-400 text-xs mb-1">{label} {anioSeleccionado}</p>
                    {bal != null && <p className="text-indigo-300 text-xs">Balance del mes: <span className="font-semibold">{formatARS(Number(bal.value))}</span></p>}
                    {acu != null && <p className="text-emerald-400/90 text-xs mt-0.5">Saldo acumulado: <span className="font-semibold">{formatARS(Number(acu.value))}</span></p>}
                  </div>
                )
              }}
              cursor={{ stroke: 'rgba(255,255,255,0.06)' }}
            />
            <Legend wrapperStyle={{ paddingTop: 8 }} formatter={(value: string) => <span className="text-xs text-gray-400">{value === 'BalanceMes' ? 'Balance del mes' : value === 'SaldoAcumulado' ? 'Saldo acumulado' : value}</span>} />
            <Area yAxisId="left" type="monotone" dataKey="BalanceMes" name="BalanceMes" stroke="#818cf8" strokeWidth={2} fill="url(#balanceGrad)" dot={false} activeDot={{ r: 4, fill: '#818cf8', stroke: '#151524', strokeWidth: 2 }} />
            <Line yAxisId="right" type="monotone" dataKey="SaldoAcumulado" name="SaldoAcumulado" stroke="#34d399" strokeWidth={2} dot={{ r: 2, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#34d399', stroke: '#151524', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.section>

      {/* Gastos por día */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="glass-card p-4 lg:p-6 rounded-xl"
      >
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">
          Gastos por día — {MESES_FULL[mesSeleccionado - 1]} {anioSeleccionado}
        </h2>
        <p className="text-[11px] text-gray-500 mb-4">
          Suma diaria de movimientos tipo gasto (ARS y USD al tipo de cambio del análisis).
          {gastosPorDiaTotal > 0 && <span className="text-gray-400"> Total del mes: {formatARS(gastosPorDiaTotal)}</span>}
        </p>
        {gastosPorDiaTotal <= 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Sin gastos registrados este mes</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={gastosPorDiaData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} opacity={0.35} />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} interval={gastosPorDiaData.length > 24 ? 2 : gastosPorDiaData.length > 16 ? 1 : 0} />
              <YAxis tickFormatter={(v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${v}`)} tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const v = Number(payload[0]?.value ?? 0)
                  return (
                    <div className="glass p-2.5 text-sm border border-white/[0.08]" style={{ background: CHART_COLORS.tooltipBg }}>
                      <p className="text-gray-400 text-xs mb-0.5">{MESES_FULL[mesSeleccionado - 1]} {label}, {anioSeleccionado}</p>
                      <p className="text-red-400 font-semibold">{formatARS(v)}</p>
                    </div>
                  )
                }}
                cursor={{ fill: 'rgba(239,68,68,0.08)' }}
              />
              <Bar dataKey="Gastos" fill={CHART_COLORS.gastos} radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.section>

      {/* Donut */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4 lg:p-6 rounded-xl"
      >
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
          Distribución de gastos — {MESES_FULL[mesSeleccionado - 1]}
        </h2>
        {donutData.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">Sin gastos registrados este mes</p>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/2">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={donutData} dataKey="total" nameKey="nombre" innerRadius={55} outerRadius={90} strokeWidth={0}
                    label={(props: PieLabelRenderProps) => `${((props.percent ?? 0) * 100).toFixed(0)}%`}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
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
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-gray-300">{d.nombre}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-200">{formatARS(d.total)}</span>
                    <span className="text-xs text-gray-500 ml-2">{donutTotal > 0 ? ((d.total / donutTotal) * 100).toFixed(1) : '0'}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.section>
    </>
  )
}
