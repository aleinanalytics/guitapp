import { NavLink } from 'react-router-dom'
import { BarChart2, PlusCircle, TrendingUp, LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

const links = [
  { to: '/', label: 'Dashboard', icon: BarChart2 },
  { to: '/carga', label: 'Cargar', icon: PlusCircle },
  { to: '/analisis', label: 'Análisis', icon: TrendingUp },
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-sm font-bold text-white">
              G
            </div>
            <span className="text-lg font-bold text-gray-100">GuitaApp</span>
          </div>

          <div className="space-y-1">
            {links.map(({ to, label, icon: Icon }) => (
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

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="bg-dark-900/80 backdrop-blur-xl border-t border-white/[0.06]">
          <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-all duration-300 ${
                    isActive ? 'text-accent-blue' : 'text-gray-500 hover:text-gray-300'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-[2px] bg-accent-blue rounded-full" />
                    )}
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
            <button
              onClick={signOut}
              className="flex flex-col items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-red-400 py-1 px-3 rounded-xl transition-all duration-300"
            >
              <LogOut size={20} strokeWidth={1.8} />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
