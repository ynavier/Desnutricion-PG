import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Plus, AlertTriangle, Brain,
  MapPin, Calendar, X, TrendingDown, CheckCircle,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
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

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockPacientes = {
  1: {
    nombre: 'Carlos Mendoza R.', sexo: 'M', edad: '2a 3m',
    fechaNacimiento: '15 feb 2024', zona: 'Lima Norte',
    establecimiento: 'C.S. Comas', estado: 'risk',
    peso: 10.2, talla: 84, imc: 14.4, zScore: -1.8,
    prediccion: { probabilidad: 72, modelo: 'Random Forest', confianza: 'Alta' },
    alertas: [
      { tipo: 'Tendencia negativa de peso',  nivel: 'moderate', tiempo: 'Hace 1 h' },
      { tipo: 'Riesgo alto de desnutrición', nivel: 'moderate', tiempo: 'Hace 3 h' },
    ],
    recomendaciones: [
      'Aumentar frecuencia de controles a mensual',
      'Reforzar alimentación complementaria rica en proteínas y hierro',
      'Derivar a nutricionista para evaluación especializada',
      'Verificar factores socioeconómicos del hogar',
      'Monitorear curva de crecimiento en próximo control',
    ],
    historial: [
      { fecha: '20 may 2026', peso: 10.2, talla: 84, imc: 14.4, zScore: -1.8, estado: 'risk',     obs: 'Tendencia negativa' },
      { fecha: '15 feb 2026', peso: 9.8,  talla: 81, imc: 14.9, zScore: -1.5, estado: 'risk',     obs: '' },
      { fecha: '10 nov 2025', peso: 9.1,  talla: 78, imc: 14.9, zScore: -1.2, estado: 'adequate', obs: 'Control rutinario' },
      { fecha: '05 ago 2025', peso: 8.4,  talla: 74, imc: 15.3, zScore: -0.8, estado: 'adequate', obs: '' },
      { fecha: '20 may 2025', peso: 7.8,  talla: 70, imc: 15.9, zScore: -0.5, estado: 'adequate', obs: 'Control rutinario' },
    ],
  },
  2: {
    nombre: 'Sofía Quispe T.', sexo: 'F', edad: '1a 8m',
    fechaNacimiento: '10 sep 2024', zona: 'San Juan de Lurigancho',
    establecimiento: 'C.S. Zarate', estado: 'moderate',
    peso: 8.8, talla: 78, imc: 14.5, zScore: -2.4,
    prediccion: { probabilidad: 88, modelo: 'XGBoost', confianza: 'Muy alta' },
    alertas: [
      { tipo: 'Desnutrición moderada confirmada', nivel: 'moderate', tiempo: 'Hace 3 h' },
    ],
    recomendaciones: [
      'Referencia urgente a nutricionista y pediatra',
      'Iniciar suplementación con micronutrientes',
      'Coordinar apoyo alimentario con programa social',
      'Visita domiciliaria en 15 días',
    ],
    historial: [
      { fecha: '19 may 2026', peso: 8.8,  talla: 78, imc: 14.5, zScore: -2.4, estado: 'moderate', obs: 'Derivada a nutricionista' },
      { fecha: '10 feb 2026', peso: 8.5,  talla: 76, imc: 14.7, zScore: -2.1, estado: 'moderate', obs: '' },
      { fecha: '05 nov 2025', peso: 8.0,  talla: 73, imc: 15.0, zScore: -1.8, estado: 'risk',     obs: '' },
    ],
  },
  3: { nombre: 'Andrés Torres L.', sexo: 'M', edad: '3a 5m', fechaNacimiento: '05 dic 2022', zona: 'Miraflores', establecimiento: 'C.S. Miraflores', estado: 'adequate', peso: 13.5, talla: 95, imc: 14.9, zScore: -0.4, prediccion: { probabilidad: 12, modelo: 'Random Forest', confianza: 'Alta' }, alertas: [], recomendaciones: ['Mantener controles rutinarios cada 3 meses', 'Continuar con dieta balanceada'], historial: [{ fecha: '21 may 2026', peso: 13.5, talla: 95, imc: 14.9, zScore: -0.4, estado: 'adequate', obs: 'Control rutinario' }, { fecha: '20 feb 2026', peso: 13.0, talla: 93, imc: 15.0, zScore: -0.3, estado: 'adequate', obs: '' }] },
  4: { nombre: 'Lucía Flores C.', sexo: 'F', edad: '4a 1m', fechaNacimiento: '20 abr 2022', zona: 'Villa El Salvador', establecimiento: 'C.S. VES', estado: 'mild', peso: 14.1, talla: 99, imc: 14.4, zScore: -2.1, prediccion: { probabilidad: 61, modelo: 'Gradient Boosting', confianza: 'Media' }, alertas: [{ tipo: 'Sin seguimiento > 30 días', nivel: 'mild', tiempo: 'Hace 1 d' }], recomendaciones: ['Aumentar frecuencia de controles', 'Suplementar con hierro y vitamina A', 'Orientación nutricional a la madre'], historial: [{ fecha: '18 may 2026', peso: 14.1, talla: 99, imc: 14.4, zScore: -2.1, estado: 'mild', obs: '' }, { fecha: '10 feb 2026', peso: 13.8, talla: 97, imc: 14.6, zScore: -1.9, estado: 'mild', obs: '' }] },
  5: { nombre: 'Diego Mamani H.', sexo: 'M', edad: '0a 11m', fechaNacimiento: '01 jun 2025', zona: 'Ate Vitarte', establecimiento: 'C.S. Vitarte', estado: 'severe', peso: 7.2, talla: 70, imc: 14.7, zScore: -3.5, prediccion: { probabilidad: 95, modelo: 'XGBoost', confianza: 'Muy alta' }, alertas: [{ tipo: 'Desnutrición severa detectada', nivel: 'severe', tiempo: 'Hace 5 h' }, { tipo: 'Prioridad clínica alta', nivel: 'severe', tiempo: 'Hace 5 h' }], recomendaciones: ['URGENTE: Derivación hospitalaria inmediata', 'Evaluación pediátrica en menos de 24 horas', 'Iniciar protocolo de recuperación nutricional', 'Notificar a autoridad de salud pública'], historial: [{ fecha: '17 may 2026', peso: 7.2, talla: 70, imc: 14.7, zScore: -3.5, estado: 'severe', obs: 'Derivación urgente' }, { fecha: '10 abr 2026', peso: 7.0, talla: 68, imc: 15.2, zScore: -3.1, estado: 'severe', obs: '' }] },
  6: { nombre: 'Valentina Cruz M.', sexo: 'F', edad: '2a 7m', fechaNacimiento: '20 oct 2023', zona: 'Surco', establecimiento: 'C.S. Surco', estado: 'adequate', peso: 11.8, talla: 88, imc: 15.2, zScore: -0.2, prediccion: { probabilidad: 8, modelo: 'Random Forest', confianza: 'Alta' }, alertas: [], recomendaciones: ['Continuar con controles rutinarios', 'Mantener alimentación equilibrada'], historial: [{ fecha: '22 may 2026', peso: 11.8, talla: 88, imc: 15.2, zScore: -0.2, estado: 'adequate', obs: 'Control rutinario' }] },
  7: { nombre: 'Mateo Huanca P.', sexo: 'M', edad: '1a 2m', fechaNacimiento: '20 mar 2025', zona: 'Villa María del Triunfo', establecimiento: 'C.S. VMT', estado: 'risk', peso: 9.1, talla: 74, imc: 16.6, zScore: -1.3, prediccion: { probabilidad: 48, modelo: 'Regresión Logística', confianza: 'Media' }, alertas: [{ tipo: 'Riesgo nutricional', nivel: 'risk', tiempo: 'Hace 2 d' }], recomendaciones: ['Control mensual recomendado', 'Orientación sobre lactancia y alimentación complementaria'], historial: [{ fecha: '15 may 2026', peso: 9.1, talla: 74, imc: 16.6, zScore: -1.3, estado: 'risk', obs: '' }] },
  8: { nombre: 'Isabella Ramos L.', sexo: 'F', edad: '3a 9m', fechaNacimiento: '15 ago 2022', zona: 'San Borja', establecimiento: 'C.S. San Borja', estado: 'adequate', peso: 14.8, talla: 97, imc: 15.7, zScore: -0.1, prediccion: { probabilidad: 5, modelo: 'Random Forest', confianza: 'Alta' }, alertas: [], recomendaciones: ['Control rutinario en 3 meses', 'Estado nutricional óptimo'], historial: [{ fecha: '22 may 2026', peso: 14.8, talla: 97, imc: 15.7, zScore: -0.1, estado: 'adequate', obs: 'Control rutinario' }] },
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
    <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
      style={{ color: s.color, background: s.bg }}>
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

function NuevoControlDrawer({ paciente, onClose }) {
  const [form, setForm] = useState({
    // Antropométrico
    peso: '', talla: '', perBraqui: '', zona: paciente.zona,
    // Signos clínicos
    edema: '', delgadez: '', palidez: '',
    pielReseca: '', hiperpigm: '', cambiosCabello: '',
    // Estado clínico
    enfermedades: [], apetito: '', micronutrientes: '',
    factores: [], observaciones: '',
  })
  const [submitted, setSubmitted] = useState(false)

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

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/25 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed right-0 top-0 h-screen w-full max-w-md bg-white z-50 flex flex-col shadow-2xl"
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
              <p className="font-bold text-neutral-text mb-1">Control registrado</p>
              <p className="text-xs text-neutral-sub">Los datos han sido guardados correctamente.</p>
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
            </div>

            {/* Zona geográfica */}
            <div>
              <label className="block text-xs font-bold text-neutral-text mb-1.5 uppercase tracking-wide">
                Zona geográfica
              </label>
              <input type="text" placeholder="Lima Norte"
                value={form.zona}
                onChange={e => setForm(p => ({ ...p, zona: e.target.value }))}
                className="input-clinical" />
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

            <button type="submit"
              className="clay-btn text-white font-semibold py-3 text-sm flex items-center justify-center gap-2 mt-auto">
              <Plus className="w-4 h-4" />
              Guardar control
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
  const [showDrawer, setShowDrawer] = useState(false)

  const paciente = mockPacientes[parseInt(id)]
  if (!paciente) {
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
    fecha: c.fecha.split(' ').slice(0, 2).join(' '),
    peso:  c.peso,
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
                {paciente.zona}
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

      {/* Gráfico + Estado/Predicción */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">

        {/* Gráfico evolución de peso */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={fadeUp}
          className="clay-card p-6 lg:col-span-2">
          <h2 className="text-sm font-bold text-neutral-text mb-5">Evolución de peso (kg)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D9EEF5" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone" dataKey="peso" stroke="#4FB4D2" strokeWidth={2.5}
                dot={<CustomDot />} activeDot={{ r: 7, stroke: '#4FB4D2', fill: 'white', strokeWidth: 2 }}
              />
            </LineChart>
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
          <h2 className="text-sm font-bold text-neutral-text mb-4">Recomendaciones clínicas</h2>
          <ul className="flex flex-col gap-3">
            {paciente.recomendaciones.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-xs text-neutral-sub">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(79,180,210,0.12)', color: '#4FB4D2' }}>
                  {i + 1}
                </span>
                {rec}
              </li>
            ))}
          </ul>
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
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: n.bg }}>
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
        <table className="w-full">
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
      </motion.div>

      {/* Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <NuevoControlDrawer
            paciente={paciente}
            onClose={() => setShowDrawer(false)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
