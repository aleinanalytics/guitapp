import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pencil, Check, X, TrendingUp, TrendingDown, Wallet, CreditCard, RotateCcw, DollarSign, Zap } from 'lucide-react'
import KPICard from '../components/KPICard'
import { useTransacciones } from '../hooks/useTransacciones'
import { useTipoCambio } from '../hooks/useTipoCambio'
import { useCuotas, getCuotaForMonth } from '../hooks/useCuotas'
import { convertirARS, formatARS, formatUSD } from '../lib/utils'
import { useAuth } from '../lib/AuthContext'

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
          <KPICard titulo="Ingresos" montoARS={ingresos} montoUSD={ingresos / tc}
            icon={<TrendingUp size={18} />} accentColor="#10b981" glowClass="glow-green" delay={0} to={toIngresos} />
          <KPICard titulo="Gastos" montoARS={gastos} montoUSD={gastos / tc}
            icon={<TrendingDown size={18} />} accentColor="#ef4444" glowClass="glow-red" delay={0.05} to={toGastos} />
          <KPICard titulo="Suscripciones" montoARS={suscripciones} montoUSD={suscripciones / tc}
            icon={<RotateCcw size={18} />} accentColor="#a855f7" glowClass="glow-purple" delay={0.1} to={toSuscripciones} />
          <KPICard titulo="Balance" montoARS={balance} montoUSD={balance / tc}
            icon={<Wallet size={18} />}
            accentColor={balance >= 0 ? '#10b981' : '#ef4444'}
            glowClass={balance >= 0 ? 'glow-green' : 'glow-red'}
            delay={0.15}
            to={toBalance} />

          {/* Tarjeta de Crédito KPI — spans 2 cols on desktop */}
          <Link
            to={toTarjetaCredito}
            className="col-span-2 block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950"
            aria-label="Ver detalle de tarjeta de crédito"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="glass p-4 relative overflow-hidden cursor-pointer hover:border-white/[0.18] hover:bg-white/[0.02] transition-all duration-300"
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

          <KPICard titulo="Mayor Gasto" delay={0.25}
            montoARS={mayorGasto ? convertirARS(mayorGasto.monto, mayorGasto.moneda, tc) : 0}
            descripcion={mayorGasto?.descripcion} icon={<TrendingDown size={18} />} accentColor="#f59e0b" />

          {/* Tipo de Cambio Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="glass p-4 relative overflow-hidden hover:border-white/[0.12] transition-all duration-300 glow-cyan"
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
    </div>
  )
}
