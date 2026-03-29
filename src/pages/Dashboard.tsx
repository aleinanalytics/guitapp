import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pencil, Check, X, TrendingUp, TrendingDown, Wallet, CreditCard, RotateCcw, DollarSign, Zap } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import KPICard from '../components/KPICard'
import { useTransacciones } from '../hooks/useTransacciones'
import { useTipoCambio } from '../hooks/useTipoCambio'
import { useCuotas, getCuotaForMonth } from '../hooks/useCuotas'
import { useTarjetaConfig, countdownTarjeta, formatFechaTarjeta } from '../hooks/useTarjetaConfig'
import { useAnalisis } from '../hooks/useAnalisis'
import { convertirARS, formatARS, formatUSD } from '../lib/utils'
import { useAuth } from '../lib/AuthContext'

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const now = new Date()
const currentYear = now.getFullYear()

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

  const [editingTC, setEditingTC] = useState(false)
  const [tcInput, setTcInput] = useState('')

  const tc = tipoCambio?.usd_ars ?? 1000

  const ingresos = transacciones
    .filter((t) => t.tipo === 'ingreso')
    .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)

  const gastos = transacciones
    .filter((t) => t.tipo === 'gasto')
    .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)

  const suscripciones = transacciones
    .filter((t) => t.tipo === 'suscripcion')
    .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)

  const balance = ingresos - gastos - suscripciones

  const gastosTx = transacciones.filter((t) => t.tipo === 'gasto')
  const mayorGasto = gastosTx.length > 0
    ? gastosTx.reduce((max, t) => (convertirARS(t.monto, t.moneda, tc) > convertirARS(max.monto, max.moneda, tc) ? t : max))
    : null

  // Tarjeta KPI: single payments + cuotas for this month
  const tarjetaData = useMemo(() => {
    const tarjetaSingle = transacciones
      .filter((t) => t.medio_pago === 'tarjeta')
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)

    let cuotasThisMonth = 0
    const cuotaDetails: { desc: string; numero: number; total: number; monto: number }[] = []
    for (const c of cuotas) {
      const info = getCuotaForMonth(c, mes, anio)
      if (info) {
        cuotasThisMonth += convertirARS(info.monto, c.moneda, tc)
        cuotaDetails.push({ desc: c.descripcion, ...info })
      }
    }

    // Next month
    const nextMes = mes === 12 ? 1 : mes + 1
    const nextAnio = mes === 12 ? anio + 1 : anio
    let cuotasNextMonth = 0
    const nextDetails: { desc: string; numero: number; total: number; monto: number }[] = []
    for (const c of cuotas) {
      const info = getCuotaForMonth(c, nextMes, nextAnio)
      if (info) {
        cuotasNextMonth += convertirARS(info.monto, c.moneda, tc)
        nextDetails.push({ desc: c.descripcion, ...info })
      }
    }

    return {
      totalMes: tarjetaSingle + cuotasThisMonth,
      cuotaDetails,
      nextMonthTotal: cuotasNextMonth,
      nextDetails,
      nextMesName: MESES[nextMes - 1],
    }
  }, [transacciones, cuotas, mes, anio, tc])

  // Chart data — desktop only
  const pieData = useMemo(() => {
    const gastosEfectivo = transacciones
      .filter((t) => t.tipo === 'gasto' && t.medio_pago !== 'tarjeta')
      .reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
    return [
      { name: 'Ingresos', value: ingresos, color: '#10b981' },
      { name: 'Gastos', value: gastosEfectivo, color: '#ef4444' },
      { name: 'Tarjeta', value: tarjetaData.totalMes, color: '#f43f5e' },
      { name: 'Suscripciones', value: suscripciones, color: '#a855f7' },
    ].filter((d) => d.value > 0)
  }, [transacciones, ingresos, suscripciones, tarjetaData.totalMes, tc])

  const barData = useMemo(() => {
    const byCategory: Record<string, { nombre: string; color: string; total: number }> = {}
    for (const t of transacciones) {
      if (t.tipo !== 'gasto') continue
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
  }, [transacciones, cuotas, mes, anio, tc])

  const lineData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const txMes = txAnio.filter((t) => {
        const d = new Date(t.fecha + 'T00:00:00')
        return d.getMonth() + 1 === m
      })
      const ing = txMes.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
      const gas = txMes.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + convertirARS(t.monto, t.moneda, tc), 0)
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

  const qMesAnio = `mes=${mes}&anio=${anio}`
  const toIngresos = `/movimientos?tipo=ingreso&${qMesAnio}`
  const toGastos = `/movimientos?tipo=gasto&${qMesAnio}`
  const toSuscripciones = `/movimientos?tipo=suscripcion&${qMesAnio}`
  const toBalance = `/movimientos?tipo=todos&${qMesAnio}`
  const toTarjetaCredito = `/tarjeta-credito?${qMesAnio}`

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <p className="text-sm text-gray-500">{firstName ? `Hola, ${firstName}` : 'Hola'}</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-50">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          {dolarLive && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-lg">
              <Zap size={12} />
              Dólar Oficial: {formatARS(dolarLive)}
            </div>
          )}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-sm font-bold text-white lg:hidden">
            {firstName ? firstName[0] : 'U'}
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* Balance primero: fila completa en móvil, primer KPI en desktop */}
          <div className="col-span-2 lg:col-span-1 min-w-0 h-full">
            <KPICard titulo="Balance" montoARS={balance} montoUSD={balance / tc}
              icon={<Wallet size={18} />}
              accentColor={balance >= 0 ? '#10b981' : '#ef4444'}
              glowClass={balance >= 0 ? 'glow-green' : 'glow-red'}
              delay={0}
              to={toBalance} />
          </div>
          <KPICard titulo="Ingresos" montoARS={ingresos} montoUSD={ingresos / tc}
            icon={<TrendingUp size={18} />} accentColor="#10b981" glowClass="glow-green" delay={0.05} to={toIngresos} />
          <KPICard titulo="Gastos" montoARS={gastos} montoUSD={gastos / tc}
            icon={<TrendingDown size={18} />} accentColor="#ef4444" glowClass="glow-red" delay={0.08} to={toGastos} />
          <KPICard titulo="Suscripciones" montoARS={suscripciones} montoUSD={suscripciones / tc}
            icon={<RotateCcw size={18} />} accentColor="#a855f7" glowClass="glow-purple" delay={0.1} to={toSuscripciones} />

          {/* Tarjeta de Crédito KPI — spans 2 cols on desktop */}
          <Link
            to={toTarjetaCredito}
            className="col-span-2 block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
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
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tarjeta de Crédito</p>
                <CreditCard size={18} className="text-gray-500" />
              </div>

              <p className="text-xl font-bold text-gray-50">{formatARS(tarjetaData.totalMes)}</p>
              <p className="text-sm text-gray-500 mt-0.5">{formatUSD(tarjetaData.totalMes / tc)}</p>

              {tcConfig ? (
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2.5 text-[11px] sm:text-xs">
                  <div>
                    <p className="text-gray-500 uppercase tracking-wide">Fecha de cierre</p>
                    <p className="mt-0.5 text-gray-200">
                      {formatFechaTarjeta(tcConfig.fecha_cierre)}
                      <span className="text-rose-400/90"> · {countdownTarjeta(tcConfig.fecha_cierre)}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 uppercase tracking-wide">Vencimiento</p>
                    <p className="mt-0.5 text-gray-200">
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
                      <span className="text-gray-300">{d.desc}</span> — cuota {d.numero}/{d.total} · {formatARS(d.monto)}
                    </p>
                  ))}
                </div>
              )}

              {tarjetaData.nextMonthTotal > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06]">
                  <p className="text-xs text-amber-400/80">
                    El próximo resumen ({tarjetaData.nextMesName}) vendrán {formatARS(tarjetaData.nextMonthTotal)}
                  </p>
                  {tarjetaData.nextDetails.map((d, i) => (
                    <p key={i} className="text-[11px] text-gray-500 mt-0.5">
                      {d.desc} — cuota {d.numero}/{d.total}
                    </p>
                  ))}
                </div>
              )}
            </motion.div>
          </Link>

          <KPICard titulo="Mayor Gasto" delay={0.22}
            montoARS={mayorGasto ? convertirARS(mayorGasto.monto, mayorGasto.moneda, tc) : 0}
            descripcion={mayorGasto?.descripcion} icon={<TrendingDown size={18} />} accentColor="#f59e0b" />

          {/* Tipo de Cambio: ancho completo en móvil (fila propia), 1 col en desktop junto a tarjeta/mayor gasto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="col-span-2 lg:col-span-1 glass p-4 relative overflow-hidden hover:border-white/[0.12] transition-all duration-300 glow-cyan"
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
                      formatter={(value) => formatARS(Number(value ?? 0))}
                      contentStyle={{ background: '#151524', border: '1px solid #2d2d44', borderRadius: 8, fontSize: 12 }}
                      itemStyle={{ color: '#e2e8f0' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <ul className="flex-1 space-y-2">
                  {pieData.map((d, i) => (
                    <li key={i} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-400">{d.name}</span>
                      </span>
                      <span className="text-gray-200 font-medium">{formatARS(d.value)}</span>
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
