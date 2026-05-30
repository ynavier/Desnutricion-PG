import { useState, useEffect } from 'react'
import {
  CheckCircle, TrendingUp, RefreshCw, Trash2, FolderX,
  Award, Zap, Info,
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

export default function ModelosANL() {
  const [models,        setModels]        = useState([])
  const [selectedId,    setSelectedId]    = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [toast,         setToast]         = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting,      setDeleting]      = useState(false)
  const [cleaning,      setCleaning]      = useState(false)

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
        </div>
      </div>

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
          style={{ background: 'rgba(39,174,96,0.06)', border: '1px solid rgba(39,174,96,0.20)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(39,174,96,0.12)' }}>
            <Zap className="w-5 h-5" style={{ color: '#27AE60' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: '#27AE60' }}>
                Modelo activo — seleccionado automáticamente
              </p>
              <Badge color="#27AE60" bg="rgba(39,174,96,0.10)">EN USO EN CLI</Badge>
            </div>
            <p className="text-xs mt-0.5" style={{ color: '#54606E' }}>
              <strong style={{ color: '#1A1F2B' }}>{modeloActivo.nombre}</strong>
              {' · '}F1 Weighted: <strong>{((flatMetrics(modeloActivo.metricas).f1_weighted ?? 0) * 100).toFixed(1)}%</strong>
              {' · '}Criterio: mejor F1 Weighted entre todos los modelos entrenados
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Info className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
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
