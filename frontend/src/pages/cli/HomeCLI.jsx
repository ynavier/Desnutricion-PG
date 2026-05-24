import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Bell, ClipboardList, AlertTriangle,
  ChevronRight, TrendingDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.06 } }),
}

const statusConfig = {
  adequate: { label: 'Adecuado',    color: '#52C41A', bg: 'rgba(82,196,26,0.10)'  },
  risk:     { label: 'Riesgo',      color: '#B8860B', bg: 'rgba(255,193,7,0.18)'  },
  mild:     { label: 'D. Leve',     color: '#FB8C00', bg: 'rgba(251,140,0,0.10)'  },
  moderate: { label: 'D. Moderada', color: '#E53935', bg: 'rgba(229,57,53,0.10)'  },
  severe:   { label: 'D. Severa',   color: '#B71C1C', bg: 'rgba(183,28,28,0.10)'  },
}

const nivelConfig = {
  severe:   { color: '#B71C1C', bg: 'rgba(183,28,28,0.08)'  },
  moderate: { color: '#E53935', bg: 'rgba(229,57,53,0.08)'  },
  mild:     { color: '#FB8C00', bg: 'rgba(251,140,0,0.08)'  },
  risk:     { color: '#B8860B', bg: 'rgba(255,193,7,0.10)'  },
}

const MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function clasNombreToEstado(nombre) {
  if (!nombre) return 'adequate'
  const n = nombre.toLowerCase()
  if (n.includes('severa'))   return 'severe'
  if (n.includes('moderada')) return 'moderate'
  if (n === 'normal bajo')    return 'mild'
  if (n === 'normal')         return 'adequate'
  return 'risk'
}

function formatFechaCorta(iso) {
  if (!iso) return '—'
  const [y, mo, d] = iso.split('-')
  return `${parseInt(d)} ${MESES_ES[parseInt(mo) - 1]} ${y}`
}

function formatTiempo(isoStr) {
  if (!isoStr) return ''
  const diffH = Math.floor((Date.now() - new Date(isoStr)) / 3600000)
  if (diffH < 1) return 'Hace < 1 h'
  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return diffD === 1 ? 'Ayer' : `Hace ${diffD} d`
}

function mesesATexto(m) { return `${Math.floor((m||0)/12)}a ${(m||0)%12}m` }

