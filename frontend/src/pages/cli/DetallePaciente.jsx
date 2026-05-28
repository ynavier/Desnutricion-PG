import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, AlertTriangle, Brain,
  MapPin, Calendar, X, TrendingDown, CheckCircle, Sparkles,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ─── Config ──────────────────────────────────────────────────────────────────

const statusConfig = {
  adequate: { label: 'Adecuado',    color: '#52C41A', bg: 'rgba(82,196,26,0.10)'  },
  risk:     { label: 'Riesgo',      color: '#B8860B', bg: 'rgba(255,193,7,0.18)'  },
  mild:     { label: 'D. Leve',     color: '#FB8C00', bg: 'rgba(251,140,0,0.10)'  },
  moderate: { label: 'D. Moderada', color: '#E53935', bg: 'rgba(229,57,53,0.10)'  },
  severe:   { label: 'D. Severa',   color: '#B71C1C', bg: 'rgba(183,28,28,0.10)'  },
}

function zScoreColor(z) {
  if (z > -1)  return '#52C41A'
  if (z > -2)  return '#FBC02D'
  if (z > -3)  return '#FB8C00'
  return '#E53935'
}

// ─── Helpers API ─────────────────────────────────────────────────────────────

const MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function clasNombreToEstado(nombre) {
  if (!nombre) return 'adequate'
  const n = nombre.toLowerCase()
  if (n.includes('severa')) return 'severe'
  if (n.includes('moderada')) return 'moderate'
  if (n === 'normal bajo') return 'mild'
  if (n === 'normal') return 'adequate'
  return 'risk'
}

function formatFechaLarga(iso) {
  if (!iso) return '—'
  const [y, mo, d] = iso.split('-')
  return `${parseInt(d)} ${MESES_ES[parseInt(mo) - 1]} ${y}`
}

function formatFechaCorta(iso) {
  if (!iso) return '—'
  const [y, mo, d] = iso.split('-')
  return `${parseInt(d)} ${MESES_ES[parseInt(mo) - 1]} ${y}`
}

function formatTiempo(isoStr) {
  if (!isoStr) return ''
  const diffH = Math.floor((Date.now() - new Date(isoStr)) / 3600000)
  if (diffH < 1) return 'Hace menos de 1 h'
  if (diffH < 24) return `Hace ${diffH} h`
  const diffD = Math.floor(diffH / 24)
  return diffD === 1 ? 'Ayer' : `Hace ${diffD} d`
}

function mesesATexto(m) { return `${Math.floor((m||0)/12)}a ${(m||0)%12}m` }

function genRecomendaciones(estado) {
  const map = {
    severe:   ['URGENTE: Derivación hospitalaria inmediata', 'Evaluación pediátrica en < 24 horas', 'Iniciar protocolo de recuperación nutricional', 'Notificar a autoridad de salud pública'],
    moderate: ['Referencia urgente a nutricionista y pediatra', 'Iniciar suplementación con micronutrientes', 'Coordinar apoyo alimentario con programa social', 'Visita domiciliaria en 15 días'],
    mild:     ['Aumentar frecuencia de controles a mensual', 'Suplementar con hierro y vitamina A', 'Orientación nutricional a la madre', 'Verificar factores socioeconómicos'],
    risk:     ['Control mensual recomendado', 'Reforzar alimentación complementaria', 'Orientación sobre lactancia y alimentación', 'Monitorear curva de crecimiento'],
    adequate: ['Mantener controles rutinarios cada 3 meses', 'Continuar con dieta balanceada', 'Estado nutricional dentro de parámetros normales'],
  }
  return map[estado] ?? map.adequate
}

function siNoToInt(v)  { return v === 'Sí' ? 1 : 2 }
function rutaToInt(v)  {
  return ({ 'Demanda espontánea': 1, Captación: 2, Referencia: 3 })[v] ?? null
}

