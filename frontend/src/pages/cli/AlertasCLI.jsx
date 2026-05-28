import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, TrendingDown, AlertTriangle, Clock, X, ChevronRight, User, Calendar, Activity, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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

// Recomendaciones estáticas de fallback por nivel
const recomendacionesFallback = {
  severe:   [
    'Derivación hospitalaria urgente',
    'Evaluación pediátrica en menos de 24 horas',
    'Iniciar protocolo de recuperación nutricional',
    'Notificar a autoridad de salud pública',
  ],
  moderate: [
    'Referir urgente a nutricionista y pediatra',
    'Iniciar suplementación con micronutrientes',
    'Coordinar apoyo alimentario con programa social',
    'Visita domiciliaria en 15 días',
  ],
  mild: [
    'Aumentar frecuencia de controles a mensual',
    'Suplementar con hierro y vitamina A',
    'Orientación nutricional a la madre/cuidador',
    'Monitorear curva de crecimiento',
  ],
  risk: [
    'Control mensual recomendado',
    'Reforzar alimentación complementaria',
    'Orientación sobre lactancia y alimentación',
    'Monitorear curva de peso para la edad',
  ],
}

function formatTiempo(isoStr) {
  if (!isoStr) return ''
  const diffH = Math.floor((Date.now() - new Date(isoStr)) / 3600000)
  if (diffH < 1) return 'Hace menos de 1 h'
  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return diffD === 1 ? 'Ayer' : `Hace ${diffD} d`
}

