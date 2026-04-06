import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import NavBar from './components/NavBar'
import Dashboard from './pages/Dashboard'
import MovimientosMes from './pages/MovimientosMes'
import TarjetaCreditoMes from './pages/TarjetaCreditoMes'
import Carga from './pages/Carga'
import Analisis from './pages/Analisis'
import Ahorros from './pages/Ahorros'
import FondoEmergencia from './pages/FondoEmergencia'
import Inversiones from './pages/Inversiones'
import Presupuesto from './pages/Presupuesto'
import Login from './pages/Login'
import FeedbackButton from './components/FeedbackButton'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <>
      <NavBar />
      {/* pb-20 on mobile for bottom nav, lg:pl-64 for sidebar */}
      <main className="min-h-screen pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))] lg:pb-4 lg:pl-64 lg:pt-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/movimientos" element={<MovimientosMes />} />
          <Route path="/tarjeta-credito" element={<TarjetaCreditoMes />} />
          <Route path="/carga" element={<Carga />} />
          <Route path="/analisis" element={<Analisis />} />
          <Route path="/ahorros" element={<Ahorros />} />
          <Route path="/fondo-emergencia" element={<FondoEmergencia />} />
          <Route path="/inversiones" element={<Inversiones />} />
          <Route path="/presupuesto" element={<Presupuesto />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <FeedbackButton />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
