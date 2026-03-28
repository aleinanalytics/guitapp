import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Pencil, Check, X, CreditCard } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useCuotas } from '../hooks/useCuotas'
import { formatARS } from '../lib/utils'
import type { Categoria, Moneda, MedioPago, TipoTransaccion, Transaccion } from '../lib/types'

const TIPO_CONFIG: Record<TipoTransaccion, { label: string; color: string; bg: string; ring: string }> = {
  ingreso: { label: 'Ingreso', color: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'ring-emerald-500/30' },
  gasto: { label: 'Gasto', color: 'text-red-400', bg: 'bg-red-500/10', ring: 'ring-red-500/30' },
  suscripcion: { label: 'Suscripción', color: 'text-purple-400', bg: 'bg-purple-500/10', ring: 'ring-purple-500/30' },
}

const today = new Date().toISOString().split('T')[0]

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
  const [medioPago, setMedioPago] = useState<MedioPago>('efectivo')
  const [submitting, setSubmitting] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fecha || !tipo || !categoriaId || !descripcion.trim() || !monto) return
    setSubmitting(true)
    const { error } = await supabase.from('transacciones').insert({
      user_id: user!.id, fecha, tipo, categoria_id: categoriaId,
      descripcion: descripcion.trim(), monto: parseFloat(monto), moneda, medio_pago: medioPago,
    })
    setSubmitting(false)
    if (error) { window.alert('Error: ' + error.message) }
    else {
      window.alert('Registrado')
      setDescripcion(''); setMonto(''); setCategoriaId(''); setFecha(today); setMoneda('ARS'); setMedioPago('efectivo')
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
    setEditingId(t.id); setEditDesc(t.descripcion); setEditMonto(String(t.monto)); setEditFecha(t.fecha)
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (id: string) => {
    if (!editDesc.trim() || !editMonto || !editFecha) return
    const { error } = await supabase.from('transacciones').update({
      descripcion: editDesc.trim(), monto: parseFloat(editMonto), fecha: editFecha,
    }).eq('id', id)
    if (error) window.alert('Error: ' + error.message)
    else { setEditingId(null); fetchRecientes() }
  }

  const handleCuotaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cuotaDesc.trim() || !cuotaMontoTotal || !cuotasTotal || !cuotaFecha || !cuotaCatId) return
    setSubmittingCuota(true)
    const ok = await insertCuota({
      descripcion: cuotaDesc.trim(), monto_total: parseFloat(cuotaMontoTotal),
      cuotas_total: parseInt(cuotasTotal), fecha_primera_cuota: cuotaFecha, moneda: cuotaMoneda, categoria_id: cuotaCatId,
    })
    setSubmittingCuota(false)
    if (ok) {
      window.alert('Cuotas registradas')
      setCuotaDesc(''); setCuotaMontoTotal(''); setCuotasTotal(''); setCuotaFecha(today); setCuotaCatId('')
      setShowCuotaForm(false)
    }
  }

  const cuotaPreview = cuotaMontoTotal && cuotasTotal && parseInt(cuotasTotal) >= 2
    ? Math.round((parseFloat(cuotaMontoTotal) / parseInt(cuotasTotal)) * 100) / 100
    : null

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="text-2xl lg:text-3xl font-bold text-gray-50 mb-6">
        Cargar Transacción
      </motion.h1>

      <div className="lg:grid lg:grid-cols-5 lg:gap-6">
        {/* Form column */}
        <div className="lg:col-span-2">
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            onSubmit={handleSubmit} className="glass p-5 space-y-4 mb-6">
            {/* Tipo */}
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className="input-dark min-w-0" />
              </div>
              <div className="min-w-0">
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Categoría</label>
                <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required className="select-dark w-full min-w-0 max-w-full">
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
                <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)}
                  min="0.01" step="0.01" required placeholder="0.00" className="input-dark" />
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

            {/* Medio de pago */}
            {tipo === 'gasto' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Medio de pago</label>
                <div className="flex gap-2">
                  {([['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta']] as [MedioPago, string][]).map(([v, label]) => (
                    <button key={v} type="button" onClick={() => setMedioPago(v)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${medioPago === v ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30' : 'bg-dark-800/50 text-gray-500 hover:text-gray-300'}`}>
                      {v === 'tarjeta' && <CreditCard size={14} />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full bg-gradient-to-r from-accent-blue to-accent-purple text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-all duration-200 flex items-center justify-center gap-2">
              {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={18} />}
              {submitting ? 'Guardando...' : 'Guardar'}
            </motion.button>
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
                    <input type="number" value={cuotaMontoTotal} onChange={(e) => setCuotaMontoTotal(e.target.value)}
                      placeholder="Monto total" min="1" step="0.01" required className="input-dark" />
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
                        <div className="flex-1 flex flex-wrap items-center gap-2">
                          <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                            className="input-dark !py-1 !text-sm flex-1 min-w-[120px]" />
                          <input type="number" value={editMonto} onChange={(e) => setEditMonto(e.target.value)}
                            className="input-dark !py-1 !text-sm w-24" min="0.01" step="0.01" />
                          <input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)}
                            className="input-dark !py-1 !text-sm w-36" />
                          <button onClick={() => saveEdit(t.id)} className="text-emerald-400 hover:text-emerald-300"><Check size={16} /></button>
                          <button onClick={cancelEdit} className="text-red-400 hover:text-red-300"><X size={16} /></button>
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