function formatFecha(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const tabs = ['Todas', 'Sin leer', 'Críticas']

// ─── Panel de detalle ─────────────────────────────────────────────────────────

function DetalleAlerta({ alerta, onClose, onMarcarLeida }) {
  const navigate  = useNavigate()
  const n         = nivelConfig[alerta.nivel] ?? nivelConfig.risk
  const Icon      = NIVEL_ICON[alerta.nivel]  ?? Bell

  const [recs,        setRecs]        = useState(recomendacionesFallback[alerta.nivel] ?? [])
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [fuenteRecs,  setFuenteRecs]  = useState('estatica')

  useEffect(() => {
    setLoadingRecs(true)
    api.post('/recomendaciones', {
      nivel_alerta:       alerta.nivel,
      alertas_activas:    [alerta.tipo],
    })
      .then(({ data }) => {
        if (data.recomendaciones?.length) {
          setRecs(data.recomendaciones)
          setFuenteRecs(data.fuente || 'estatica')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRecs(false))
  }, [alerta.id])

  function handleVerPaciente() {
    onClose()
    navigate(`/cli/pacientes/${alerta.paciente_id}`)
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed right-0 top-0 h-screen w-full max-w-md bg-white z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-border">
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5" style={{ color: n.color }} />
            <div>
              <p className="text-sm font-bold text-neutral-text">Detalle de alerta</p>
              <span className="text-xs font-semibold"
                style={{ color: n.color }}>
                {n.label}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-bg transition-colors text-neutral-sub">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Paciente */}
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(79,180,210,0.06)', border: '1px solid rgba(79,180,210,0.15)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(79,180,210,0.12)' }}>
              <User className="w-5 h-5" style={{ color: '#4FB4D2' }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-neutral-text">{alerta.paciente}</p>
              <p className="text-xs text-neutral-sub">Paciente #{alerta.paciente_id}</p>
            </div>
            <button onClick={handleVerPaciente}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
              style={{ background: '#4FB4D2', color: '#fff' }}>
              Ver perfil
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tipo y mensaje */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl p-4" style={{ background: n.bg, border: `1px solid ${n.border}22` }}>
              <p className="text-xs font-semibold mb-1" style={{ color: n.color }}>Tipo de alerta</p>
              <p className="text-sm font-bold text-neutral-text">{alerta.tipo}</p>
            </div>

            {alerta.mensaje && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(248,250,252,1)', border: '1px solid #E2E8F0' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                  <p className="text-xs font-semibold text-neutral-sub">Resultado ML</p>
                </div>
                <p className="text-sm text-neutral-text">{alerta.mensaje}</p>
              </div>
            )}
          </div>

          {/* Fecha */}
          <div className="flex items-center gap-2 text-xs text-neutral-sub">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatFecha(alerta.created_at)}</span>
            <span>·</span>
            <span>{alerta.tiempo}</span>
          </div>

          {/* Recomendaciones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-neutral-text uppercase tracking-wide">
                Acciones recomendadas
              </p>
              {loadingRecs ? (
                <span className="flex items-center gap-1 text-[10px] font-medium"
                  style={{ color: '#4FB4D2' }}>
                  <div className="w-2.5 h-2.5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: '#4FB4D2', borderTopColor: 'transparent' }} />
                  Generando...
                </span>
              ) : fuenteRecs === 'ia' ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: '#3DAB6B' }}>
                  <Sparkles className="w-2.5 h-2.5" />
                  IA
                </span>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              {loadingRecs && recs.length === 0
                ? [1, 2, 3, 4].map(n => (
                    <div key={n} className="h-4 rounded-lg animate-pulse" style={{ background: '#F1F5F9' }} />
                  ))
                : recs.map((r, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: n.bg }}>
                        <span className="text-[10px] font-bold" style={{ color: n.color }}>{i + 1}</span>
                      </div>
                      <p className="text-xs text-neutral-sub leading-relaxed">{r}</p>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-border flex gap-3">
          {!alerta.leida && (
            <button
              onClick={() => { onMarcarLeida(alerta.id); onClose() }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-neutral-border text-neutral-sub hover:bg-neutral-bg transition-colors">
              Marcar como leída
            </button>
          )}
          <button onClick={handleVerPaciente}
            className="flex-1 clay-btn text-white font-semibold py-2.5 text-sm flex items-center justify-center gap-2">
            Ir al paciente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AlertasCLI() {
  const [tab,          setTab]          = useState('Todas')
  const [alertas,      setAlertas]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [seleccionada, setSeleccionada] = useState(null)

  useEffect(() => {
    api.get('/alertas')
      .then(({ data }) => setAlertas(data.map(a => ({
        id:          a.id,
        paciente_id: a.paciente_id,
        control_id:  a.control_id,
        paciente:    a.pacientes ? `${a.pacientes.nombre} ${a.pacientes.apellidos}` : `Paciente #${a.paciente_id}`,
        tipo:        a.tipo,
        nivel:       a.nivel,
        mensaje:     a.mensaje,
        icon:        NIVEL_ICON[a.nivel] ?? Bell,
        tiempo:      formatTiempo(a.created_at),
        created_at:  a.created_at,
        leida:       a.leida,
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
              className="text-xs font-medium px-3 py-1.5 rounded-xl transition-colors hover:bg-neutral-bg"
              style={{ color: '#4FB4D2' }}>
              Marcar todas como leídas
            </button>
          )}
        </div>
        <p className="text-sm text-neutral-sub mt-1">Notificaciones de riesgo nutricional activas</p>
      </motion.div>

      {/* Tabs */}
      <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp} className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab !== t ? 'hover:bg-neutral-bg' : ''}`}
            style={tab === t
              ? { background: 'rgba(79,180,210,0.08)', color: '#1A1F2B', boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), inset 0 -2px 4px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)' }
              : { color: '#54606E' }
            }>
            {t}
          </button>
        ))}
      </motion.div>

      {/* Loading */}
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
            {filtered.map((alerta, i) => {
              const { id, paciente, tipo, nivel, icon: Icon, tiempo, leida } = alerta
              const n = nivelConfig[nivel] ?? nivelConfig.risk
              return (
                <motion.div
                  key={id}
                  custom={i + 2}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  onClick={() => setSeleccionada(alerta)}
                  className="clay-card p-5 flex items-center gap-4 cursor-pointer relative overflow-visible"
                >
                  {/* Punto rojo — centrado sobre el arco redondeado (r=20px → 6px desde cada borde) */}
                  {!leida && (
                    <span className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full border-2 border-white translate-x-1/2 -translate-y-1/2"
                      style={{ background: '#E53935' }} />
                  )}

                  <Icon className="w-6 h-6 flex-shrink-0" style={{ color: n.color }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-neutral-text">{paciente}</p>
                    </div>
                    <p className="text-xs text-neutral-sub">{tipo}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs font-medium"
                      style={{ color: n.color }}>
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

      {/* Panel detalle */}
      <AnimatePresence>
        {seleccionada && (
          <DetalleAlerta
            alerta={seleccionada}
            onClose={() => setSeleccionada(null)}
            onMarcarLeida={(id) => {
              marcarLeida(id)
              setSeleccionada(prev => prev ? { ...prev, leida: true } : null)
            }}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
