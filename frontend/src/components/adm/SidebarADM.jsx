import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Database, BrainCircuit, BarChart3, Users, LogOut, Settings, FileText, Menu, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { label: 'Inicio',        to: '/adm',               icon: LayoutDashboard, end: true },
  { label: 'Usuarios',      to: '/adm/usuarios',      icon: Users },
  { label: 'Datasets',      to: '/adm/datasets',      icon: Database },
  { label: 'Entrenamiento', to: '/adm/entrenamiento', icon: BrainCircuit },
  { label: 'Modelos ML',    to: '/adm/modelos',       icon: BarChart3 },
  { label: 'Informe ML',    to: '/adm/reportes',      icon: FileText },
]

export default function SidebarADM() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

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
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: '#9B59B6' }}>Panel Administrativo</p>
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
          {navItems.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive ? 'font-semibold' : 'text-neutral-sub hover:bg-neutral-bg hover:text-neutral-text'
                }`
              }
              style={({ isActive }) => isActive ? {
                background: 'rgba(155,89,182,0.12)',
                color: '#7D3C98',
                boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), inset 0 -2px 4px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.09)',
              } : {}}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Configuración badge */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(155,89,182,0.07)', border: '1px solid rgba(155,89,182,0.15)' }}>
            <Settings className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9B59B6' }} />
            <span className="text-[11px] font-medium" style={{ color: '#7D3C98' }}>Administrador del sistema</span>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-t border-neutral-border">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #9B59B6, #7D3C98)' }}
            >
              {user?.nombre?.charAt(0) ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-neutral-text truncate">{user?.nombre ?? 'Administrador'}</p>
              <p className="text-[10px] text-neutral-sub truncate">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-sub hover:bg-neutral-bg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
