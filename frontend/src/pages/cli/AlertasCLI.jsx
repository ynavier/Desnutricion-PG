import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, TrendingDown, AlertTriangle, Clock, UserX } from 'lucide-react'
import api from '../../services/api'

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.06 } }),
}

const nivelConfig = {
  severe:   { label: 'Severo',   color: '#B71C1C', bg: 'rgba(183,28,28,0.08)',  border: '#B71C1C' },
  moderate: { label: 'Moderado', color: '#E53935', bg: 'rgba(229,57,53,0.08)',  border: '#E53935' },
  mild:     { label: 'Leve',     color: '#FB8C00', bg: 'rgba(251,140,0,0.08)',  border: '#FB8C00' },
  risk:     { label: 'Riesgo',   color: '#B8860B', bg: 'rgba(255,193,7,0.10)',  border: '#FBC02D' },
}

const NIVEL_ICON = {
  severe: AlertTriangle, moderate: TrendingDown,
  mild: Clock, risk: Bell,
}

function formatTiempo(isoStr) {
  if (!isoStr) return ''
  const diffH = Math.floor((Date.now() - new Date(isoStr)) / 3600000)
  if (diffH < 1) return 'Hace menos de 1 h'
  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return diffD === 1 ? 'Ayer' : `Hace ${diffD} d`
}

const tabs = ['Todas', 'Sin leer', 'Críticas']

export default function AlertasCLI() {
  const [tab,     setTab]     = useState('Todas')
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/alertas')
      .then(({ data }) => setAlertas(data.map(a => ({
        id:       a.id,
        paciente: a.pacientes ? `${a.pacientes.nombre} ${a.pacientes.apellidos}` : `Paciente #${a.paciente_id}`,
        tipo:     a.tipo,
        nivel:    a.nivel,
        icon:     NIVEL_ICON[a.nivel] ?? Bell,
        tiempo:   formatTiempo(a.created_at),
        leida:    a.leida,
      }))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function marcarLeida(id) {
    await api.patch(`/alertas/${id}/leer`).catch(() => {})
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, leida: true } : a))
  }

  async function marcarTodas() {
    await api.patch('/alertas/leer-todas').catch(() => {})
    setAlertas(prev => prev.map(a => ({ ...a, leida: true })))
  }

  const filtered = alertas.filter(a => {
    if (tab === 'Sin leer') return !a.leida
    if (tab === 'Críticas') return a.nivel === 'severe' || a.nivel === 'moderate'
    return true
  })

  const sinLeer = alertas.filter(a => !a.leida).length

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-text">Alertas</h1>
            {sinLeer > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: '#E53935' }}>
                {sinLeer} nuevas
              </span>
            )}
          </div>
          {sinLeer > 0 && (
            <button onClick={marcarTodas}
              className="text-xs font-medium px-3 py-1.5 rounded-xl transition-colors"
              style={{ background: 'rgba(79,180,210,0.08)', color: '#4FB4D2' }}>
              Marcar todas como leídas
            </button>
          )}
        </div>
        <p className="text-sm text-neutral-sub mt-1">Notificaciones de riesgo nutricional activas</p>
      </motion.div>

      {/* Tabs */}
      <motion.div
        custom={1} initial="hidden" animate="visible" variants={fadeUp}
        className="flex gap-2 mb-6"
      >
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              tab === t
                ? { background: '#4FB4D2', color: '#fff' }
                : { background: 'rgba(79,180,210,0.08)', color: '#64748B' }
            }
          >
            {t}
          </button>
        ))}
      </motion.div>

      {loading && (
        <div className="py-12 flex justify-center">
          <div className="w-7 h-7 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#4FB4D2', borderTopColor: 'transparent' }} />
        </div>
      )}

      {/* Lista */}
      {!loading && (
      <>
      <div className="flex flex-col gap-3">
        {filtered.map(({ id, paciente, tipo, nivel, icon: Icon, tiempo, leida }, i) => {
          const n = nivelConfig[nivel]
          return (
            <motion.div
              key={id}
              custom={i + 2}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="clay-card p-5 flex items-start gap-4"
              style={!leida ? { borderLeft: `3px solid ${n.border}`, cursor: 'pointer' } : {}}
              onClick={() => !leida && marcarLeida(id)}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: n.bg }}
              >
                <Icon className="w-4 h-4" style={{ color: n.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-neutral-text">{paciente}</p>
                  {!leida && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: n.color }}
                    />
                  )}
                </div>
                <p className="text-xs text-neutral-sub">{tipo}</p>
              </div>

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ color: n.color, background: n.bg }}
                >
                  {n.label}
                </span>
                <span className="text-[10px] text-neutral-sub">{tiempo}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-20 text-center text-sm text-neutral-sub">
          No hay alertas en esta categoría.
        </div>
      )}
      </>
      )}

    </div>
  )
}
