import { useState, useEffect, useRef } from 'react'
import {
  CheckCircle, TrendingUp, RefreshCw, Trash2, FolderX,
  Award, Zap, Info, Sparkles, X, Send, Loader2,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts'
import api from '../../services/api'

const CARD = {
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: 20,
  boxShadow:
    'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.07), ' +
    '0 4px 18px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.04)',
  padding: '20px 24px',
}

const PALETTE = ['#4FB4D2', '#6FCF97', '#FBC02D', '#E53935', '#9B59B6', '#E67E22']

const METRICAS = [
  { key: 'accuracy',    label: 'Accuracy',    desc: 'Exactitud global' },
  { key: 'f1_weighted', label: 'F1 Weighted',  desc: 'Métrica principal de selección' },
  { key: 'f1_macro',    label: 'F1 Macro',     desc: 'Balance entre clases' },
]

function flatMetrics(metricas) {
  if (!metricas) return {}
  if (metricas.modelo_A) return { ...metricas.modelo_A }
  return metricas
}

function metricColor(v) {
  return v >= 0.85 ? '#27AE60' : v >= 0.75 ? '#4FB4D2' : v >= 0.60 ? '#FBC02D' : '#E53935'
}

function Badge({ children, color, bg }) {
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: bg, color }}>
      {children}
    </span>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-border rounded-xl shadow px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-neutral-sub">{p.name}:</span>
          <span className="font-bold">{p.value?.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

// ── Avatar NIVI ───────────────────────────────────────────────────────────────
function NiviAvatar({ size = 36 }) {
  const [p, setP] = useState(false)
  const t = useRef(null)
  useEffect(() => {
    function tick() { t.current = setTimeout(() => { setP(true); t.current = setTimeout(() => { setP(false); tick() }, 120) }, 2000 + Math.random() * 3000) }
    tick(); return () => clearTimeout(t.current)
  }, [])
  return (
    <div style={{ width: size, height: size, position: 'relative', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
      <img src="/NIVI 1.png" alt="NIVI" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: p ? 0 : 1, transition: 'opacity 55ms ease' }} />
      <img src="/NIVI 2.png" alt=""   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: p ? 1 : 0, transition: 'opacity 55ms ease' }} />
    </div>
  )
}

function MensajeMarkdown({ texto }) {
  const partes = texto.split('\n').map((linea, i) => {
    const bold = linea.split(/\*\*(.*?)\*\*/g).map((s, j) => j % 2 === 1 ? <strong key={j}>{s}</strong> : s)
    const esBullet = linea.trimStart().startsWith('- ') || linea.trimStart().startsWith('• ')
    if (esBullet) return <li key={i} className="ml-4 list-disc leading-relaxed">{bold}</li>
    if (linea.trim() === '') return <br key={i} />
    return <p key={i} className="leading-relaxed">{bold}</p>
  })
  return <div className="flex flex-col gap-0.5 text-base">{partes}</div>
}

function formatearContextoModelo(models) {
  const activo = models.find(m => m.activo)
  if (!activo) return 'No hay modelo activo en el sistema.'
  const met   = activo.metricas || {}
  const ma    = met.modelo_A || met
  const mb    = met.modelo_B || {}
  const tipo  = { rf: 'Random Forest', xgb: 'XGBoost (HistGB)', gb: 'Gradient Boosting', lr: 'Regresión Logística' }

  const pct = (v) => v != null ? `${(parseFloat(v) * 100).toFixed(1)}%` : 'N/D'

  return [
    `Explícame las métricas del modelo ML activo del Sistema de Vigilancia Nutricional Infantil:`,
    ``,
    `MODELO ACTIVO: ${activo.nombre}`,
    `Tipo de algoritmo: ${tipo[activo.tipo] || activo.tipo?.toUpperCase() || 'N/D'}`,
    ``,
    `MÉTRICAS — MODELO A (con IMC):`,
    `- Accuracy:    ${pct(ma.accuracy)}`,
    `- F1 Weighted: ${pct(ma.f1_weighted)}`,
    `- F1 Macro:    ${pct(ma.f1_macro)}`,
    `- CV Accuracy: ${pct(ma.cv_accuracy)}`,
    ``,
    `MÉTRICAS — MODELO B (sin IMC, fallback rural):`,
    `- Accuracy:    ${pct(mb.accuracy)}`,
    `- F1 Weighted: ${pct(mb.f1_weighted)}`,
    `- F1 Macro:    ${pct(mb.f1_macro)}`,
    ``,
    `DATOS DE ENTRENAMIENTO:`,
    `- Muestras totales: ${met.n_muestras?.toLocaleString() || 'N/D'}`,
    `- SMOTE aplicado: ${met.smote ? 'Sí' : 'No'}`,
    `- Fuentes: ${(met.fuentes || []).join(', ') || 'N/D'}`,
    ``,
    `Por favor explícame en lenguaje sencillo qué significa cada métrica y qué nos dice sobre el rendimiento del modelo. No des recomendaciones ni aspectos a mejorar, solo explica lo que indican los números y qué diferencia hay entre el Modelo A y el Modelo B.`,
  ].join('\n')
}

