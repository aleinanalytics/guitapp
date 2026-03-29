import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, PiggyBank, Plus, Minus, Shield } from 'lucide-react'
import { useBolsillos } from '../hooks/useBolsillos'
import { useGastoFijoMensualPromedio, CATEGORIAS_GASTO_FIJO } from '../hooks/useGastoFijoMensualPromedio'
import { formatARS, parseMontoInput, formatMontoFromNumber } from '../lib/utils'
import type { BolsilloTipo } from '../lib/types'

type Props = {
  tipo: BolsilloTipo
  titulo: string
}

export default function BolsilloDetalle({ tipo, titulo }: Props) {
  const {
    movimientos,
    configs,
    loading,
    disponible,
    saldo,
    registrarMovimiento,
    upsertConfig,
  } = useBolsillos()

  const { promedioMensual, loading: loadingPromedio } = useGastoFijoMensualPromedio()

  const s = saldo(tipo)
  const cfg = configs[tipo]
  const objetivo = cfg?.objetivo_monto ?? null
  const mesesSugerencia = cfg?.meses_sugerencia ?? 3

  const [montoDeposito, setMontoDeposito] = useState('')
  const [montoRetiro, setMontoRetiro] = useState('')
  const [objetivoInput, setObjetivoInput] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pctObjetivo =
    objetivo != null && objetivo > 0 ? Math.min(100, Math.round((s / objetivo) * 1000) / 10) : null

  const sugeridoObjetivo = Math.round(promedioMensual * mesesSugerencia)

  useEffect(() => {
    if (loading) return
    if (objetivo != null && objetivo > 0) setObjetivoInput(formatMontoFromNumber(objetivo))
    else setObjetivoInput('')
  }, [loading, objetivo])

  const recientes = useMemo(
    () => movimientos.filter((m) => m.tipo === tipo).slice(0, 12),
    [movimientos, tipo]
  )

  const handleDeposito = async () => {
    setMsg(null)
    const amt = parseMontoInput(montoDeposito)
    if (!Number.isFinite(amt) || amt <= 0) {
      setMsg('Ingresá un monto válido')
      return
    }
    if (amt > disponible + 1e-6) {
      setMsg('No tenés tanto disponible para asignar (según tu historial de movimientos).')
      return
    }
    setBusy(true)
    const { error } = await registrarMovimiento(tipo, amt)
    setBusy(false)
    if (error) setMsg(error)
    else setMontoDeposito('')
  }

  const handleRetiro = async () => {
    setMsg(null)
    const amt = parseMontoInput(montoRetiro)
    if (!Number.isFinite(amt) || amt <= 0) {
      setMsg('Ingresá un monto válido')
      return
    }
    if (amt > s + 1e-6) {
      setMsg('No podés retirar más de lo que hay en este bolsillo.')
      return
    }
    setBusy(true)
    const { error } = await registrarMovimiento(tipo, -amt)
    setBusy(false)
    if (error) setMsg(error)
    else setMontoRetiro('')
  }

  const handleGuardarObjetivo = async () => {
    setMsg(null)
    const raw = objetivoInput.trim()
    if (!raw) {
      setBusy(true)
      const { error } = await upsertConfig(tipo, { objetivo_monto: null })
      setBusy(false)
      if (error) setMsg(error)
      return
    }
    const amt = parseMontoInput(raw)
    if (!Number.isFinite(amt) || amt < 0) {
      setMsg('Objetivo inválido')
      return
    }
    setBusy(true)
    const { error } = await upsertConfig(tipo, { objetivo_monto: amt })
    setBusy(false)
    if (error) setMsg(error)
  }

  const handleQuitarObjetivo = async () => {
    setBusy(true)
    const { error } = await upsertConfig(tipo, { objetivo_monto: null })
    setBusy(false)
    if (error) setMsg(error)
    else {
      setObjetivoInput('')
      setMsg(null)
    }
  }

  const handleAplicarSugerido = async () => {
    setMsg(null)
    setBusy(true)
    const { error } = await upsertConfig('emergencia', { objetivo_monto: sugeridoObjetivo })
    setBusy(false)
    if (error) setMsg(error)
    else setObjetivoInput(formatMontoFromNumber(sugeridoObjetivo))
  }

  const handleMeses = async (n: number) => {
    if (tipo !== 'emergencia') return
    setBusy(true)
    const { error } = await upsertConfig('emergencia', { meses_sugerencia: n })
    setBusy(false)
    if (error) setMsg(error)
  }

  return (
    <div className="p-4 lg:p-8 max-w-lg mx-auto">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Volver al inicio
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-5 rounded-2xl border border-white/[0.06]"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            {tipo === 'emergencia' ? <Shield size={22} /> : <PiggyBank size={22} />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-50">{titulo}</h1>
            <p className="text-xs text-gray-500 mt-1">
              Asigná o retirá dinero sin registrar gastos: solo movés fondos a tu reserva.
            </p>
            {tipo === 'ahorro' && (
              <p className="text-[11px] text-cyan-500/70 mt-2 leading-snug">
                Objetivos: definí una meta en pesos y seguí el progreso desde este bolsillo.
              </p>
            )}
          </div>
        </div>

        {tipo === 'emergencia' && (
          <div className="mb-5 rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2.5 text-[11px] text-sky-200/85 leading-relaxed">
            Se recomienda un fondo de al menos <strong className="text-sky-100">3 o 6 meses</strong> de gastos
            fijos. Podés usar la sugerencia (promedio de tus gastos en {CATEGORIAS_GASTO_FIJO.join(', ')}) y
            ajustar el objetivo cuando quieras.
          </div>
        )}

        {tipo === 'emergencia' && (
          <div className="mb-5 space-y-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Meses para el cálculo</p>
            <div className="flex rounded-xl bg-dark-800/90 p-0.5 gap-0.5 ring-1 ring-white/[0.06]">
              {[3, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy}
                  onClick={() => handleMeses(n)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                    mesesSugerencia === n
                      ? 'bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/30'
                      : 'bg-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  ×{n} meses
                </button>
              ))}
            </div>
            <div className="rounded-xl bg-white/[0.03] px-3 py-2.5 text-xs text-gray-400 space-y-1">
              <p>
                Promedio mensual estimado (gastos fijos, últimos 3 meses):{' '}
                {loadingPromedio ? '…' : <span className="text-gray-200">{formatARS(promedioMensual)}</span>}
              </p>
              <p>
                Objetivo sugerido (×{mesesSugerencia}):{' '}
                <span className="text-emerald-300/90 font-medium">{formatARS(sugeridoObjetivo)}</span>
              </p>
              <button
                type="button"
                disabled={busy || loadingPromedio}
                onClick={handleAplicarSugerido}
                className="mt-2 w-full py-2 rounded-xl text-sm font-medium bg-cyan-600/25 text-cyan-200 hover:bg-cyan-600/35 transition-colors disabled:opacity-40"
              >
                Usar objetivo sugerido
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 mb-5">
              <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">En este bolsillo</p>
                <p className="text-2xl font-bold text-gray-50 mt-0.5">{formatARS(s)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-gray-500">Disponible para asignar</p>
                <p className={`text-lg font-semibold mt-0.5 ${disponible >= 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                  {formatARS(disponible)}
                </p>
                <p className="text-[10px] text-gray-600 mt-1 leading-snug">
                  Estimado con todo tu historial de ingresos, gastos y suscripciones, menos lo ya asignado a
                  Ahorros y Fondo de emergencia. No incluye deudas de tarjeta futuras.
                </p>
              </div>
            </div>

            {objetivo != null && objetivo > 0 && pctObjetivo !== null && (
              <div className="mb-5">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progreso del objetivo</span>
                  <span>{pctObjetivo}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-cyan-500 transition-all duration-500"
                    style={{ width: `${pctObjetivo}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Meta: {formatARS(objetivo)}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Objetivo</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej. 500.000"
                  value={objetivoInput}
                  onChange={(e) => setObjetivoInput(e.target.value)}
                  className="input-dark flex-1"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleGuardarObjetivo}
                  className="whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/30 hover:bg-accent-blue/15 transition-colors disabled:opacity-50"
                >
                  Guardar meta
                </button>
              </div>
              <button
                type="button"
                disabled={busy || (objetivo == null && !objetivoInput.trim())}
                onClick={handleQuitarObjetivo}
                className="text-xs text-gray-500 hover:text-gray-400 disabled:opacity-40"
              >
                Quitar objetivo
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-white/[0.06] p-4">
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-2">
                  <Plus size={14} className="text-emerald-400" />
                  Asignar desde disponible
                </p>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Monto ARS"
                  value={montoDeposito}
                  onChange={(e) => setMontoDeposito(e.target.value)}
                  className="input-dark w-full mb-2"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDeposito}
                  className="w-full py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Asignar
                </button>
              </div>
              <div className="rounded-xl border border-white/[0.06] p-4">
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-2">
                  <Minus size={14} className="text-amber-400" />
                  Volver a disponible
                </p>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Monto ARS"
                  value={montoRetiro}
                  onChange={(e) => setMontoRetiro(e.target.value)}
                  className="input-dark w-full mb-2"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRetiro}
                  className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-gray-100 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Retirar
                </button>
              </div>
            </div>

            {msg && <p className="text-sm text-rose-400 mb-4">{msg}</p>}

            {recientes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Últimos movimientos</p>
                <ul className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                  {recientes.map((m) => (
                    <li
                      key={m.id}
                      className="flex justify-between gap-2 text-gray-400 border-b border-white/[0.04] pb-1.5"
                    >
                      <span className={m.monto >= 0 ? 'text-emerald-400/90' : 'text-amber-300/90'}>
                        {m.monto >= 0 ? '+' : '−'}
                        {formatARS(Math.abs(m.monto))}
                      </span>
                      <span className="text-gray-600 shrink-0">
                        {new Date(m.created_at).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
