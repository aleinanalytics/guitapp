import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import FormEditGuardarCancelar from './FormEditGuardarCancelar'
import { supabase } from '../lib/supabase'
import { formatARS, formatMontoFromNumber, formatUSD, montoFieldNextValue, parseMontoInput } from '../lib/utils'
import type { Categoria, CompraCuotas, Moneda } from '../lib/types'
import { principalesGastoOrdenadas, subcategoriasDe } from '../lib/categoriasJerarquia'

type Props = {
  compra: CompraCuotas
  /** Si se omite (p. ej. en Carga), el subtítulo muestra el plan completo (N cuotas · monto/mes). */
  cuotaNumero?: number
  delay?: number
  /** Todas las categorías `tipo === 'gasto'` (principales y sub). No usar solo `categoriasGastoElegibles`: el select arma optgroups con las principales. */
  gastoCategorias: Categoria[]
  onMutated: () => void
}

export default function EditableCuotaCompraRow({ compra, cuotaNumero, delay = 0, gastoCategorias, onMutated }: Props) {
  const [editing, setEditing] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editMontoTotal, setEditMontoTotal] = useState('')
  const [editCuotasTotal, setEditCuotasTotal] = useState('')
  const [editMoneda, setEditMoneda] = useState<Moneda>('ARS')
  const [editCategoriaId, setEditCategoriaId] = useState('')
  const [editFechaPrimera, setEditFechaPrimera] = useState('')
  const [busy, setBusy] = useState(false)

  const startEdit = () => {
    setEditDesc(compra.descripcion)
    setEditMontoTotal(formatMontoFromNumber(compra.monto_total))
    setEditCuotasTotal(String(compra.cuotas_total))
    setEditMoneda(compra.moneda)
    setEditCategoriaId(compra.categoria_id ?? '')
    setEditFechaPrimera(compra.fecha_primera_cuota.slice(0, 10))
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const save = async () => {
    const total = parseMontoInput(editMontoTotal)
    const nCuotas = parseInt(editCuotasTotal, 10)
    if (!editDesc.trim() || !Number.isFinite(total) || total <= 0 || !editCategoriaId || !editFechaPrimera) return
    if (!Number.isFinite(nCuotas) || nCuotas < 2 || nCuotas > 48) {
      window.alert('El número de cuotas debe estar entre 2 y 48.')
      return
    }
    const monto_cuota = Math.round((total / nCuotas) * 100) / 100
    setBusy(true)
    const { error } = await supabase.from('compras_cuotas').update({
      descripcion: editDesc.trim(),
      monto_total: total,
      cuotas_total: nCuotas,
      monto_cuota,
      moneda: editMoneda,
      categoria_id: editCategoriaId,
      fecha_primera_cuota: editFechaPrimera,
    }).eq('id', compra.id)
    setBusy(false)
    if (error) window.alert('Error: ' + error.message)
    else {
      setEditing(false)
      onMutated()
    }
  }

  const remove = async () => {
    if (!window.confirm('¿Eliminar toda la compra en cuotas? Se borran todas las cuotas pendientes.')) return
    setBusy(true)
    const { error } = await supabase.from('compras_cuotas').delete().eq('id', compra.id)
    setBusy(false)
    if (error) window.alert('Error: ' + error.message)
    else {
      setEditing(false)
      onMutated()
    }
  }

  if (editing) {
    return (
      <motion.li
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay }}
        className="glass-light p-3 flex flex-col gap-2"
      >
        <p className="text-[10px] text-gray-500">
          {cuotaNumero != null
            ? `Cuota ${cuotaNumero} de ${compra.cuotas_total} · ajustás la compra completa`
            : 'Ajustá descripción, cuotas, montos y fecha de la primera cuota'}
        </p>
        <input
          type="text"
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
          className="input-dark !py-1.5 !text-sm w-full"
          maxLength={100}
        />
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">Primera cuota (mes en que arranca el plan; puede ser pasado)</label>
          <input
            type="date"
            value={editFechaPrimera}
            onChange={(e) => setEditFechaPrimera(e.target.value)}
            className="input-dark !py-1.5 !text-sm w-full max-w-full"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={editCategoriaId}
            onChange={(e) => setEditCategoriaId(e.target.value)}
            className="select-dark !py-1.5 !text-sm flex-1 min-w-[9rem]"
          >
            <option value="">Categoría…</option>
            {gastoCategorias.some((c) => c.tipo === 'gasto' && !!c.parent_id) ? (
              <>
                {principalesGastoOrdenadas(gastoCategorias).map((p) => (
                  <optgroup key={p.id} label={p.nombre}>
                    {subcategoriasDe(p.id, gastoCategorias).map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </optgroup>
                ))}
                {gastoCategorias
                  .filter(
                    (c) =>
                      c.tipo === 'gasto' &&
                      !c.parent_id &&
                      !gastoCategorias.some((s) => s.parent_id === c.id),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
              </>
            ) : (
              gastoCategorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))
            )}
          </select>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={editMontoTotal}
            onChange={(e) => setEditMontoTotal(montoFieldNextValue(editMontoTotal, e.target.value))}
            placeholder="Monto total"
            className="input-dark !py-1.5 !text-sm min-w-[6.5rem] flex-1 max-w-[11rem]"
          />
          <input
            type="number"
            min={2}
            max={48}
            value={editCuotasTotal}
            onChange={(e) => setEditCuotasTotal(e.target.value)}
            placeholder="Nº cuotas"
            className="input-dark !py-1.5 !text-sm w-[5.5rem]"
          />
        </div>
        <div className="flex gap-2">
          {(['ARS', 'USD'] as Moneda[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setEditMoneda(m)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                editMoneda === m ? 'bg-accent-blue/10 text-accent-blue ring-1 ring-accent-blue/30' : 'bg-dark-800/50 text-gray-500'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <FormEditGuardarCancelar busy={busy} onCancel={cancelEdit} onSave={save} />
      </motion.li>
    )
  }

  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="glass-light p-3 flex items-center justify-between gap-3 group"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-200 truncate">{compra.descripcion}</p>
        <p className="text-xs text-gray-500">
          {cuotaNumero != null ? (
            <>
              Cuota {cuotaNumero} de {compra.cuotas_total}
              {compra.categoria?.nombre && ` · ${compra.categoria.nombre}`}
            </>
          ) : (
            <>
              {compra.cuotas_total} cuotas ·{' '}
              {compra.moneda === 'ARS' ? formatARS(compra.monto_cuota) : formatUSD(compra.monto_cuota)}/mes
              {compra.categoria?.nombre && ` · ${compra.categoria.nombre}`}
            </>
          )}
        </p>
      </div>
      <div className="text-right shrink-0 flex items-center gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-100">
            {cuotaNumero != null
              ? compra.moneda === 'ARS'
                ? formatARS(compra.monto_cuota)
                : formatUSD(compra.monto_cuota)
              : compra.moneda === 'ARS'
                ? formatARS(compra.monto_total)
                : formatUSD(compra.monto_total)}
          </p>
          <p className="text-[10px] text-gray-500">{cuotaNumero != null ? compra.moneda : 'total'}</p>
        </div>
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={startEdit} className="text-gray-500 hover:text-accent-blue p-1" aria-label="Editar compra">
            <Pencil size={15} />
          </button>
          <button type="button" onClick={remove} disabled={busy} className="text-gray-500 hover:text-red-400 p-1 disabled:opacity-40" aria-label="Eliminar compra">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </motion.li>
  )
}
