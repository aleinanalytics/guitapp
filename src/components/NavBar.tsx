import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart2, Plus, TrendingUp, LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

const sidebarLinks = [
  { to: '/', label: 'Dashboard', icon: BarChart2 },
  { to: '/carga', label: 'Cargar', icon: Plus },
  { to: '/analisis', label: 'Análisis', icon: TrendingUp },
]

export default function NavBar() {
  const { signOut, user } = useAuth()
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? ''
  const displayName = firstName || user?.email?.split('@')[0] || 'Usuario'
  const [mobileUserOpen, setMobileUserOpen] = useState(false)

  useEffect(() => {
    if (!mobileUserOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileUserOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileUserOpen])

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

      {/* Mobile bottom nav: FAB central; cerrar sesión solo desde menú al tocar tu nombre */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="relative max-w-lg mx-auto">
          {mobileUserOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 bg-black/40"
                aria-label="Cerrar menú"
                onClick={() => setMobileUserOpen(false)}
              />
              <div
                className="absolute bottom-full left-3 right-3 z-50 mb-2 rounded-2xl border border-white/[0.08] bg-dark-900/95 backdrop-blur-xl shadow-2xl py-2 overflow-hidden"
                role="menu"
              >
                <p className="px-4 py-2 text-xs text-gray-500 border-b border-white/[0.06] truncate" title={user?.email}>
                  {user?.email}
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMobileUserOpen(false)
                    signOut()
                  }}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}

          <div className="bg-dark-900/90 backdrop-blur-xl border-t border-white/[0.06] shadow-[0_-8px_32px_rgba(0,0,0,0.35)]">
            <div className="flex justify-end px-3 pt-2 pb-1 border-b border-white/[0.05]">
              <button
                type="button"
                onClick={() => setMobileUserOpen((o) => !o)}
                aria-expanded={mobileUserOpen}
                aria-haspopup="menu"
                className="flex min-w-0 max-w-[min(100%,14rem)] items-center gap-2 rounded-xl py-1.5 pl-1 pr-2 text-left transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue to-accent-purple text-xs font-bold text-white">
                  {displayName[0]?.toUpperCase() ?? 'U'}
                </div>
                <span className="truncate text-xs font-semibold text-gray-200">{displayName}</span>
              </button>
            </div>

            <div className="relative grid grid-cols-3 items-end min-h-[4.25rem] px-2 pt-3">
              <div className="flex justify-center pb-1.5">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-3 rounded-xl transition-all duration-300 ${
                      isActive ? 'text-accent-blue' : 'text-gray-500 hover:text-gray-300'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <BarChart2 size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                      <span>Inicio</span>
                    </>
                  )}
                </NavLink>
              </div>

              <div className="flex justify-center relative h-8">
                <NavLink
                  to="/carga"
                  className="absolute left-1/2 -translate-x-1/2 -top-[2.35rem] flex flex-col items-center"
                  aria-label="Cargar movimiento"
                >
                  {({ isActive }) => (
                    <span
                      className={`flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-gradient-to-br from-accent-blue to-accent-purple text-white shadow-lg shadow-accent-blue/35 ring-[5px] ring-dark-950 transition-transform duration-200 ${
                        isActive ? 'scale-105 ring-accent-blue/40' : 'hover:scale-[1.03]'
                      }`}
                    >
                      <Plus size={30} strokeWidth={2.5} />
                    </span>
                  )}
                </NavLink>
              </div>

              <div className="flex justify-center pb-1.5">
                <NavLink
                  to="/analisis"
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 text-[10px] font-medium py-1 px-3 rounded-xl transition-all duration-300 ${
                      isActive ? 'text-accent-blue' : 'text-gray-500 hover:text-gray-300'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <TrendingUp size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                      <span>Análisis</span>
                    </>
                  )}
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
