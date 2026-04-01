import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'

type Modo = 'login' | 'registro'

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const [modo, setModo] = useState<Modo>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const resetMensajes = () => {
    setError(null)
    setInfo(null)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMensajes()
    if (!email.trim()) {
      setError('Ingresá tu correo.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (modo === 'registro' && password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setEnviando(true)
    try {
      if (modo === 'login') {
        const { error: err } = await signInWithEmail(email, password)
        if (err) setError(err)
      } else {
        const { error: err, needsEmailConfirmation } = await signUpWithEmail(email, password)
        if (err) {
          setError(err)
        } else if (needsEmailConfirmation) {
          setInfo('Te enviamos un enlace a tu correo para confirmar la cuenta. Después podés iniciar sesión.')
          setPassword('')
          setConfirmar('')
        } else {
          setInfo('Cuenta creada. Ya podés usar la app.')
        }
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-background" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.07] rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-accent-purple/[0.05] rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="glass p-8 w-full max-w-md text-center relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-16 h-16 mx-auto mb-6 rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-lg"
        >
          <img src="/apple-touch-icon.png" alt="GuitaApp" className="w-full h-full object-cover" width={64} height={64} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-400 bg-clip-text text-transparent mb-2"
        >
          GuitaApp
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-500 text-sm mb-6"
        >
          Controlá tus finanzas personales
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3.5 text-sm font-medium text-gray-200 hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Iniciar sesión con Google
        </motion.button>

        <div className="relative my-7">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-white/[0.08]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-dark-900/80 px-3 text-gray-500">o con correo electrónico</span>
          </div>
        </div>

        <div className="flex rounded-xl bg-surface-container-high/80 p-1 gap-1 ring-1 ring-white/[0.06] mb-5">
          <button
            type="button"
            onClick={() => {
              setModo('login')
              resetMensajes()
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              modo === 'login'
                ? 'bg-gray-100 text-dark-950 shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setModo('registro')
              resetMensajes()
            }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              modo === 'registro'
                ? 'bg-gray-100 text-dark-950 shadow-sm'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="text-left space-y-3">
          <div>
            <label htmlFor="login-email" className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Correo
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-dark w-full"
              placeholder="tu@correo.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-dark w-full"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <AnimatePresence>
            {modo === 'registro' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label
                  htmlFor="login-confirm"
                  className="block text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5"
                >
                  Repetir contraseña
                </label>
                <input
                  id="login-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  className="input-dark w-full"
                  placeholder="Igual que arriba"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key="err"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-rose-400/95 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2"
                role="alert"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          {info && (
            <p className="text-xs text-emerald-400/95 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2" role="status">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full mt-2 bg-primary-container text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {enviando ? 'Procesando…' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