function StatusBadge({ estado }) {
  const s = statusConfig[estado] ?? statusConfig.risk
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

function SkeletonRow({ h = 'h-12' }) {
  return (
    <div className={`${h} rounded-xl animate-pulse`} style={{ background: '#F1F5F9' }} />
  )
}

export default function HomeCLI() {
  const { user } = useAuth()

  const [pacientes, setPacientes] = useState([])
  const [alertas,   setAlertas]   = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/pacientes'),
      api.get('/alertas'),
    ])
      .then(([pRes, aRes]) => {
        setPacientes(pRes.data || [])
        setAlertas(aRes.data  || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const hoy              = new Date().toISOString().slice(0, 10)
  const pacientesActivos = pacientes.length
  const alertasActivas   = alertas.filter(a => !a.leida).length
  const controlesHoy     = pacientes.filter(
    p => p.ultimo_control?.created_at?.slice(0, 10) === hoy,
  ).length
  const enRiesgo = pacientes.filter(p => {
    const est = clasNombreToEstado(p.ultimo_control?.clas_nombre)
    return p.ultimo_control && est !== 'adequate'
  }).length
  const porcentajeRiesgo = pacientesActivos > 0
    ? Math.round(enRiesgo / pacientesActivos * 100)
    : 0

  const kpis = [
    {
      label: 'Pacientes activos',
      value: pacientesActivos,
      icon:  Users,
      color: '#4FB4D2',
      bg:    'rgba(79,180,210,0.10)',
      delta: `${pacientesActivos} registrados`,
    },
    {
      label: 'Alertas sin leer',
      value: alertasActivas,
      icon:  Bell,
      color: '#FB8C00',
      bg:    'rgba(251,140,0,0.10)',
      delta: alertasActivas === 0 ? 'Todo al día' : `${alertasActivas} requieren atención`,
    },
    {
      label: 'Controles hoy',
      value: controlesHoy,
      icon:  ClipboardList,
      color: '#6FCF97',
      bg:    'rgba(111,207,151,0.12)',
      delta: controlesHoy === 0 ? 'Ninguno registrado hoy' : `Registrados el ${formatFechaCorta(hoy)}`,
    },
    {
      label: 'En riesgo nutricional',
      value: enRiesgo,
      icon:  AlertTriangle,
      color: '#E53935',
      bg:    'rgba(229,57,53,0.08)',
      delta: `${porcentajeRiesgo}% del total`,
    },
  ]

  // ── Listas recientes ──────────────────────────────────────────────────────────
  const recentAlerts = [...alertas]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3)
    .map(a => ({
      id:          a.id,
      paciente_id: a.paciente_id,
      paciente:    a.pacientes
        ? `${a.pacientes.nombre} ${a.pacientes.apellidos}`
        : `Paciente #${a.paciente_id}`,
      tipo:    a.tipo,
      nivel:   a.nivel,
      tiempo:  formatTiempo(a.created_at),
    }))

  const recentPatients = [...pacientes]
    .filter(p => p.ultimo_control)
    .sort((a, b) => new Date(b.ultimo_control.fecha) - new Date(a.ultimo_control.fecha))
    .slice(0, 4)
    .map(p => ({
      id:      p.id,
      nombre:  `${p.nombre} ${p.apellidos}`,
      edad:    mesesATexto(p.edad_meses),
      estado:  clasNombreToEstado(p.estado_nutricional),
      control: formatFechaCorta(p.ultimo_control.fecha),
    }))

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
          <motion.div key={label} custom={i} initial="hidden" animate="visible" variants={fadeUp}
            className="clay-card p-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
              style={{ background: bg }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            {loading
              ? <div className="h-7 w-16 rounded-lg animate-pulse mb-1" style={{ background: '#F1F5F9' }} />
              : <p className="text-2xl font-bold text-neutral-text leading-none mb-1">{value}</p>
            }
            <p className="text-xs font-semibold text-neutral-text mb-1">{label}</p>
            <p className="text-xs text-neutral-sub">{loading ? '…' : delta}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Alertas recientes */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}
          className="clay-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-neutral-text">Alertas recientes</h2>
            <Link to="/cli/alertas" className="text-xs flex items-center gap-1"
              style={{ color: '#4FB4D2' }}>
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(n => <SkeletonRow key={n} h="h-14" />)}
            </div>
          ) : recentAlerts.length === 0 ? (
            <p className="text-xs text-neutral-sub text-center py-8">Sin alertas recientes</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentAlerts.map(({ id, paciente, tipo, nivel, tiempo, paciente_id }) => {
                const n = nivelConfig[nivel] ?? nivelConfig.risk
                return (
                  <Link key={id} to={`/cli/pacientes/${paciente_id}`}
                    className="flex items-start gap-3 p-3 rounded-xl hover:opacity-80 transition-opacity"
                    style={{ background: n.bg }}>
                    <TrendingDown className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: n.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-text">{paciente}</p>
                      <p className="text-xs text-neutral-sub mt-0.5">{tipo}</p>
                    </div>
                    <span className="text-[10px] text-neutral-sub flex-shrink-0 mt-0.5">{tiempo}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Últimos controles */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp}
          className="clay-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-neutral-text">Últimos controles</h2>
            <Link to="/cli/pacientes" className="text-xs flex items-center gap-1"
              style={{ color: '#4FB4D2' }}>
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3,4].map(n => <SkeletonRow key={n} />)}
            </div>
          ) : recentPatients.length === 0 ? (
            <p className="text-xs text-neutral-sub text-center py-8">No hay controles registrados</p>
          ) : (
            <div className="flex flex-col">
              {recentPatients.map(({ id, nombre, edad, estado, control }) => (
                <Link key={id} to={`/cli/pacientes/${id}`}
                  className="flex items-center gap-3 py-3 border-b border-neutral-border last:border-0 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4FB4D2, #6EC6E0)' }}>
                    {nombre.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-text truncate">{nombre}</p>
                    <p className="text-[10px] text-neutral-sub">{edad} · {control}</p>
                  </div>
                  <StatusBadge estado={estado} />
                </Link>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  )
}
