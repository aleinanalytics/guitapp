import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Pencil, Check, X, CreditCard, Calendar } from 'lucide-react'
import MobileUserMenu from '../components/MobileUserMenu'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useCuotas } from '../hooks/useCuotas'
import { formatARS, formatMontoFromNumber, montoFieldNextValue, parseMontoInput } from '../lib/utils'
import type { Categoria, Moneda, MedioPago, TipoTransaccion, Transaccion } from '../lib/types'

const TIPO_CONFIG: Record<TipoTransaccion, { label: string; color: string; bg: string; ring: string }> = {
  ingreso: { label: 'Ingreso', color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30' },
  gasto: { label: 'Gasto', color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/30' },
  suscripcion: { label: 'Suscripción', color: 'text-purple-400', bg: 'bg-purple-500/10', ring: 'ring-purple-500/30' },
}

const TIPO_ORDER_MOBILE: TipoTransaccion[] = ['gasto', 'ingreso', 'suscripcion']

const today = new Date().toISOString().split('T')[0]

type MedioPagoGastoFieldsProps = {
  medioPagoNivel1: 'efectivo' | 'plastico'
  setMedioPagoNivel1: (v: 'efectivo' | 'plastico') => void
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

function MedioPagoGastoFields({
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
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMedioPagoNivel1('efectivo')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${medioPagoNivel1 === 'efectivo' ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30' : 'bg-dark-800/50 text-gray-500 hover:text-gray-300'}`}
        >
          Efectivo
        </button>
        <button
          type="button"
          onClick={() => setMedioPagoNivel1('plastico')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${medioPagoNivel1 === 'plastico' ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30' : 'bg-dark-800/50 text-gray-500 hover:text-gray-300'}`}
        >
          <CreditCard size={14} />
          Tarjeta
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
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${plasticoTipo === 'debito' ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30' : 'bg-dark-800/50 text-gray-500 hover:text-gray-300'}`}
              >
                Débito
              </button>
              <button
                type="button"
                onClick={() => setPlasticoTipo('credito')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${plasticoTipo === 'credito' ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30' : 'bg-dark-800/50 text-gray-500 hover:text-gray-300'}`}
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

type MedioPagoSuscripcionFieldsProps = {
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

/** Suscripciones: solo tarjeta — débito (→ efectivo en BD) o crédito (→ tarjeta), con cuotas opcionales en crédito */
function MedioPagoSuscripcionFields({
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
}: MedioPagoSuscripcionFieldsProps) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Pago de la suscripción</label>
      <p className="text-[11px] text-gray-500 -mt-1 mb-1">Con tarjeta: débito o crédito</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPlasticoTipo('debito')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${plasticoTipo === 'debito' ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30' : 'bg-dark-800/50 text-gray-500 hover:text-gray-300'}`}
        >
          Débito
        </button>
        <button
          type="button"
          onClick={() => setPlasticoTipo('credito')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${plasticoTipo === 'credito' ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30' : 'bg-dark-800/50 text-gray-500 hover:text-gray-300'}`}
        >
          <CreditCard size={14} />
          Crédito
        </button>
      </div>

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

export default function Carga() {
  const { user } = useAuth()
  const { cuotas, insertCuota, deleteCuota } = useCuotas()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [recientes, setRecientes] = useState<Transaccion[]>([])

  // Form state
  const [fecha, setFecha] = useState(today)
  const [tipo, setTipo] = useState<TipoTransaccion>('gasto')
  const [categoriaId, setCategoriaId] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('ARS')
  /** efectivo = billete / efectivo; plastico = tarjeta (luego elige débito o crédito en BD) */
  const [medioPagoNivel1, setMedioPagoNivel1] = useState<'efectivo' | 'plastico'>('efectivo')
  const [plasticoTipo, setPlasticoTipo] = useState<'debito' | 'credito'>('debito')
  const [submitting, setSubmitting] = useState(false)

  /** When crédito selected, user can opt to pay in cuotas */
  const [enCuotas, setEnCuotas] = useState(false)
  const [numCuotas, setNumCuotas] = useState('')
  const [cuotaFechaInline, setCuotaFechaInline] = useState(today)

  const medioPagoDb: MedioPago =
    tipo === 'ingreso'
      ? 'efectivo'
      : tipo === 'suscripcion'
        ? plasticoTipo === 'debito'
          ? 'efectivo'
          : 'tarjeta'
        : medioPagoNivel1 === 'efectivo'
          ? 'efectivo'
          : plasticoTipo === 'debito'
            ? 'efectivo'
            : 'tarjeta'

  const esTarjetaCreditoGasto = tipo === 'gasto' && medioPagoNivel1 === 'plastico' && plasticoTipo === 'credito'
  const esTarjetaCreditoSuscripcion = tipo === 'suscripcion' && plasticoTipo === 'credito'

  // Cuotas form
  const [showCuotaForm, setShowCuotaForm] = useState(false)
  const [cuotaDesc, setCuotaDesc] = useState('')
  const [cuotaMontoTotal, setCuotaMontoTotal] = useState('')
  const [cuotasTotal, setCuotasTotal] = useState('')
  const [cuotaFecha, setCuotaFecha] = useState(today)
  const [cuotaMoneda, setCuotaMoneda] = useState<Moneda>('ARS')
  const [cuotaCatId, setCuotaCatId] = useState('')
  const [submittingCuota, setSubmittingCuota] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editMonto, setEditMonto] = useState('')
  const [editFecha, setEditFecha] = useState('')
  const [editCategoriaId, setEditCategoriaId] = useState('')

  useEffect(() => {
    supabase.from('categorias').select('*').then(({ data }) => {
      if (data) setCategorias(data as Categoria[])
    })
  }, [])

  const fetchRecientes = async () => {
    const now = new Date()
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const nextMonth = now.getMonth() + 1 === 12
      ? `${now.getFullYear() + 1}-01-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('transacciones')
      .select('*, categoria:categorias(*)')
      .gte('fecha', firstDay)
      .lt('fecha', nextMonth)
      .order('created_at', { ascending: false })
      .limit(15)
    if (data) setRecientes(data as Transaccion[])
  }

  useEffect(() => { fetchRecientes() }, [])
  const filteredCategorias = categorias.filter((c) => c.tipo === tipo)
  const gastoCategorias = categorias.filter((c) => c.tipo === 'gasto')
  useEffect(() => { setCategoriaId('') }, [tipo])
  useEffect(() => {
    setEnCuotas(false)
    setNumCuotas('')
  }, [tipo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const montoNum = parseMontoInput(monto)
    if (!fecha || !tipo || !categoriaId || !descripcion.trim() || !Number.isFinite(montoNum) || montoNum <= 0) return

    // Si crédito + cuotas (gasto o suscripción), insertar en compras_cuotas
    if ((esTarjetaCreditoGasto || esTarjetaCreditoSuscripcion) && enCuotas) {
      const nCuotas = parseInt(numCuotas)
      if (!nCuotas || nCuotas < 2) { window.alert('Ingresá al menos 2 cuotas'); return }
      setSubmitting(true)
      const ok = await insertCuota({
        descripcion: descripcion.trim(),
        monto_total: montoNum,
        cuotas_total: nCuotas,
        fecha_primera_cuota: cuotaFechaInline,
        moneda,
        categoria_id: categoriaId,
      })
      setSubmitting(false)
      if (ok) {
        window.alert('Cuotas registradas')
        setDescripcion(''); setMonto(''); setCategoriaId(''); setFecha(today); setMoneda('ARS')
        setMedioPagoNivel1('efectivo'); setPlasticoTipo('debito')
        setEnCuotas(false); setNumCuotas('')
        fetchRecientes()
      }
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('transacciones').insert({
      user_id: user!.id, fecha, tipo, categoria_id: categoriaId,
      descripcion: descripcion.trim(), monto: montoNum, moneda, medio_pago: medioPagoDb,
    })
    setSubmitting(false)
    if (error) { window.alert('Error: ' + error.message) }
    else {
      window.alert('Registrado')
      setDescripcion(''); setMonto(''); setCategoriaId(''); setFecha(today); setMoneda('ARS')
      setMedioPagoNivel1('efectivo'); setPlasticoTipo('debito')
      setEnCuotas(false); setNumCuotas('')
      fetchRecientes()
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta transacción?')) return
    const { error } = await supabase.from('transacciones').delete().eq('id', id)
    if (error) window.alert('Error: ' + error.message)
    else fetchRecientes()
  }

  const startEdit = (t: Transaccion) => {
    setEditingId(t.id)
    setEditDesc(t.descripcion)
    setEditMonto(formatMontoFromNumber(t.monto))
    setEditFecha(t.fecha)
    setEditCategoriaId(t.categoria_id ?? '')
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (id: string) => {
    const m = parseMontoInput(editMonto)
    if (!editDesc.trim() || !Number.isFinite(m) || m <= 0 || !editFecha || !editCategoriaId) return
    const { error } = await supabase.from('transacciones').update({
      descripcion: editDesc.trim(),
      monto: m,
      fecha: editFecha,
      categoria_id: editCategoriaId,
    }).eq('id', id)
    if (error) window.alert('Error: ' + error.message)
    else { setEditingId(null); fetchRecientes() }
  }

  const handleCuotaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const totalNum = parseMontoInput(cuotaMontoTotal)
    if (!cuotaDesc.trim() || !Number.isFinite(totalNum) || totalNum <= 0 || !cuotasTotal || !cuotaFecha || !cuotaCatId) return
    setSubmittingCuota(true)
    const ok = await insertCuota({
      descripcion: cuotaDesc.trim(), monto_total: totalNum,
      cuotas_total: parseInt(cuotasTotal), fecha_primera_cuota: cuotaFecha, moneda: cuotaMoneda, categoria_id: cuotaCatId,
    })
    setSubmittingCuota(false)
    if (ok) {
      window.alert('Cuotas registradas')
      setCuotaDesc(''); setCuotaMontoTotal(''); setCuotasTotal(''); setCuotaFecha(today); setCuotaCatId('')
      setShowCuotaForm(false)
    }
  }

  const cuotaPreviewNum = parseMontoInput(cuotaMontoTotal)
  const cuotaPreview = Number.isFinite(cuotaPreviewNum) && cuotasTotal && parseInt(cuotasTotal) >= 2
    ? Math.round((cuotaPreviewNum / parseInt(cuotasTotal, 10)) * 100) / 100
    : null

  const medioGastoProps: MedioPagoGastoFieldsProps = {
    medioPagoNivel1,
    setMedioPagoNivel1,
    plasticoTipo,
    setPlasticoTipo,
    esTarjetaCredito: esTarjetaCreditoGasto,
    enCuotas,
    setEnCuotas,
    numCuotas,
    setNumCuotas,
    cuotaFechaInline,
    setCuotaFechaInline,
    monto,
  }

  const medioSuscripcionProps: MedioPagoSuscripcionFieldsProps = {
    plasticoTipo,
    setPlasticoTipo,
    esTarjetaCredito: esTarjetaCreditoSuscripcion,
    enCuotas,
    setEnCuotas,
    numCuotas,
    setNumCuotas,
    cuotaFechaInline,
    setCuotaFechaInline,
    monto,
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-4 flex justify-end lg:hidden">
        <MobileUserMenu />
      </div>
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="hidden lg:block text-2xl lg:text-3xl font-bold text-gray-50 mb-6">
        Cargar Transacción
      </motion.h1>

      <div className="lg:grid lg:grid-cols-5 lg:gap-6">
        {/* Form column */}
        <div className="lg:col-span-2">
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onSubmit={handleSubmit} className="glass p-4 sm:p-5 mb-6">
            {/* Móvil: layout tipo app de referencia */}
            <div className="lg:hidden space-y-5">
              <h2 className="w-full text-center text-xl font-bold text-gray-50">Cargar</h2>

              <div className="flex rounded-2xl bg-dark-800/90 p-1 gap-0.5 ring-1 ring-white/[0.08]">
                {TIPO_ORDER_MOBILE.map((t) => {
                  const cfg = TIPO_CONFIG[t]
                  const active = tipo === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`flex-1 py-3 rounded-xl text-xs font-semibold transition-all duration-200 ${
                        active
                          ? 'bg-gray-100 text-dark-950 shadow-md'
                          : 'text-gray-500 hover:text-gray-400'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>

              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.2em] text-center mb-3">Cantidad</p>
                <div className="flex flex-wrap items-end justify-center gap-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={monto}
                    onChange={(e) => setMonto(montoFieldNextValue(monto, e.target.value))}
                    required
                    placeholder="0,00"
                    className="min-w-0 max-w-[11rem] sm:max-w-[14rem] bg-transparent border-0 text-center text-4xl sm:text-5xl font-bold text-gray-50 placeholder:text-gray-700 focus:ring-0 focus:outline-none"
                  />
                  <div className="flex rounded-xl bg-dark-800/90 p-0.5 gap-0.5 ring-1 ring-white/[0.06] shrink-0 mb-1">
                    {(['ARS', 'USD'] as Moneda[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMoneda(m)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                          moneda === m ? 'bg-gray-100 text-dark-950' : 'text-gray-500'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-dark-800/50 border border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">
                  <Calendar className="shrink-0" size={14} strokeWidth={2} />
                  Fecha
                </div>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="input-dark w-full min-w-0 bg-dark-900/40 border-white/[0.06]"
                />
              </div>

              <div>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">Categoría</p>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory [scrollbar-width:thin]">
                  {filteredCategorias.map((c) => {
                    const active = categoriaId === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoriaId(c.id)}
                        className={`flex flex-col items-center gap-1.5 shrink-0 w-[4.25rem] snap-start ${active ? 'scale-[1.02]' : ''}`}
                      >
                        <div
                          className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-bold ${
                            active ? 'ring-2 ring-accent-blue ring-offset-2 ring-offset-dark-950' : 'opacity-80'
                          }`}
                          style={{
                            borderColor: c.color,
                            backgroundColor: `${c.color}22`,
                            color: c.color,
                          }}
                        >
                          {c.nombre[0]}
                        </div>
                        <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2 w-full">{c.nombre}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">Descripción</label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Ej: compra semanal"
                  className="input-dark"
                />
              </div>

              {tipo === 'gasto' && <MedioPagoGastoFields {...medioGastoProps} />}
              {tipo === 'suscripcion' && <MedioPagoSuscripcionFields {...medioSuscripcionProps} />}

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-2xl py-3.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus size={18} />
                )}
                {submitting ? 'Guardando...' : 'Guardar movimiento'}
              </motion.button>
            </div>

            {/* Desktop */}
            <div className="hidden lg:block space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Tipo</label>
                <div className="flex gap-2">
                  {(['ingreso', 'gasto', 'suscripcion'] as TipoTransaccion[]).map((t) => {
                    const cfg = TIPO_CONFIG[t]; const active = tipo === t
                    return (
                      <button key={t} type="button" onClick={() => setTipo(t)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${active ? `${cfg.bg} ${cfg.color} ring-1 ${cfg.ring}` : 'bg-dark-800/50 text-gray-500 hover:text-gray-300'}`}>
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0 w-full max-w-full">
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Fecha</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                    className="input-dark block w-full min-w-0 max-w-full"
                  />
                </div>
                <div className="min-w-0 w-full max-w-full">
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Categoría</label>
                  <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required className="select-dark block w-full min-w-0 max-w-full">
                    <option value="">Seleccionar...</option>
                    {filteredCategorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Descripción</label>
                <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={100} required placeholder="Ej: Compra semanal" className="input-dark" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Monto</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={monto}
                    onChange={(e) => setMonto(montoFieldNextValue(monto, e.target.value))}
                    required
                    placeholder="0"
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Moneda</label>
                  <div className="flex gap-2 mt-0.5">
                    {(['ARS', 'USD'] as Moneda[]).map((m) => (
                      <button key={m} type="button" onClick={() => setMoneda(m)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${moneda === m ? 'bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/30' : 'bg-dark-800/50 text-gray-500 hover:text-gray-300'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {tipo === 'gasto' && <MedioPagoGastoFields {...medioGastoProps} />}
              {tipo === 'suscripcion' && <MedioPagoSuscripcionFields {...medioSuscripcionProps} />}

              <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2">
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={18} />}
                {submitting ? 'Guardando...' : 'Guardar'}
              </motion.button>
            </div>
          </motion.form>

          {/* Cuotas section */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
                <CreditCard size={18} className="text-rose-400" /> Compras en Cuotas
              </h2>
              <button onClick={() => setShowCuotaForm(!showCuotaForm)}
                className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors">
                {showCuotaForm ? 'Cancelar' : '+ Nueva'}
              </button>
            </div>

            <AnimatePresence>
              {showCuotaForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleCuotaSubmit} className="space-y-3 mb-4 pt-3 border-t border-white/[0.06]">
                  <input type="text" value={cuotaDesc} onChange={(e) => setCuotaDesc(e.target.value)}
                    placeholder="Descripción" required className="input-dark" />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={cuotaMontoTotal}
                      onChange={(e) => setCuotaMontoTotal(montoFieldNextValue(cuotaMontoTotal, e.target.value))}
                      placeholder="Monto total"
                      required
                      className="input-dark"
                    />
                    <input type="number" value={cuotasTotal} onChange={(e) => setCuotasTotal(e.target.value)}
                      placeholder="Nº cuotas" min="2" max="48" required className="input-dark" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={cuotaFecha} onChange={(e) => setCuotaFecha(e.target.value)}
                      required className="input-dark" />
                    <select value={cuotaCatId} onChange={(e) => setCuotaCatId(e.target.value)}
                      required className="select-dark w-full">
                      <option value="">Categoría...</option>
                      {gastoCategorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    {(['ARS', 'USD'] as Moneda[]).map((m) => (
                      <button key={m} type="button" onClick={() => setCuotaMoneda(m)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${cuotaMoneda === m ? 'bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/30' : 'bg-dark-800/50 text-gray-500'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                  {cuotaPreview && (
                    <p className="text-xs text-gray-400">Cuota mensual: {formatARS(cuotaPreview)}</p>
                  )}
                  <button type="submit" disabled={submittingCuota}
                    className="w-full bg-rose-500/20 text-rose-400 rounded-xl py-2.5 text-sm font-medium hover:bg-rose-500/30 disabled:opacity-40 transition-all">
                    {submittingCuota ? 'Guardando...' : 'Registrar cuotas'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {cuotas.length === 0 ? (
              <p className="text-gray-500 text-xs">Sin compras en cuotas activas.</p>
            ) : (
              <div className="space-y-2">
                {cuotas.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 text-sm group">
                    <div>
                      <p className="text-gray-300">{c.descripcion}</p>
                      <p className="text-xs text-gray-500">{c.cuotas_total} cuotas · {formatARS(c.monto_cuota)}/mes</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatARS(c.monto_total)}</span>
                      <button onClick={() => { if (window.confirm('¿Eliminar?')) deleteCuota(c.id) }}
                        className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Recent transactions column */}
        <div className="lg:col-span-3">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <h2 className="text-lg font-semibold text-gray-200 mb-3">Últimas transacciones</h2>
            {recientes.length === 0 ? (
              <div className="glass p-8 text-center">
                <p className="text-gray-500 text-sm">No hay transacciones este mes.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {recientes.map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.02 }}
                      className="glass-light p-3 flex items-center gap-3 group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-semibold shrink-0"
                        style={{ backgroundColor: (t.categoria?.color ?? '#6366f1') + '15', color: t.categoria?.color ?? '#6366f1' }}>
                        {t.categoria?.nombre?.[0] ?? '?'}
                      </div>

                      {editingId === t.id ? (
                        <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
                          <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                            className="input-dark !py-1 !text-sm flex-1 min-w-[min(100%,10rem)]" />
                          <select
                            value={editCategoriaId}
                            onChange={(e) => setEditCategoriaId(e.target.value)}
                            className="select-dark !py-1.5 !pl-2.5 !pr-8 !text-sm min-w-[9rem] flex-1 max-w-[13rem]"
                          >
                            <option value="">Categoría…</option>
                            {categorias.filter((c) => c.tipo === t.tipo).map((c) => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={editMonto}
                            onChange={(e) => setEditMonto(montoFieldNextValue(editMonto, e.target.value))}
                            className="input-dark !py-1 !text-sm min-w-[6.5rem] flex-1 max-w-[9rem]"
                          />
                          <input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)}
                            className="input-dark !py-1 !text-sm min-w-0 w-[9.5rem] sm:w-36 max-w-full" />
                          <button type="button" onClick={() => saveEdit(t.id)} className="text-emerald-400 hover:text-emerald-300 shrink-0"><Check size={16} /></button>
                          <button type="button" onClick={cancelEdit} className="text-red-400 hover:text-red-300 shrink-0"><X size={16} /></button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">
                              {t.descripcion}
                              {t.medio_pago === 'tarjeta' && (
                                <CreditCard size={12} className="inline ml-1.5 text-rose-400/60" />
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{t.categoria?.nombre ?? '—'} · {t.fecha}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-semibold ${t.tipo === 'ingreso' ? 'text-emerald-400' : 'text-gray-200'}`}>
                              {t.tipo === 'ingreso' ? '+' : '-'}{t.moneda === 'ARS' ? '$' : 'USD'} {t.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${TIPO_CONFIG[t.tipo].bg} ${TIPO_CONFIG[t.tipo].color}`}>
                              {t.tipo}
                            </span>
                          </div>
                          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => startEdit(t)} className="text-gray-600 hover:text-accent-blue transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(t.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
