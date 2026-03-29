import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import NavBar from './components/NavBar'
import Dashboard from './pages/Dashboard'
import MovimientosMes from './pages/MovimientosMes'
import TarjetaCreditoMes from './pages/TarjetaCreditoMes'
import Carga from './pages/Carga'
import Analisis from './pages/Analisis'
import Login from './pages/Login'

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
      <main className="pb-[calc(8rem+env(safe-area-inset-bottom,0px))] lg:pb-4 lg:pl-64 min-h-screen">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/movimientos" element={<MovimientosMes />} />
          <Route path="/tarjeta-credito" element={<TarjetaCreditoMes />} />
          <Route path="/carga" element={<Carga />} />
          <Route path="/analisis" element={<Analisis />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
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