function mapPacienteDetalle(p) {
  const uc     = p.ultimo_control
  const estado = clasNombreToEstado(p.estado_nutricional)
  return {
    id:              p.id,
    nombre:          `${p.nombre} ${p.apellidos}`,
    dni:             p.dni || '—',
    sexo:            p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : '—',
    edad:            mesesATexto(p.edad_meses),
    fechaNacimiento: formatFechaLarga(p.fecha_nac),
    establecimiento: p.establecimiento || '—',
    procedencia: {
      departamento: p.cod_dpto_o    || '—',
      municipio:    p.municipio_proc || '—',
    },
    residencia: {
      departamento: p.dpto_residencia || '—',
      municipio:    p.municipio_res   || '—',
      area:         p.area_ === 1 ? 'Urbana' : p.area_ === 2 ? 'Rural' : '—',
    },
    estado,
    peso:    uc?.peso_act   ?? '—',
    talla:   uc?.talla_act  ?? '—',
    imc:     uc?.imc        ? parseFloat(uc.imc).toFixed(1) : '—',
    zScore:  uc?.zscore_pt  ?? '—',
    prediccion: {
      probabilidad: uc ? Math.round((uc.prob_desnutrido || 0) * 100) : 0,
      modelo:       uc?.modelo_usado || 'Random Forest',
      confianza:    uc ? (uc.prob_desnutrido > 0.8 ? 'Muy alta' : uc.prob_desnutrido > 0.6 ? 'Alta' : 'Media') : '—',
    },
    alertas: (p.alertas || []).map(a => ({
      tipo:   a.tipo,
      nivel:  a.nivel,
      tiempo: formatTiempo(a.created_at),
    })),
    recomendaciones: genRecomendaciones(estado),
    historial: (p.controles || []).map(c => ({
      fecha:  formatFechaCorta(c.fecha),
      peso:   c.peso_act,
      talla:  c.talla_act ?? '—',
      imc:    c.imc ? parseFloat(c.imc).toFixed(1) : '—',
      zScore: c.zscore_pt ?? '—',
      estado: clasNombreToEstado(c.clas_nombre),
      obs:    c.observaciones || '',
    })),
  }
}

const factoresSociales = [
  'Pobreza extrema',
  'Agua no segura',
  'Madre con bajo nivel educativo',
  'Hacinamiento en el hogar',
  'Acceso limitado a servicios de salud',
  'Inseguridad alimentaria',
]

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.06 } }),
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusBadge({ estado }) {
  const s = statusConfig[estado] ?? statusConfig.risk
  return (
    <span
      className="text-xs font-semibold inline-flex items-center gap-1.5"
      style={{ color: s.color }}
    >
      {s.label}
    </span>
  )
}

