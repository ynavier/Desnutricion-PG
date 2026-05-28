import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Database, BrainCircuit, BarChart3, Users, FileText, PieChart, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const navItems = [
  { label: 'Inicio',        to: '/anl',               icon: LayoutDashboard, end: true },
  { label: 'Datasets',      to: '/anl/datasets',      icon: Database },
  { label: 'Entrenamiento', to: '/anl/entrenamiento', icon: BrainCircuit },
  { label: 'Modelos',       to: '/anl/modelos',       icon: BarChart3 },
  { label: 'Dashboards',    to: '/anl/dashboards',    icon: PieChart },
  { label: 'Usuarios',      to: '/anl/usuarios',      icon: Users },
  { label: 'Reportes',      to: '/anl/reportes',      icon: FileText },
]

export default function SidebarANL() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

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
          <p className="text-[10px] mt-0.5" style={{ color: '#6FCF97' }}>Panel Analítico</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive ? 'font-semibold' : 'text-neutral-sub hover:bg-neutral-bg hover:text-neutral-text'
              }`
            }
            style={({ isActive }) => isActive ? {
              background: 'rgba(111,207,151,0.14)',
              color: '#3DAB6B',
              boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), inset 0 -2px 4px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)',
            } : {}}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-neutral-border">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)' }}
          >
            {user?.nombre?.charAt(0) ?? 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-neutral-text truncate">{user?.nombre ?? 'Analítico'}</p>
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
  )
}
