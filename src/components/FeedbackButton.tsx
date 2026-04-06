import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

type TipoFeedback = 'fallo' | 'funcion' | 'categoria' | 'otro'

const TIPOS: { value: TipoFeedback; label: string; icon: string }[] = [
  { value: 'fallo', label: 'Reportar fallo', icon: 'bug_report' },
  { value: 'funcion', label: 'Nueva función', icon: 'add_circle' },
  { value: 'categoria', label: 'Nueva categoría', icon: 'label' },
  { value: 'otro', label: 'Otro', icon: 'chat_bubble' },
]

export default function FeedbackButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<TipoFeedback>('fallo')
  const [mensaje, setMensaje] = useState('')
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setOpen(true)
    setEnviado(false)
    setError(null)
  }

  function handleClose() {
    if (enviando) return
    setOpen(false)
    setMensaje('')
    setEmail('')
    setTipo('fallo')
    setEnviado(false)
    setError(null)
  }

  async function handleEnviar() {
    if (!mensaje.trim()) {
      setError('Escribí tu mensaje antes de enviar.')
      return
    }
    setEnviando(true)
    setError(null)

    const { error: sbError } = await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      tipo,
      mensaje: mensaje.trim(),
      email: email.trim() || null,
    })

    setEnviando(false)
    if (sbError) {
      setError('No se pudo enviar. Intentá de nuevo.')
    } else {
      setEnviado(true)
      setMensaje('')
      setEmail('')
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <motion.button
        onClick={handleOpen}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-4 z-50 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-lg lg:bottom-6 lg:right-6"
        style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#0a0a0f',
          boxShadow: '0 4px 24px rgba(245,158,11,0.35)',
        }}
        aria-label="Dar feedback"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>campaign</span>
        <span className="hidden sm:inline">Feedback</span>
      </motion.button>

      {/* Overlay + Modal */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2"
            >
              <div
                className="glass-card rounded-t-3xl sm:rounded-3xl p-6 flex flex-col gap-4"
                style={{ border: '1px solid rgba(245,158,11,0.2)' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: 'rgba(245,158,11,0.15)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#f59e0b' }}>campaign</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-50 text-base leading-tight">Danos tu feedback!</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                        Podés reportar errores, proponer mejoras o sugerir categorías y funciones nuevas. Revisamos el feedback para priorizar cambios.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label="Cerrar"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
                  </button>
                </div>

                {enviado ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-3 py-6"
                  >
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-full"
                      style={{ background: 'rgba(34,197,94,0.15)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#22c55e' }}>check_circle</span>
                    </div>
                    <p className="text-gray-50 font-semibold text-center">¡Gracias por tu feedback!</p>
                    <p className="text-gray-400 text-sm text-center">Lo vamos a revisar y tener en cuenta.</p>
                    <button
                      onClick={handleClose}
                      className="mt-2 rounded-xl px-5 py-2 text-sm font-semibold transition-all"
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                    >
                      Cerrar
                    </button>
                  </motion.div>
                ) : (
                  <>
                    {/* Tipo */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {TIPOS.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTipo(t.value)}
                          className="flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition-all"
                          style={{
                            background: tipo === t.value ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
                            border: tipo === t.value ? '1px solid rgba(245,158,11,0.5)' : '1px solid rgba(255,255,255,0.06)',
                            color: tipo === t.value ? '#f59e0b' : '#918fa1',
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{t.icon}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Mensaje */}
                    <textarea
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      placeholder="Describí el fallo, función o categoría que querés..."
                      rows={4}
                      className="input-dark resize-none rounded-xl text-sm text-center !py-6 leading-relaxed placeholder:text-center"
                      style={{ minHeight: 96 }}
                    />

                    {/* Email */}
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Tu email (opcional) para notificarte cuando se agregue"
                      className="input-dark rounded-xl text-sm text-center placeholder:text-center"
                    />

                    {error && (
                      <p className="text-xs text-red-400">{error}</p>
                    )}

                    {/* Botón enviar */}
                    <button
                      onClick={handleEnviar}
                      disabled={enviando}
                      className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 disabled:opacity-60"
                      style={{
                        background: enviando ? 'rgba(245,158,11,0.4)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#0a0a0f',
                      }}
                    >
                      {enviando ? (
                        <>
                          <div className="h-4 w-4 rounded-full border-2 border-black/30 border-t-black/80 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
                          Enviar feedback
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
