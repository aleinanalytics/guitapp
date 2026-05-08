import { motion, AnimatePresence } from 'framer-motion'
import { CreditCard, ArrowLeftRight, CircleDollarSign } from 'lucide-react'
import { formatARS, parseMontoInput } from '../lib/utils'

export type MedioPagoGastoNivel = 'efectivo' | 'transferencia' | 'plastico'

export type MedioPagoGastoFieldsProps = {
  medioPagoNivel1: MedioPagoGastoNivel
  setMedioPagoNivel1: (v: MedioPagoGastoNivel) => void
  plasticoTipo: 'debito' | 'credito'
  setPlasticoTipo: (v: 'debito' | 'credito') => void
  esTarjetaCredito: boolean
  enCuotas: boolean
  setEnCuotas: (v: boolean) => void
  numCuotas: string
  setNumCuotas: (v: string) => void
  cuotaFechaInline: string
  setCuotaFechaInline: (v: string) => void
  monto: string
}

export default function MedioPagoGastoFields({
  medioPagoNivel1,
  setMedioPagoNivel1,
  plasticoTipo,
  setPlasticoTipo,
  esTarjetaCredito,
  enCuotas,
  setEnCuotas,
  numCuotas,
  setNumCuotas,
  cuotaFechaInline,
  setCuotaFechaInline,
  monto,
}: MedioPagoGastoFieldsProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Medio de pago</label>
      <div className="flex min-w-0 gap-1.5">
        <button
          type="button"
          onClick={() => setMedioPagoNivel1('efectivo')}
          className={`min-w-0 flex-1 shrink flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-0.5 text-[10px] font-semibold leading-tight transition-all duration-200 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-xs ${medioPagoNivel1 === 'efectivo' ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30' : 'bg-surface-container-low text-gray-500 hover:text-gray-300'}`}
        >
          <CircleDollarSign size={15} className="shrink-0 opacity-95" strokeWidth={2.25} aria-hidden />
          <span className="text-center">Efectivo</span>
        </button>
        <button
          type="button"
          onClick={() => setMedioPagoNivel1('transferencia')}
          className={`min-w-0 flex-1 shrink flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-0.5 text-[10px] font-semibold leading-tight transition-all duration-200 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-xs ${medioPagoNivel1 === 'transferencia' ? 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30' : 'bg-surface-container-low text-gray-500 hover:text-gray-300'}`}
        >
          <ArrowLeftRight size={15} className="shrink-0 opacity-95" strokeWidth={2.25} aria-hidden />
          <span className="text-center">Transferencia</span>
        </button>
        <button
          type="button"
          onClick={() => setMedioPagoNivel1('plastico')}
          className={`min-w-0 flex-1 shrink flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 px-0.5 text-[10px] font-semibold leading-tight transition-all duration-200 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-xs sm:text-sm ${medioPagoNivel1 === 'plastico' ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30' : 'bg-surface-container-low text-gray-500 hover:text-gray-300'}`}
        >
          <CreditCard size={15} className="shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="text-center">Tarjeta</span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {medioPagoNivel1 === 'plastico' && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pt-1 pb-1 space-y-2"
          >
            <p className="text-[11px] text-gray-500 pl-0.5">Tipo de tarjeta</p>
            <div className="flex gap-2 pb-0.5">
              <button
                type="button"
                onClick={() => setPlasticoTipo('debito')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${plasticoTipo === 'debito' ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30' : 'bg-surface-container-low text-gray-500 hover:text-gray-300'}`}
              >
                Débito
              </button>
              <button
                type="button"
                onClick={() => setPlasticoTipo('credito')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${plasticoTipo === 'credito' ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30' : 'bg-surface-container-low text-gray-500 hover:text-gray-300'}`}
              >
                <CreditCard size={14} />
                Crédito
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {esTarjetaCredito && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="space-y-2"
          >
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enCuotas}
                  onChange={(e) => setEnCuotas(e.target.checked)}
                  className="accent-rose-500 w-4 h-4"
                />
                <span className="text-xs text-gray-400">Pagar en cuotas</span>
              </label>
            </div>
            <AnimatePresence initial={false}>
              {enCuotas && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Nº cuotas</label>
                      <input
                        type="number"
                        min="2"
                        max="48"
                        value={numCuotas}
                        onChange={(e) => setNumCuotas(e.target.value)}
                        placeholder="Ej: 6"
                        className="input-dark !py-1.5 !text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1">Primera cuota</label>
                      <input
                        type="date"
                        value={cuotaFechaInline}
                        onChange={(e) => setCuotaFechaInline(e.target.value)}
                        className="input-dark !py-1.5 !text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 leading-snug">
                    Podés usar una fecha pasada si la compra ya venía en cuotas antes de usar la app.
                  </p>
                  {(() => {
                    const montoNum = parseMontoInput(monto)
                    const nC = parseInt(numCuotas)
                    if (Number.isFinite(montoNum) && montoNum > 0 && nC >= 2) {
                      const cuotaMensual = Math.round((montoNum / nC) * 100) / 100
                      return (
                        <p className="text-xs text-rose-400/80 bg-rose-500/10 px-2 py-1.5 rounded-lg">
                          {nC} cuotas de {formatARS(cuotaMensual)}
                        </p>
                      )
                    }
                    return null
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
