import { NavLink } from 'react-router-dom'
import { BarChart2, Plus, TrendingUp, LogOut, Wallet, Briefcase } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

const sidebarLinks = [
  { to: '/', label: 'Dashboard', icon: BarChart2 },
  { to: '/analisis', label: 'Análisis', icon: TrendingUp },
  { to: '/carga', label: 'Cargar', icon: Plus },
  { to: '/presupuesto', label: 'Presupuesto', icon: Wallet },
  { to: '/inversiones', label: 'Inversiones', icon: Briefcase },
]

export default function NavBar() {
  const { signOut, user } = useAuth()
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? ''

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-dark-900/60 backdrop-blur-xl border-r border-white/[0.06] z-50">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <img
              src="/apple-touch-icon.png"
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
            />
            <span className="text-lg font-bold text-gray-100">GuitaApp</span>
          </div>

          <div className="space-y-1">
            {sidebarLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]'
                  }`
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xs font-bold text-white">
              {firstName?.[0] ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{firstName || 'Usuario'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 transition-colors w-full px-2 py-1.5"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Mobile: Inicio · Análisis · + · Presup. · Inversiones */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-dark-950 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-12px_48px_rgba(0,0,0,0.92)] lg:hidden">
        <div className="relative mx-auto max-w-lg">
          <div className="relative grid min-h-[4.25rem] grid-cols-5 items-end px-1 pb-1 pt-2">
            <div className="flex justify-center pb-1.5">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 text-[9px] font-semibold py-1 px-1.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'text-accent-blue' : 'text-gray-500 hover:text-gray-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <BarChart2 size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span>Inicio</span>
                  </>
                )}
              </NavLink>
            </div>

            <div className="flex justify-center pb-1.5">
              <NavLink
                to="/analisis"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 text-[9px] font-semibold py-1 px-1.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'text-accent-blue' : 'text-gray-500 hover:text-gray-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <TrendingUp size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span>Análisis</span>
                  </>
                )}
              </NavLink>
            </div>

            <div className="relative flex justify-center h-8">
              <NavLink
                to="/carga"
                className="absolute left-1/2 -translate-x-1/2 -top-[2.2rem] flex flex-col items-center"
                aria-label="Cargar movimiento"
              >
                {({ isActive }) => (
                  <span
                    className={`flex h-[3.5rem] w-[3.5rem] items-center justify-center rounded-full bg-gradient-to-br from-accent-blue to-accent-purple text-white shadow-lg shadow-accent-blue/35 ring-[5px] ring-dark-950 transition-transform duration-200 ${
                      isActive ? 'scale-105 ring-accent-blue/40' : 'hover:scale-[1.03]'
                    }`}
                  >
                    <Plus size={28} strokeWidth={2.5} />
                  </span>
                )}
              </NavLink>
            </div>

            <div className="flex justify-center pb-1.5">
              <NavLink
                to="/presupuesto"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 text-[9px] font-semibold py-1 px-1.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'text-accent-blue' : 'text-gray-500 hover:text-gray-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Wallet size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span>Presup.</span>
                  </>
                )}
              </NavLink>
            </div>

            <div className="flex justify-center pb-1.5">
              <NavLink
                to="/inversiones"
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 text-[9px] font-semibold py-1 px-1.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'text-accent-blue' : 'text-gray-500 hover:text-gray-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Briefcase size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span>Inv.</span>
                  </>
                )}
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
