import { motion } from 'framer-motion'
import { Users, Bell, ClipboardList, AlertTriangle, ChevronRight, TrendingDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.06 } }),
}

const kpis = [
  {
    label: 'Pacientes activos',
    value: 142,
    icon:  Users,
    color: '#4FB4D2',
    bg:    'rgba(79,180,210,0.10)',
    delta: '+3 este mes',
  },
  {
    label: 'Alertas activas',
    value: 8,
    icon:  Bell,
    color: '#FB8C00',
    bg:    'rgba(251,140,0,0.10)',
    delta: '2 requieren atención',
  },
  {
    label: 'Controles hoy',
    value: 5,
    icon:  ClipboardList,
    color: '#6FCF97',
    bg:    'rgba(111,207,151,0.12)',
    delta: 'de 8 programados',
  },
  {
    label: 'En riesgo nutricional',
    value: 23,
    icon:  AlertTriangle,
    color: '#E53935',
    bg:    'rgba(229,57,53,0.08)',
    delta: '16% del total',
  },
]

const statusConfig = {
  adequate: { label: 'Adecuado',    color: '#52C41A', bg: 'rgba(82,196,26,0.10)'  },
  risk:     { label: 'Riesgo',      color: '#B8860B', bg: 'rgba(255,193,7,0.18)'  },
  mild:     { label: 'D. Leve',     color: '#FB8C00', bg: 'rgba(251,140,0,0.10)'  },
  moderate: { label: 'D. Moderada', color: '#E53935', bg: 'rgba(229,57,53,0.10)'  },
  severe:   { label: 'D. Severa',   color: '#B71C1C', bg: 'rgba(183,28,28,0.10)'  },
}

const recentAlerts = [
  { id: 1, paciente: 'Carlos Mendoza R.', tipo: 'Riesgo alto de desnutrición',  nivel: 'moderate', tiempo: 'Hace 1 h' },
  { id: 2, paciente: 'Sofía Quispe T.',   tipo: 'Tendencia negativa de peso',   nivel: 'moderate', tiempo: 'Hace 3 h' },
  { id: 3, paciente: 'Diego Mamani H.',   tipo: 'Desnutrición severa detectada',nivel: 'severe',   tiempo: 'Hace 5 h' },
]

const recentPatients = [
  { id: 1, nombre: 'Valentina Cruz M.', edad: '2a 7m', estado: 'adequate', control: '22 may 2026' },
  { id: 2, nombre: 'Carlos Mendoza R.', edad: '2a 3m', estado: 'risk',     control: '20 may 2026' },
  { id: 3, nombre: 'Andrés Torres L.',  edad: '3a 5m', estado: 'adequate', control: '21 may 2026' },
  { id: 4, nombre: 'Sofía Quispe T.',   edad: '1a 8m', estado: 'moderate', control: '19 may 2026' },
]

function StatusBadge({ estado }) {
  const s = statusConfig[estado] ?? statusConfig.risk
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  )
}

export default function HomeCLI() {
  const { user } = useAuth()

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-text">
          Bienvenido{user?.nombre ? `, ${user.nombre.split(' ')[0]}` : ''}
        </h1>
        <p className="text-sm text-neutral-sub mt-1">Panel de vigilancia nutricional infantil</p>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, icon: Icon, color, bg, delta }, i) => (
          <motion.div
            key={label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="clay-card p-5"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
              style={{ background: bg }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <p className="text-2xl font-bold text-neutral-text leading-none mb-1">{value}</p>
            <p className="text-xs font-semibold text-neutral-text mb-1">{label}</p>
            <p className="text-xs text-neutral-sub">{delta}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Alertas recientes */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp} className="clay-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-neutral-text">Alertas recientes</h2>
            <Link
              to="/cli/alertas"
              className="text-xs flex items-center gap-1"
              style={{ color: '#4FB4D2' }}
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recentAlerts.map(({ id, paciente, tipo, nivel, tiempo }) => {
              const s = statusConfig[nivel]
              return (
                <div
                  key={id}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: s.bg }}
                >
                  <TrendingDown className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: s.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-text">{paciente}</p>
                    <p className="text-xs text-neutral-sub mt-0.5">{tipo}</p>
                  </div>
                  <span className="text-[10px] text-neutral-sub flex-shrink-0 mt-0.5">{tiempo}</span>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Últimos controles */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp} className="clay-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-neutral-text">Últimos controles</h2>
            <Link
              to="/cli/pacientes"
              className="text-xs flex items-center gap-1"
              style={{ color: '#4FB4D2' }}
            >
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex flex-col">
            {recentPatients.map(({ id, nombre, edad, estado, control }) => (
              <div
                key={id}
                className="flex items-center gap-3 py-3 border-b border-neutral-border last:border-0"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #4FB4D2, #6EC6E0)' }}
                >
                  {nombre.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-neutral-text truncate">{nombre}</p>
                  <p className="text-[10px] text-neutral-sub">{edad} · {control}</p>
                </div>
                <StatusBadge estado={estado} />
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  )
}