function CustomDot({ cx, cy, payload }) {
  return (
    <circle cx={cx} cy={cy} r={5}
      fill={zScoreColor(payload.zScore)} stroke="white" strokeWidth={2} />
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  return (
    <div className="clay-card px-3 py-2.5 text-xs shadow-lg">
      <p className="font-bold text-neutral-text mb-1">{label}</p>
      <p className="text-neutral-sub">Peso: <span className="font-semibold text-neutral-text">{p?.peso} kg</span></p>
      <p className="text-neutral-sub">Z-score: <span className="font-semibold" style={{ color: zScoreColor(p?.zScore) }}>{p?.zScore}</span></p>
    </div>
  )
}

// ─── Drawer Nuevo Control ────────────────────────────────────────────────────

function NuevoControlDrawer({ paciente, onClose, onControlAdded }) {
  const [form, setForm] = useState({
    peso: '', talla: '', perBraqui: '',
    edema: '', delgadez: '', palidez: '',
    pielReseca: '', hiperpigm: '', cambiosCabello: '',
    enfermedades: [], apetito: '', micronutrientes: '',
    ruta_atenc: '', factores: [], observaciones: '',
  })
  const [submitted,  setSubmitted]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [apiError,   setApiError]   = useState('')
  const [prediccion, setPrediccion] = useState(null)

  const imc = form.peso && form.talla
    ? (parseFloat(form.peso) / Math.pow(parseFloat(form.talla) / 100, 2)).toFixed(1)
    : '—'

  function toggleFactor(f) {
    setForm(prev => ({
      ...prev,
      factores: prev.factores.includes(f)
        ? prev.factores.filter(x => x !== f)
        : [...prev.factores, f],
    }))
  }

  function toggleEnfermedad(e) {
    setForm(prev => ({
      ...prev,
      enfermedades: prev.enfermedades.includes(e)
        ? prev.enfermedades.filter(x => x !== e)
        : [...prev.enfermedades, e],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setApiError('')
    try {
      const { data } = await api.post(`/pacientes/${paciente.id}/controles`, {
        peso_act:        parseFloat(form.peso),
        talla_act:       form.talla     ? parseFloat(form.talla)     : undefined,
        per_braqui:      form.perBraqui ? parseFloat(form.perBraqui) : undefined,
        edema:           siNoToInt(form.edema),
        delgadez:        siNoToInt(form.delgadez),
        palidez:         siNoToInt(form.palidez),
        piel_rese:       siNoToInt(form.pielReseca),
        hiperpigm:       siNoToInt(form.hiperpigm),
        cambios_cabello: siNoToInt(form.cambiosCabello),
        ruta_atenc:      rutaToInt(form.ruta_atenc),
        apetito:         form.apetito       || undefined,
        micronutrientes: form.micronutrientes ? siNoToInt(form.micronutrientes) : undefined,
        enfermedades:    form.enfermedades,
        factores_sociales: form.factores,
        observaciones:   form.observaciones || undefined,
      })
      setPrediccion(data)
      setSubmitted(true)
      onControlAdded?.()
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Error al registrar control.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[2px] z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed right-0 top-0 h-screen w-full max-w-md bg-white/90 backdrop-blur-md border-l border-white/40 z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-border">
          <div>
            <h2 className="text-sm font-bold text-neutral-text">Registrar control</h2>
            <p className="text-xs text-neutral-sub mt-0.5">{paciente.nombre}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-bg transition-colors text-neutral-sub">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(82,196,26,0.12)' }}>
              <CheckCircle className="w-7 h-7" style={{ color: '#52C41A' }} />
            </div>
            <div className="text-center">
              <p className="font-bold text-neutral-text mb-2">Control registrado</p>
              {prediccion && (
                <>
                  <p className="text-base font-black mb-1"
                    style={{ color: statusConfig[clasNombreToEstado(prediccion.clas_nombre)]?.color }}>
                    {prediccion.clas_nombre}
                  </p>
                  <p className="text-xs text-neutral-sub">
                    Prob. desnutrición: {Math.round(prediccion.prob_desnutrido * 100)}%
                    {' · '}{prediccion.modelo_usado?.replace('modelo_', 'Modelo ').replace('_rf', ' RF')}
                  </p>
                </>
              )}
            </div>
            <button onClick={onClose}
              className="clay-btn text-white font-semibold px-6 py-2.5 text-sm mt-2">
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

            {/* Datos antropométricos */}
            <div>
              <p className="text-xs font-bold text-neutral-text mb-3 uppercase tracking-wide">
                Datos antropométricos
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Peso (kg)</label>
                  <input type="number" step="0.1" min="0" placeholder="10.2" required
                    value={form.peso}
                    onChange={e => setForm(p => ({ ...p, peso: e.target.value }))}
                    className="input-clinical" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Talla (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="84" required
                    value={form.talla}
                    onChange={e => setForm(p => ({ ...p, talla: e.target.value }))}
                    className="input-clinical" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Perímetro braquial — MUAC (cm)</label>
                  <input type="number" step="0.1" min="0" max="30" placeholder="14.5"
                    value={form.perBraqui}
                    onChange={e => setForm(p => ({ ...p, perBraqui: e.target.value }))}
                    className="input-clinical" />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="px-3 py-2.5 rounded-xl flex items-center justify-between"
                    style={{ background: 'rgba(79,180,210,0.08)' }}>
                    <span className="text-xs text-neutral-sub">IMC calculado</span>
                    <span className="text-sm font-bold" style={{ color: '#4FB4D2' }}>{imc ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signos clínicos */}
            <div>
              <p className="text-xs font-bold text-neutral-text mb-3 uppercase tracking-wide">
                Signos clínicos
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { key: 'edema',           label: 'Edema' },
                  { key: 'delgadez',        label: 'Delgadez visible' },
                  { key: 'palidez',         label: 'Palidez' },
                  { key: 'pielReseca',      label: 'Piel reseca / descamada' },
                  { key: 'hiperpigm',       label: 'Hiperpigmentación' },
                  { key: 'cambiosCabello',  label: 'Cambios en el cabello' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-neutral-border">
                    <span className="text-xs text-neutral-sub">{label}</span>
                    <div className="flex gap-2">
                      {['Sí', 'No'].map(v => (
                        <button key={v} type="button"
                          onClick={() => setForm(p => ({ ...p, [key]: v }))}
                          className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                          style={form[key] === v
                            ? { background: '#4FB4D2', color: '#fff' }
                            : { background: '#F1F5F9', color: '#64748B' }
                          }>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estado clínico */}
            <div>
              <p className="text-xs font-bold text-neutral-text mb-3 uppercase tracking-wide">
                Estado clínico reciente
              </p>

              <div className="mb-3">
                <label className="block text-xs font-semibold text-neutral-sub mb-2">
                  Enfermedades en el último mes
                </label>
                <div className="flex flex-col gap-2">
                  {['Diarrea', 'Infección respiratoria (IRA)', 'Parasitosis', 'Fiebre prolongada', 'Ninguna'].map(e => (
                    <label key={e} className="flex items-center gap-3 cursor-pointer group">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all"
                        style={form.enfermedades.includes(e)
                          ? { background: '#4FB4D2', borderColor: '#4FB4D2' }
                          : { borderColor: '#D9EEF5' }
                        }
                        onClick={() => toggleEnfermedad(e)}
                      >
                        {form.enfermedades.includes(e) && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-neutral-sub group-hover:text-neutral-text transition-colors">{e}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-semibold text-neutral-sub mb-2">Apetito</label>
                <div className="flex gap-2">
                  {['Bueno', 'Regular', 'Malo'].map(v => (
                    <button key={v} type="button"
                      onClick={() => setForm(p => ({ ...p, apetito: v }))}
                      className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                      style={form.apetito === v
                        ? { background: '#4FB4D2', color: '#fff' }
                        : { background: '#F1F5F9', color: '#64748B' }
                      }>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-border">
                <span className="text-xs text-neutral-sub">Suplemento de micronutrientes</span>
                <div className="flex gap-2">
                  {['Sí', 'No'].map(v => (
                    <button key={v} type="button"
                      onClick={() => setForm(p => ({ ...p, micronutrientes: v }))}
                      className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                      style={form.micronutrientes === v
                        ? { background: '#4FB4D2', color: '#fff' }
                        : { background: '#F1F5F9', color: '#64748B' }
                      }>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Ruta de atención</label>
                <div className="flex gap-2">
                  {['Demanda espontánea', 'Captación', 'Referencia'].map(v => (
                    <button key={v} type="button"
                      onClick={() => setForm(p => ({ ...p, ruta_atenc: v }))}
                      className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                      style={form.ruta_atenc === v
                        ? { background: '#4FB4D2', color: '#fff' }
                        : { background: '#F1F5F9', color: '#64748B' }
                      }>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Factores sociales */}
            <div>
              <p className="text-xs font-bold text-neutral-text mb-3 uppercase tracking-wide">
                Factores sociales
              </p>
              <div className="flex flex-col gap-2">
                {factoresSociales.map(f => (
                  <label key={f} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all"
                      style={
                        form.factores.includes(f)
                          ? { background: '#4FB4D2', borderColor: '#4FB4D2' }
                          : { borderColor: '#D9EEF5' }
                      }
                      onClick={() => toggleFactor(f)}
                    >
                      {form.factores.includes(f) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-neutral-sub group-hover:text-neutral-text transition-colors">{f}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-neutral-text mb-1.5 uppercase tracking-wide">
                Observaciones
              </label>
              <textarea
                rows={3}
                placeholder="Notas clínicas relevantes..."
                value={form.observaciones}
                onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                className="input-clinical resize-none"
              />
            </div>

            {apiError && (
              <p className="text-xs px-3 py-2 rounded-xl"
                style={{ background: 'rgba(229,57,53,0.08)', color: '#E53935' }}>
                {apiError}
              </p>
            )}
            <button type="submit" disabled={saving}
              className="clay-btn text-white font-semibold py-3 text-sm flex items-center justify-center gap-2 mt-auto disabled:opacity-60">
              {saving ? 'Guardando...' : <><Plus className="w-4 h-4" />Guardar control</>}
            </button>

          </form>
        )}
      </motion.div>
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DetallePaciente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [showDrawer,    setShowDrawer]    = useState(false)
  const [paciente,      setPaciente]      = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [notFound,      setNotFound]      = useState(false)
  const [recomendaciones, setRecomendaciones] = useState([])
  const [loadingRecs,   setLoadingRecs]   = useState(false)
  const [fuenteRecs,    setFuenteRecs]    = useState('estatica')

  async function fetchRecomendaciones(rawData) {
    setLoadingRecs(true)
    const uc = rawData.controles?.[0]
    try {
      const { data } = await api.post('/recomendaciones', {
        paciente_id:        rawData.id ?? parseInt(id),
        estado_nutricional: rawData.estado_nutricional,
        edad_meses:         rawData.edad_meses,
        sexo:               rawData.sexo,
        zscore:             uc?.zscore_pt     ?? null,
        prob_desnutrido:    uc?.prob_desnutrido ?? null,
        factores_sociales:  rawData.factores_sociales || [],
        alertas_activas:    (rawData.alertas || []).map(a => a.tipo),
      })
      setRecomendaciones(data.recomendaciones || [])
      setFuenteRecs(data.fuente || 'estatica')
    } catch {
      // Mantiene las recomendaciones estáticas ya establecidas
    } finally {
      setLoadingRecs(false)
    }
  }

  function fetchPaciente() {
    api.get(`/pacientes/${id}`)
      .then(({ data }) => {
        const mapped = mapPacienteDetalle(data)
        setPaciente(mapped)
        setRecomendaciones(mapped.recomendaciones)   // estáticas como fallback
        fetchRecomendaciones(data)                    // luego intenta con IA
      })
      .catch(err => {
        if (err.response?.status === 404) setNotFound(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPaciente() }, [id])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#4FB4D2', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (notFound || !paciente) {
    return (
      <div className="px-8 py-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <p className="text-neutral-sub text-sm">Paciente no encontrado.</p>
        <button onClick={() => navigate('/cli/pacientes')}
          className="mt-4 text-xs underline" style={{ color: '#4FB4D2' }}>
          Volver a pacientes
        </button>
      </div>
    )
  }

  const chartData = [...paciente.historial].reverse().map(c => ({
    fecha:  c.fecha.split(' ').slice(0, 2).join(' '),
    peso:   c.peso,
    zScore: c.zScore,
  }))

  const s = statusConfig[paciente.estado] ?? statusConfig.risk

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className="flex items-start justify-between mb-8">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate('/cli/pacientes')}
            className="mt-1 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-border transition-colors text-neutral-sub">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-neutral-text">{paciente.nombre}</h1>
              <StatusBadge estado={paciente.estado} />
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-sub">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {paciente.fechaNacimiento} · {paciente.edad}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {paciente.residencia.municipio !== '—'
                  ? `${paciente.residencia.municipio}, ${paciente.residencia.departamento}`
                  : paciente.residencia.departamento}
              </span>
              <span>{paciente.establecimiento}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="clay-btn flex items-center gap-2 text-white font-semibold px-4 py-2.5 text-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrar control
        </button>
      </motion.div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Peso',    value: `${paciente.peso} kg`,  color: '#4FB4D2', bg: 'rgba(79,180,210,0.10)'  },
          { label: 'Talla',   value: `${paciente.talla} cm`, color: '#6FCF97', bg: 'rgba(111,207,151,0.12)' },
          { label: 'IMC',     value: paciente.imc,           color: '#81D4EA', bg: 'rgba(129,212,234,0.12)' },
          { label: 'Z-score', value: paciente.zScore,        color: zScoreColor(paciente.zScore), bg: `${zScoreColor(paciente.zScore)}18` },
        ].map(({ label, value, color, bg }, i) => (
          <motion.div key={label} custom={i} initial="hidden" animate="visible" variants={fadeUp}
            className="clay-card p-5">
            <p className="text-xs text-neutral-sub mb-2">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Información del paciente */}
      <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}
        className="clay-card p-6 mb-6">
        <h2 className="text-sm font-bold text-neutral-text mb-4">Información del paciente</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-[10px] font-semibold text-neutral-sub uppercase tracking-wide mb-1">DNI / CC</p>
            <p className="text-sm font-semibold text-neutral-text">{paciente.dni}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-neutral-sub uppercase tracking-wide mb-1">Sexo</p>
            <p className="text-sm font-semibold text-neutral-text">{paciente.sexo}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-neutral-sub uppercase tracking-wide mb-1">Área</p>
            <p className="text-sm font-semibold text-neutral-text">{paciente.residencia.area}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-neutral-sub uppercase tracking-wide mb-1">Establecimiento</p>
            <p className="text-sm font-semibold text-neutral-text truncate">{paciente.establecimiento}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-4 border-t border-neutral-border">
          <div className="rounded-xl p-3.5 flex items-start gap-3"
            style={{ background: 'rgba(79,180,210,0.06)', border: '1px solid rgba(79,180,210,0.12)' }}>
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#4FB4D2' }} />
            <div>
              <p className="text-[10px] font-bold text-neutral-sub uppercase tracking-wide mb-1">Lugar de procedencia</p>
              <p className="text-xs font-semibold text-neutral-text">{paciente.procedencia.departamento}</p>
              <p className="text-xs text-neutral-sub">{paciente.procedencia.municipio}</p>
            </div>
          </div>
          <div className="rounded-xl p-3.5 flex items-start gap-3"
            style={{ background: 'rgba(111,207,151,0.06)', border: '1px solid rgba(111,207,151,0.15)' }}>
            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#6FCF97' }} />
            <div>
              <p className="text-[10px] font-bold text-neutral-sub uppercase tracking-wide mb-1">Lugar de residencia</p>
              <p className="text-xs font-semibold text-neutral-text">{paciente.residencia.departamento}</p>
              <p className="text-xs text-neutral-sub">
                {paciente.residencia.municipio}
                {paciente.residencia.area !== '—' && ` · ${paciente.residencia.area}`}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Gráfico + Estado/Predicción */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">

        {/* Gráfico evolución de peso */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}
          className="clay-card p-6 lg:col-span-2">
          <h2 className="text-sm font-bold text-neutral-text mb-5">Evolución de peso (kg)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="pesoGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4FB4D2" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#4FB4D2" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9EEF5" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone" dataKey="peso" stroke="#4FB4D2" strokeWidth={2.5}
                fill="url(#pesoGradient)"
                dot={<CustomDot />} activeDot={{ r: 7, stroke: '#4FB4D2', fill: 'white', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3">
            {[
              { label: 'Adecuado',  color: '#52C41A' },
              { label: 'Riesgo',    color: '#FBC02D' },
              { label: 'D. Leve',   color: '#FB8C00' },
              { label: 'D. Moderada/Severa', color: '#E53935' },
            ].map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1.5 text-[10px] text-neutral-sub">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Estado nutricional + Predicción ML */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={fadeUp}
          className="flex flex-col gap-4">

          {/* Estado nutricional */}
          <div className="clay-card p-5 flex-1">
            <h2 className="text-xs font-bold text-neutral-text mb-4 uppercase tracking-wide">
              Estado nutricional
            </h2>
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: s.bg }}>
                <span className="text-2xl font-black" style={{ color: s.color }}>
                  {paciente.zScore}
                </span>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold" style={{ color: s.color }}>{s.label}</p>
                <p className="text-xs text-neutral-sub mt-0.5">Z-score P/E · OMS</p>
              </div>
            </div>
          </div>

          {/* Predicción ML */}
          <div className="clay-card p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="w-4 h-4" style={{ color: '#4FB4D2' }} />
              <h2 className="text-xs font-bold text-neutral-text uppercase tracking-wide">
                Predicción ML
              </h2>
            </div>
            <div className="mb-3">
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-xs text-neutral-sub">Probabilidad de riesgo</span>
                <span className="text-lg font-black" style={{ color: s.color }}>
                  {paciente.prediccion.probabilidad}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${paciente.prediccion.probabilidad}%`, background: s.color }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-xs text-neutral-sub">
              <span>Modelo: <span className="font-medium text-neutral-text">{paciente.prediccion.modelo}</span></span>
              <span>Confianza: <span className="font-medium text-neutral-text">{paciente.prediccion.confianza}</span></span>
            </div>
          </div>

        </motion.div>
      </div>

      {/* Recomendaciones + Alertas */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">

        {/* Recomendaciones clínicas */}
        <motion.div custom={6} initial="hidden" animate="visible" variants={fadeUp}
          className="clay-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-neutral-text">Recomendaciones clínicas</h2>
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
                <Sparkles className="w-3 h-3" />
                IA personalizada
              </span>
            ) : (
              <span className="text-[10px] text-neutral-sub">Estándar</span>
            )}
          </div>
          {loadingRecs && recomendaciones.length === 0 ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-4 rounded-lg animate-pulse" style={{ background: '#F1F5F9' }} />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {recomendaciones.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-neutral-sub">
                  <span className="text-[10px] font-bold flex-shrink-0 mt-0.5 w-4"
                    style={{ color: '#4FB4D2' }}>
                    {i + 1}.
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Alertas del paciente */}
        <motion.div custom={7} initial="hidden" animate="visible" variants={fadeUp}
          className="clay-card p-6">
          <h2 className="text-sm font-bold text-neutral-text mb-4">Alertas activas</h2>
          {paciente.alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle className="w-8 h-8" style={{ color: '#52C41A' }} />
              <p className="text-xs text-neutral-sub">Sin alertas activas</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {paciente.alertas.map(({ tipo, nivel, tiempo }, i) => {
                const n = statusConfig[nivel]
                return (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-black/[0.03] transition-colors">
                    <TrendingDown className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: n.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-text">{tipo}</p>
                      <p className="text-[10px] text-neutral-sub mt-0.5">{tiempo}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

      </div>

      {/* Historial de controles */}
      <motion.div custom={8} initial="hidden" animate="visible" variants={fadeUp}
        className="clay-card overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-border">
          <h2 className="text-sm font-bold text-neutral-text">Historial de controles</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] lg:min-w-full">
            <thead>
              <tr className="border-b border-neutral-border">
                <th className="text-left text-xs font-semibold text-neutral-sub px-6 py-3">Fecha</th>
                <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3">Peso</th>
                <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3">Talla</th>
                <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3">IMC</th>
                <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3">Z-score</th>
                <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3">Estado</th>
                <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3 hidden lg:table-cell">Observación</th>
              </tr>
            </thead>
            <tbody>
              {paciente.historial.map(({ fecha, peso, talla, imc, zScore, estado, obs }, i) => (
                <tr key={i} className="border-b border-neutral-border last:border-0 hover:bg-neutral-bg transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-neutral-text">{fecha}</td>
                  <td className="px-4 py-3 text-sm text-neutral-sub">{peso} kg</td>
                  <td className="px-4 py-3 text-sm text-neutral-sub">{talla} cm</td>
                  <td className="px-4 py-3 text-sm text-neutral-sub">{imc}</td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: zScoreColor(zScore) }}>{zScore}</td>
                  <td className="px-4 py-3"><StatusBadge estado={estado} /></td>
                  <td className="px-4 py-3 text-xs text-neutral-sub hidden lg:table-cell">{obs || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <NuevoControlDrawer
            paciente={paciente}
            onClose={() => setShowDrawer(false)}
            onControlAdded={fetchPaciente}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
