import { NavLink } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

// Material Symbols icon wrapper
function Icon({ name, filled = false, size = 24 }: { name: string; filled?: boolean; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' ${size}`,
      }}
    >
      {name}
    </span>
  )
}

const sidebarLinks = [
  { to: '/',           label: 'Inicio',      icon: 'home' },
  { to: '/analisis',   label: 'Análisis',    icon: 'query_stats' },
  { to: '/presupuesto',label: 'Presupuesto', icon: 'account_balance_wallet' },
  { to: '/inversiones',label: 'Inversiones', icon: 'trending_up' },
]

export default function NavBar() {
  const { signOut, user } = useAuth()
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? ''
  const initials = firstName?.[0]?.toUpperCase() ?? 'U'

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col z-50"
           style={{ background: 'rgba(19,19,26,0.6)', backdropFilter: 'blur(24px)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="p-6 flex-1">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <img
              src="/apple-touch-icon.png"
              alt="GuitaApp"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl object-cover"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            />
            <span className="text-xl font-bold text-slate-50 tracking-tight">GuitaApp</span>
          </div>

          {/* Nav links */}
          <div className="space-y-1">
            {sidebarLinks.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={icon} filled={isActive} size={22} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Carga as primary CTA */}
          <NavLink
            to="/carga"
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <Icon name="add" size={22} />
            <span>Cargar</span>
          </NavLink>
        </div>

        {/* User footer */}
        <div className="p-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-container to-secondary-container flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{firstName || 'Usuario'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-400 transition-colors w-full px-2 py-1.5"
          >
            <Icon name="logout" size={16} />
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom nav ────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 h-[4.5rem] lg:hidden"
        style={{
          background: 'rgba(19,19,26,0.5)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '3rem 3rem 0 0',
          boxShadow: '0px -10px 40px 0px rgba(0,0,0,0.3)',
          paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
        }}
      >
        {/* Inicio */}
        <NavLink
          to="/"
          end
          aria-label="Inicio"
          className={({ isActive }) =>
            `flex items-center justify-center p-2 transition-all duration-300 active:scale-90 ${
              isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          {({ isActive }) => <Icon name="home" filled={isActive} size={26} />}
        </NavLink>

        {/* Análisis */}
        <NavLink
          to="/analisis"
          aria-label="Análisis"
          className={({ isActive }) =>
            `flex items-center justify-center p-2 transition-all duration-300 active:scale-90 ${
              isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          {({ isActive }) => <Icon name="query_stats" filled={isActive} size={26} />}
        </NavLink>

        {/* FAB: Cargar */}
        <div className="relative -top-1">
          <NavLink
            to="/carga"
            aria-label="Cargar movimiento"
            className={({ isActive }) =>
              `relative flex items-center justify-center w-16 h-16 rounded-full text-white shadow-md transition-all active:scale-90 duration-300 ${
                isActive ? 'ring-2 ring-primary/40' : ''
              }`
            }
            style={{ background: 'linear-gradient(135deg, #818cf8, #4f46e5)' }}
          >
            <Icon name="add" filled size={30} />
          </NavLink>
        </div>

        {/* Presupuesto */}
        <NavLink
          to="/presupuesto"
          aria-label="Presupuesto"
          className={({ isActive }) =>
            `flex items-center justify-center p-2 transition-all duration-300 active:scale-90 ${
              isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          {({ isActive }) => <Icon name="account_balance_wallet" filled={isActive} size={26} />}
        </NavLink>

        {/* Inversiones */}
        <NavLink
          to="/inversiones"
          aria-label="Inversiones"
          className={({ isActive }) =>
            `flex items-center justify-center p-2 transition-all duration-300 active:scale-90 ${
              isActive ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
            }`
          }
        >
          {({ isActive }) => <Icon name="trending_up" filled={isActive} size={26} />}
        </NavLink>
      </nav>
    </>
  )
}
