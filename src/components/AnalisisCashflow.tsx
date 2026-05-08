import { motion } from 'framer-motion'
import { AlertTriangle, Minus } from 'lucide-react'
import { ComposedChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { formatARS } from '../lib/utils'

const CHART_COLORS = {
  axis: '#464555',
  tooltipBg: '#1b1b23',
}

type CashflowItem = {
  label: string
  saldoFinal: number
  ingresos: number
  gastosFijos: number
  suscripciones: number
  gastosVariables: number
  cuotasTC: number
  deudas: number
}

type Alertas = {
  primerNegativo: { label: string; saldoFinal: number } | null
  mesesBajoEmergencia: { label: string; saldoFinal: number }[]
}

export default function AnalisisCashflow({
  proyeccionCashflow,
  alertasCashflow,
}: {
  proyeccionCashflow: CashflowItem[]
  alertasCashflow: Alertas
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card p-4 lg:p-6 rounded-xl"
    >
      <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">Proyección de cashflow (6 meses)</h2>
      <p className="text-[11px] text-gray-500 mb-4">
        Basado en promedios históricos + cuotas + deudas. No incluye ingresos extraordinarios ni imprevistos.
      </p>

      {alertasCashflow.primerNegativo && (
        <div className="mb-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-rose-400" />
          <p className="text-sm text-rose-200/90">
            Tu saldo se vuelve negativo en <strong>{alertasCashflow.primerNegativo.label}</strong> ({formatARS(alertasCashflow.primerNegativo.saldoFinal)})
          </p>
        </div>
      )}
      {!alertasCashflow.primerNegativo && alertasCashflow.mesesBajoEmergencia.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
          <Minus size={16} className="shrink-0 text-amber-400" />
          <p className="text-sm text-amber-200/90">
            Tu saldo cae por debajo del fondo de emergencia en {alertasCashflow.mesesBajoEmergencia.map((m) => m.label).join(', ')}
          </p>
        </div>
      )}

      {proyeccionCashflow.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">Necesitás movimientos históricos para generar la proyección.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={proyeccionCashflow} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="cashflowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: CHART_COLORS.axis }} axisLine={false} tickLine={false} width={44} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const p = payload[0]?.payload as CashflowItem
                  return (
                    <div className="glass p-2.5 text-sm border border-white/[0.08]" style={{ background: CHART_COLORS.tooltipBg }}>
                      <p className="text-gray-400 text-xs mb-1.5 font-medium">{label}</p>
                      <p className="text-emerald-400 text-xs">Saldo proyectado: <span className="font-semibold">{formatARS(p.saldoFinal)}</span></p>
                      <div className="border-t border-white/[0.06] mt-1.5 pt-1.5 space-y-0.5">
                        <p className="text-[11px] text-gray-500">Ingresos: {formatARS(p.ingresos)}</p>
                        <p className="text-[11px] text-gray-500">Gastos fijos: {formatARS(p.gastosFijos)}</p>
                        <p className="text-[11px] text-gray-500">Suscripciones: {formatARS(p.suscripciones)}</p>
                        <p className="text-[11px] text-gray-500">Variables: {formatARS(p.gastosVariables)}</p>
                        {p.cuotasTC > 0 && <p className="text-[11px] text-rose-300/80">Cuotas TC: {formatARS(p.cuotasTC)}</p>}
                        {p.deudas > 0 && <p className="text-[11px] text-rose-300/80">Deudas: {formatARS(p.deudas)}</p>}
                      </div>
                    </div>
                  )
                }}
                cursor={{ stroke: 'rgba(255,255,255,0.06)' }}
              />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area
                type="monotone"
                dataKey="saldoFinal"
                name="Saldo proyectado"
                stroke="#34d399"
                strokeWidth={2}
                fill="url(#cashflowGrad)"
                dot={(props: any) => {
                  const val = props?.payload?.saldoFinal as number
                  return <circle cx={props.cx} cy={props.cy} r={3} fill={val < 0 ? '#ef4444' : '#34d399'} strokeWidth={0} />
                }}
                activeDot={{ r: 5, fill: '#34d399', stroke: '#151524', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {proyeccionCashflow.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className={`rounded-xl border px-3 py-3 text-center ${
                  p.saldoFinal < 0 ? 'border-rose-500/20 bg-rose-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{p.label}</p>
                <p className={`text-sm font-bold tabular-nums ${p.saldoFinal < 0 ? 'text-rose-400' : 'text-emerald-300'}`}>
                  {formatARS(p.saldoFinal)}
                </p>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.section>
  )
}