// ── Panel NIVI para métricas de modelos ───────────────────────────────────────
function NiviMetricas({ models, onClose }) {
  const [mensajes,  setMensajes]  = useState([])
  const [input,     setInput]     = useState('')
  const [cargando,  setCargando]  = useState(true)
  const [analizado, setAnalizado] = useState(false)
  const endRef  = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes, cargando])

  useEffect(() => {
    async function analizar() {
      setCargando(true)
      try {
        const { default: api } = await import('../../services/api')
        const { data } = await api.post('/chat', {
          mensaje: formatearContextoModelo(models),
          historial: [],
        })
        setMensajes([{ role: 'assistant', content: data.respuesta }])
        setAnalizado(true)
      } catch {
        setMensajes([{ role: 'assistant', content: 'No pude cargar el análisis. Puedes preguntarme directamente sobre las métricas del modelo.' }])
        setAnalizado(true)
      } finally { setCargando(false); setTimeout(() => inputRef.current?.focus(), 100) }
    }
    analizar()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function enviar() {
    const msg = input.trim()
    if (!msg || cargando) return
    setInput('')
    const hist = mensajes.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }))
    setMensajes(prev => [...prev, { role: 'user', content: msg }])
    setCargando(true)
    try {
      const { default: api } = await import('../../services/api')
      const { data } = await api.post('/chat', { mensaje: msg, historial: hist.slice(-16) })
      setMensajes(prev => [...prev, { role: 'assistant', content: data.respuesta }])
    } catch {
      setMensajes(prev => [...prev, { role: 'assistant', content: 'Error al conectar. Intenta de nuevo.' }])
    } finally { setCargando(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen z-50 flex flex-col"
        style={{ width: 'min(540px, 96vw)', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', border: '1px solid rgba(79,180,210,0.14)', boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-border flex items-center gap-3 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.9)' }}>
          <NiviAvatar size={46} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-neutral-text leading-none">NIVI</p>
            <p className="text-xs mt-1 font-medium" style={{ color: '#52C41A' }}>● Explicación de métricas ML</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-bg transition-colors text-neutral-sub">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3" style={{ minHeight: 0 }}>
          {cargando && mensajes.length === 0 && (
            <div className="flex gap-3 items-end">
              <NiviAvatar size={42} />
              <div className="px-5 py-4 rounded-2xl flex items-center gap-2" style={{ background: '#F1F8FB', borderRadius: '4px 18px 18px 18px' }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#4FB4D2' }} />
                <span className="text-sm text-neutral-sub">Analizando las métricas del modelo…</span>
              </div>
            </div>
          )}
          {mensajes.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && <div className="mt-0.5 flex-shrink-0"><NiviAvatar size={42} /></div>}
              <div className="px-5 py-4 rounded-2xl text-base"
                style={m.role === 'user'
                  ? { background: 'linear-gradient(135deg,#4FB4D2,#3DA0BC)', color: '#fff', borderRadius: '18px 18px 4px 18px', maxWidth: '65%' }
                  : { background: '#F1F8FB', color: '#374151', borderRadius: '4px 18px 18px 18px', maxWidth: '80%' }}>
                {m.role === 'assistant' ? <MensajeMarkdown texto={m.content} /> : <p className="leading-relaxed">{m.content}</p>}
              </div>
            </div>
          ))}
          {cargando && mensajes.length > 0 && (
            <div className="flex gap-3 items-end">
              <NiviAvatar size={42} />
              <div className="px-5 py-4 rounded-2xl flex items-center gap-2" style={{ background: '#F1F8FB', borderRadius: '4px 18px 18px 18px' }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#4FB4D2' }} />
                <span className="text-sm text-neutral-sub">NIVI está pensando…</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-neutral-border flex-shrink-0" style={{ background: 'rgba(255,255,255,0.92)' }}>
          <div className="flex gap-2 items-end">
            <textarea ref={inputRef} rows={1} value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              placeholder="Pregunta sobre las métricas… (Enter para enviar)"
              disabled={cargando}
              className="flex-1 input-clinical text-base resize-none overflow-hidden"
              style={{ minHeight: 40, maxHeight: 96, lineHeight: '1.5' }} />
            <button onClick={enviar} disabled={!input.trim() || cargando}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#4FB4D2,#3DA0BC)' }}>
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-neutral-sub mt-2 text-center">
            NIVI explica las métricas en lenguaje comprensible · Puedes hacer preguntas de seguimiento
          </p>
        </div>
      </div>
    </>
  )
}

export default function ModelosANL() {
  const [models,        setModels]        = useState([])
  const [selectedId,    setSelectedId]    = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [toast,         setToast]         = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(false)
  const [cleaning,      setCleaning]      = useState(false)
  const [niviAbierto,   setNiviAbierto]   = useState(false)

  function fetchModels() {
    setLoading(true)
    api.get('/modelos')
      .then(({ data }) => {
        setModels(data)
        const activo = data.find(m => m.activo)
        setSelectedId(activo?.id ?? data[0]?.id ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchModels()
    const onVisible = () => { if (!document.hidden) fetchModels() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  async function handleLimpiarHuerfanos() {
    setCleaning(true)
    try {
      const { data } = await api.post('/modelos/limpiar-huerfanos')
      const n = data.total
      showToast(n === 0 ? 'Sin archivos huérfanos' : `${n} archivo(s) huérfano(s) eliminado(s)`)
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al limpiar archivos', true)
    } finally { setCleaning(false) }
  }

  async function handleEliminar(id) {
    setDeleting(true)
    try {
      await api.delete(`/modelos/${id}`)
      setModels(prev => prev.filter(m => m.id !== id))
      if (selectedId === id) setSelectedId(null)
      showToast('Modelo eliminado')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al eliminar', true)
    } finally { setDeleting(false); setConfirmDelete(null) }
  }

  function showToast(msg, isError = false) {
    setToast({ msg, isError })
    setTimeout(() => setToast(''), 3500)
  }

  const selected     = models.find(m => m.id === selectedId) ?? models[0]
  const modeloActivo = models.find(m => m.activo)

  // Datos para BarChart comparativo — todas las métricas × todos los modelos
  const barData = METRICAS.map(({ key, label }) => {
    const entry = { metric: label }
    models.forEach(m => {
      const v = flatMetrics(m.metricas)[key]
      entry[m.nombre] = v !== undefined ? parseFloat((v * 100).toFixed(1)) : 0
    })
    return entry
  })

  // Datos para radar
  const radarData = METRICAS.map(({ key, label }) => {
    const entry = { metric: label }
    models.forEach(m => {
      const v = flatMetrics(m.metricas)[key]
      entry[m.nombre] = v !== undefined ? parseFloat((v * 100).toFixed(1)) : 0
    })
    return entry
  })

  // Determinar el mejor modelo por F1 Weighted
  const mejorModelo = models.reduce((best, m) => {
    const f1 = flatMetrics(m.metricas).f1_weighted ?? 0
    return f1 > (flatMetrics(best?.metricas).f1_weighted ?? 0) ? m : best
  }, null)

  return (
    <div className="p-6 space-y-5 bg-neutral-bg min-h-screen">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>
            Comparativa de Modelos ML
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>
            El mejor modelo se activa automáticamente tras cada entrenamiento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleLimpiarHuerfanos} disabled={cleaning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-60 hover:bg-orange-50"
            style={{ color: '#E65100' }}>
            {cleaning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FolderX className="w-3.5 h-3.5" />}
            {cleaning ? 'Limpiando...' : 'Limpiar huérfanos'}
          </button>
          <button onClick={fetchModels}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all text-neutral-sub hover:bg-neutral-bg">
            <RefreshCw className="w-3.5 h-3.5" /> Recargar
          </button>
          <button
            onClick={() => setNiviAbierto(true)}
            disabled={loading || models.length === 0}
            className="clay-btn flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
            <Sparkles className="w-4 h-4" /> Explicar con NIVI
          </button>
        </div>
      </div>

      {/* Panel NIVI */}
      {niviAbierto && <NiviMetricas models={models} onClose={() => setNiviAbierto(false)} />}

      {/* Toast */}
      {toast && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: toast.isError ? 'rgba(229,57,53,0.08)' : 'rgba(111,207,151,0.12)',
            color:      toast.isError ? '#C62828' : '#2E7D4F',
            border:     `1px solid ${toast.isError ? 'rgba(229,57,53,0.2)' : 'rgba(111,207,151,0.25)'}`,
          }}>
          {toast.msg}
        </div>
      )}

      {/* Banner modelo activo auto-seleccionado */}
      {modeloActivo && !loading && (
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: 'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.07), 0 4px 18px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.04)',
            borderRadius: 20,
          }}>
          {/* Icono clay */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), inset 0 -2px 4px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.07)' }}>
            <Zap className="w-5 h-5" style={{ color: '#27AE60' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-neutral-text">
                {modeloActivo.nombre}
              </p>
              {/* Badge estilo sidebar activo */}
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold"
                style={{ background: 'rgba(39,174,96,0.1)', color: '#27AE60', boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), inset 0 -2px 4px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.06)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#27AE60' }} />
                ACTIVO EN CLI
              </span>
            </div>
            <p className="text-xs mt-1 text-neutral-sub">
              Seleccionado automáticamente · F1 Weighted: <strong className="text-neutral-text">{((flatMetrics(modeloActivo.metricas).f1_weighted ?? 0) * 100).toFixed(1)}%</strong>
              {' · '}Criterio: mejor F1 Weighted entre todos los modelos entrenados
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Info className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
            <span className="text-xs text-neutral-sub">
              Se actualiza automáticamente al entrenar
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: '#4FB4D2' }} />
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-neutral-sub">
          <TrendingUp className="w-10 h-10" style={{ color: '#CBD5E1' }} />
          <p className="text-sm">No hay modelos entrenados. Ve a Entrenamiento para generar uno.</p>
        </div>
      ) : (
        <>
          {/* ── Gráfica comparativa principal ────────────────────────── */}
          <div style={CARD}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold" style={{ color: '#1A1F2B' }}>
                  Comparativa de métricas
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#54606E' }}>
                  Accuracy, F1 Weighted y F1 Macro por modelo
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
                <Award className="w-3.5 h-3.5" style={{ color: '#FBC02D' }} />
                Selección por F1 Weighted
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#546E7A' }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {models.map((m, i) => (
                  <Bar key={m.id} dataKey={m.nombre} fill={PALETTE[i % PALETTE.length]}
                    radius={[4, 4, 0, 0]}
                    strokeWidth={m.activo ? 2 : 0}
                    stroke={m.activo ? '#27AE60' : 'none'}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-5">

            {/* ── Radar comparativo ────────────────────────────────── */}
            <div style={CARD}>
              <p className="text-sm font-bold mb-1" style={{ color: '#1A1F2B' }}>Radar comparativo</p>
              <p className="text-xs mb-3" style={{ color: '#54606E' }}>Perfil de rendimiento global</p>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E0E6ED" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#54606E' }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E0E6ED', fontSize: 11 }} />
                  {models.map((m, i) => (
                    <Radar key={m.id} name={m.nombre} dataKey={m.nombre}
                      stroke={PALETTE[i % PALETTE.length]}
                      fill={PALETTE[i % PALETTE.length]}
                      fillOpacity={m.activo ? 0.18 : 0.06}
                      strokeWidth={m.activo ? 2.5 : 1.5}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {models.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    <span className="text-[10px]" style={{ color: m.activo ? '#27AE60' : '#54606E', fontWeight: m.activo ? 700 : 400 }}>
                      {m.nombre.split(' ').slice(0, 2).join(' ')}
                      {m.activo ? ' ★' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Ranking de modelos ───────────────────────────────── */}
            <div style={{ ...CARD, padding: '20px' }}>
              <p className="text-sm font-bold mb-1" style={{ color: '#1A1F2B' }}>Ranking por F1 Weighted</p>
              <p className="text-xs mb-4" style={{ color: '#54606E' }}>Métrica usada para la auto-selección</p>
              <div className="space-y-3">
                {[...models]
                  .sort((a, b) => (flatMetrics(b.metricas).f1_weighted ?? 0) - (flatMetrics(a.metricas).f1_weighted ?? 0))
                  .map((m, rank) => {
                    const met    = flatMetrics(m.metricas)
                    const f1     = met.f1_weighted ?? 0
                    const acc    = met.accuracy ?? 0
                    const esMejor = rank === 0
                    return (
                      <div key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all"
                        style={{
                          background: m.activo ? 'rgba(39,174,96,0.06)' : selectedId === m.id ? 'rgba(79,180,210,0.06)' : 'rgba(0,0,0,0.02)',
                          border: m.activo ? '1px solid rgba(39,174,96,0.20)' : selectedId === m.id ? '1px solid rgba(79,180,210,0.20)' : '1px solid transparent',
                        }}>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: esMejor ? '#FBC02D' : '#F1F5F9', color: esMejor ? '#fff' : '#64748B' }}>
                          {rank + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs font-semibold truncate" style={{ color: '#1A1F2B' }}>{m.nombre}</p>
                            {m.activo && <Zap className="w-3 h-3 flex-shrink-0" style={{ color: '#27AE60' }} />}
                          </div>
                          <div className="flex items-center gap-2 text-[10px]" style={{ color: '#64748B' }}>
                            <span>F1: <strong style={{ color: metricColor(f1) }}>{(f1 * 100).toFixed(1)}%</strong></span>
                            <span>Acc: <strong>{(acc * 100).toFixed(1)}%</strong></span>
                          </div>
                        </div>
                        {!m.activo && (
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDelete(m.id) }}
                            className="p-1.5 rounded-lg opacity-30 hover:opacity-100 transition-all flex-shrink-0"
                            title="Eliminar modelo"
                            style={{ color: '#E53935' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* ── Detalle del modelo seleccionado ─────────────────── */}
            <div style={{ ...CARD, padding: '20px' }}>
              {selected ? (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#1A1F2B' }}>{selected.nombre}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#54606E' }}>
                        {selected.descripcion || `Versión ${selected.version}`}
                      </p>
                    </div>
                    {selected.activo && (
                      <div className="flex items-center gap-1" style={{ color: '#27AE60' }}>
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-bold">Activo</span>
                      </div>
                    )}
                  </div>

                  {/* Métricas detalladas */}
                  <div className="space-y-3 mb-4">
                    {METRICAS.map(({ key, label, desc }) => {
                      const v = flatMetrics(selected.metricas)[key]
                      if (v === undefined) return null
                      return (
                        <div key={key}>
                          <div className="flex justify-between mb-1">
                            <div>
                              <span className="text-xs font-semibold" style={{ color: '#374151' }}>{label}</span>
                              {key === 'f1_weighted' && (
                                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                  style={{ background: 'rgba(251,192,45,0.15)', color: '#B45309' }}>
                                  CRITERIO
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold" style={{ color: metricColor(v) }}>
                              {(v * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: '#F1F5F9' }}>
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${v * 100}%`, background: metricColor(v) }} />
                          </div>
                          <p className="text-[10px] mt-0.5" style={{ color: '#9CA3AF' }}>{desc}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Modelo B */}
                  {selected.metricas?.modelo_B && (
                    <div className="pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
                      <p className="text-[10px] font-semibold mb-2" style={{ color: '#9CA3AF' }}>
                        MODELO B — Fallback sin IMC
                      </p>
                      {METRICAS.slice(0, 2).map(({ key, label }) => {
                        const v = selected.metricas.modelo_B[key]
                        if (!v) return null
                        return (
                          <div key={key} className="flex justify-between text-xs mb-1">
                            <span style={{ color: '#54606E' }}>{label}</span>
                            <span className="font-bold" style={{ color: metricColor(v) }}>
                              {(v * 100).toFixed(1)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-neutral-sub">Selecciona un modelo del ranking</p>
              )}
            </div>
          </div>

          {/* ── Modal confirmación eliminación ───────────────────── */}
          {confirmDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(3px)' }}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <p className="text-sm font-bold mb-2" style={{ color: '#1A1F2B' }}>
                  ¿Eliminar este modelo?
                </p>
                <p className="text-xs mb-4" style={{ color: '#54606E' }}>
                  Se borrarán los archivos del disco. Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => handleEliminar(confirmDelete)} disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60"
                    style={{ background: '#E53935', color: '#fff' }}>
                    {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                  <button onClick={() => setConfirmDelete(null)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium border border-neutral-border">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
