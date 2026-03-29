import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, LineChart } from 'lucide-react'

export default function Inversiones() {
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
        className="glass p-6 rounded-2xl border border-white/[0.06] text-center"
      >
        <div className="inline-flex p-3 rounded-xl bg-violet-500/10 text-violet-400 mb-4">
          <LineChart size={28} />
        </div>
        <h1 className="text-xl font-bold text-gray-50 mb-2">Inversiones</h1>
        <p className="text-sm text-amber-400/90 font-medium mb-3">En desarrollo</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Pronto vas a poder registrar y seguir inversiones desde acá. Por ahora usá Ahorros y Fondo de emergencia
          para apartar dinero sin contarlo como gasto.
        </p>
      </motion.div>
    </div>
  )
}
