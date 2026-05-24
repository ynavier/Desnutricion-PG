import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Bell, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const navItems = [
  { label: 'Inicio',    to: '/cli',          icon: LayoutDashboard, end: true },
  { label: 'Pacientes', to: '/cli/pacientes', icon: Users },
  { label: 'Alertas',   to: '/cli/alertas',   icon: Bell, badge: true },
]

export default function SidebarCLI() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sinLeer, setSinLeer] = useState(0)

  useEffect(() => {
    function fetchSinLeer() {
      api.get('/alertas')
        .then(({ data }) => setSinLeer(data.filter(a => !a.leida).length))
        .catch(() => {})
    }
    fetchSinLeer()

    // Refrescar cuando el usuario vuelve a la pestaña
    const onVisible = () => { if (!document.hidden) fetchSinLeer() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-white border-r border-neutral-border flex flex-col z-40">

      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-neutral-border">
        <img src="/Logo.png" alt="Logo" className="w-8 h-8 object-contain" />
        <div>
          <p className="text-xs font-bold text-neutral-text leading-none">NutriVigilancia</p>
          <p className="text-[10px] text-neutral-sub mt-0.5">Panel Clínico</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ label, to, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'font-semibold'
                  : 'text-neutral-sub hover:bg-neutral-bg hover:text-neutral-text'
              }`
            }
            style={({ isActive }) =>
              isActive ? { background: '#EAF6FB', color: '#4FB4D2' } : {}
            }
          >
            {/* Icono con badge opcional */}
            <div className="relative flex-shrink-0">
              <Icon className="w-4 h-4" />
              {badge && sinLeer > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                  style={{ background: '#E53935' }} />
              )}
            </div>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-neutral-border">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4FB4D2, #6EC6E0)' }}
          >
            {user?.nombre?.charAt(0) ?? 'C'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-neutral-text truncate">{user?.nombre ?? 'Clínico'}</p>
            <p className="text-[10px] text-neutral-sub truncate">{user?.email ?? ''}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-sub hover:bg-neutral-bg transition-all hover:text-status-moderate"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>

    </aside>
  )
}
