import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Bell, LogOut, Menu, X } from 'lucide-react'
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
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function fetchSinLeer() {
      api.get('/alertas')
        .then(({ data }) => setSinLeer(data.filter(a => !a.leida).length))
        .catch(() => {})
    }
    fetchSinLeer()

    const onVisible = () => { if (!document.hidden) fetchSinLeer() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <>
      {/* Hamburger – mobile only */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-xl bg-white border border-neutral-border shadow-sm"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5 text-neutral-text" />
      </button>

      {/* Backdrop – mobile only */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-screen w-60 bg-white border-r border-neutral-border flex flex-col z-40 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        {/* Logo */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-neutral-border">
          <img src="/Logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-neutral-text leading-none">NutriVigilancia</p>
            <p className="text-[10px] text-neutral-sub mt-0.5">Panel Clínico</p>
          </div>
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-neutral-bg text-neutral-sub"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(({ label, to, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'font-semibold'
                    : 'text-neutral-sub hover:bg-neutral-bg hover:text-neutral-text'
                }`
              }
              style={({ isActive }) =>
                isActive ? {
                  background: '#EAF6FB',
                  color: '#4FB4D2',
                  boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), inset 0 -2px 4px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)',
                } : {}
              }
            >
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
    </>
  )
}
