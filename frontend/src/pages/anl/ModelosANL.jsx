import { useState, useEffect } from 'react'
import { CheckCircle, Star, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import api from '../../services/api'

const CARD = { background: '#fff', borderRadius: 16, border: '1px solid #E0E6ED', padding: '20px 24px' }

const metricLabels = {
  accuracy:    'Accuracy',
  f1_weighted: 'F1 Weighted',
  f1_macro:    'F1 Macro',
  recall_severa: 'Recall Severa',
}

const metricColor = (v) =>
  v >= 0.85 ? '#3DAB6B' : v >= 0.75 ? '#4FB4D2' : v >= 0.60 ? '#FBC02D' : '#E53935'

const radarColors = ['#4FB4D2', '#6FCF97', '#FBC02D', '#E53935']

// Extrae métricas planas del campo metricas JSONB
// Soporta tanto { accuracy, f1_weighted, ... } (plano) como
// { modelo_A: { accuracy, ... }, modelo_B: { ... } } (por submodelo)
function flatMetrics(metricas) {
  if (!metricas) return {}
  // Si tiene modelo_A, tomar modelo_A como referencia
  if (metricas.modelo_A) return { ...metricas.modelo_A }
  return metricas
}

function MetricBar({ label, value }) {
  if (value === undefined || value === null) return null
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: '#54606E' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: metricColor(value) }}>
          {(value * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#F0F0F0' }}>
        <div className="h-1.5 rounded-full transition-all"
          style={{ width: `${value * 100}%`, background: metricColor(value) }} />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 animate-pulse" style={{ background: '#F7F9FC', border: '1px solid #E0E6ED' }}>
      <div className="h-3 w-24 rounded mb-3" style={{ background: '#E0E6ED' }} />
      {[1, 2, 3, 4].map(n => (
        <div key={n} className="h-2.5 rounded mb-2" style={{ background: '#E0E6ED' }} />
      ))}
    </div>
  )
}

export default function ModelosANL() {
  const [models,     setModels]     = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [activating, setActivating] = useState(false)
  const [toast,      setToast]      = useState('')

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

  useEffect(() => { fetchModels() }, [])

  async function handleActivar(id) {
    setActivating(true)
    try {
      await api.put(`/modelos/${id}/activar`)
      setModels(prev => prev.map(m => ({ ...m, activo: m.id === id })))
      setToast('Modelo activado correctamente para el panel CLI')
      setTimeout(() => setToast(''), 3500)
    } catch (err) {
      setToast(err.response?.data?.detail || 'Error al activar el modelo')
      setTimeout(() => setToast(''), 4000)
    } finally {
      setActivating(false)
    }
  }

  const selected    = models.find(m => m.id === selectedId) ?? models[0]
  const selMetrics  = selected ? flatMetrics(selected.metricas) : {}
  const modeloActivo = models.find(m => m.activo)

  // Datos para el radar — muestra las 4 métricas de cada modelo
  const radarData = Object.entries(metricLabels).map(([key, label]) => {
    const entry = { metric: label }
    models.forEach(m => {
      const v = flatMetrics(m.metricas)[key]
      entry[m.nombre] = v !== undefined ? parseFloat((v * 100).toFixed(1)) : 0
    })
    return entry
  })

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFCFF', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Evaluación de Modelos</h1>
          <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>
            Compara métricas y activa el modelo para el panel clínico
          </p>
        </div>
        <button onClick={fetchModels}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
          style={{ background: '#F7F9FC', color: '#54606E', border: '1px solid #E0E6ED' }}>
          <RefreshCw className="w-3.5 h-3.5" />
          Recargar
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: toast.includes('Error') ? 'rgba(229,57,53,0.08)' : 'rgba(111,207,151,0.12)',
            color:      toast.includes('Error') ? '#C62828' : '#2E7D4F',
            border:     `1px solid ${toast.includes('Error') ? 'rgba(229,57,53,0.2)' : 'rgba(111,207,151,0.25)'}`,
          }}>
          {toast}
        </div>
      )}

      {/* Cards de modelos */}
      <div className="grid grid-cols-4 gap-4">
        {loading
          ? [1, 2, 3, 4].map(n => <SkeletonCard key={n} />)
          : models.map((m, idx) => {
              const met = flatMetrics(m.metricas)
              return (
                <div key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className="cursor-pointer transition-all rounded-2xl p-4"
                  style={{
                    background: selectedId === m.id ? 'rgba(79,180,210,0.06)' : '#fff',
                    border: `1px solid ${selectedId === m.id ? 'rgba(79,180,210,0.4)' : '#E0E6ED'}`,
                  }}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs font-bold" style={{ color: '#1A1F2B' }}>{m.nombre}</p>
                    {m.activo && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(111,207,151,0.15)', color: '#3DAB6B' }}>
                        Activo
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(metricLabels).map(([key, label]) => (
                      met[key] !== undefined ? (
                        <div key={key} className="flex justify-between">
                          <span className="text-[11px]" style={{ color: '#54606E' }}>{label}</span>
                          <span className="text-[11px] font-bold" style={{ color: metricColor(met[key]) }}>
                            {(met[key] * 100).toFixed(1)}%
                          </span>
                        </div>
                      ) : null
                    ))}
                  </div>
                  {met.f1_weighted !== undefined && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F0F0F0' }}>
                      <p className="text-[11px] font-bold text-center"
                        style={{ color: metricColor(met.f1_weighted) }}>
                        F1: {(met.f1_weighted * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              )
            })
        }
      </div>

      {selected && !loading && (
        <div className="grid grid-cols-3 gap-6">

          {/* Detalles del modelo seleccionado */}
          <div className="col-span-2 space-y-4">

            {/* Métrica bars + botón activar */}
            <div style={CARD}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>
                    {selected.nombre}
                    {selected.descripcion && (
                      <span className="font-normal text-xs ml-2" style={{ color: '#54606E' }}>
                        — {selected.descripcion}
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#54606E' }}>
                    Versión {selected.version}
                    {selected.created_at && ` · Registrado ${new Date(selected.created_at).toLocaleDateString('es-CO')}`}
                  </p>
                </div>

                {selected.activo ? (
                  <div className="flex items-center gap-1.5" style={{ color: '#3DAB6B' }}>
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold">Modelo activo</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleActivar(selected.id)}
                    disabled={activating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff' }}>
                    {activating
                      ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Activando...</>
                      : <><Star className="w-3.5 h-3.5" />Activar para CLI</>
                    }
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(metricLabels).map(([key, label]) => (
                  selMetrics[key] !== undefined
                    ? <MetricBar key={key} label={label} value={selMetrics[key]} />
                    : null
                ))}
              </div>

              {selected.metricas?.modelo_B && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F0F0F0' }}>
                  <p className="text-xs font-medium mb-3" style={{ color: '#54606E' }}>
                    Modelo B (sin IMC — fallback rural)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(metricLabels).map(([key, label]) => (
                      selected.metricas.modelo_B[key] !== undefined
                        ? <MetricBar key={key} label={label} value={selected.metricas.modelo_B[key]} />
                        : null
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Archivos del modelo */}
            <div style={CARD}>
              <p className="text-xs font-medium mb-3" style={{ color: '#54606E' }}>
                Archivos del modelo
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Modelo A (con IMC)', file: selected.archivo_A },
                  { label: 'Modelo B (sin IMC)', file: selected.archivo_B },
                  { label: 'Scaler A',           file: selected.scaler_A },
                  { label: 'Scaler B',           file: selected.scaler_B },
                ].map(({ label, file }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold" style={{ color: '#9CA3AF' }}>{label}</span>
                    <code className="text-[11px] px-2 py-1 rounded-lg"
                      style={{ background: '#F7F9FC', color: '#4FB4D2', border: '1px solid #E0E6ED' }}>
                      {file}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Radar + estado activo */}
          <div className="space-y-4">
            <div style={CARD}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Comparación</p>
                <TrendingUp className="w-4 h-4" style={{ color: '#4FB4D2' }} />
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E0E6ED" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#54606E' }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E0E6ED', fontSize: 11 }} />
                  {models.map((m, i) => (
                    <Radar
                      key={m.id} name={m.nombre} dataKey={m.nombre}
                      stroke={radarColors[i % radarColors.length]}
                      fill={radarColors[i % radarColors.length]}
                      fillOpacity={0.1}
                      strokeWidth={selectedId === m.id ? 2 : 1}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {models.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full"
                      style={{ background: radarColors[i % radarColors.length] }} />
                    <span className="text-[10px]" style={{ color: '#54606E' }}>
                      {m.nombre.split(' ')[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Banner modelo activo */}
            {modeloActivo && (
              <div className="rounded-xl p-4"
                style={{ background: 'rgba(111,207,151,0.1)', border: '1px solid rgba(111,207,151,0.3)' }}>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3DAB6B' }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: '#3DAB6B' }}>Modelo activo en CLI</p>
                    <p className="text-xs mt-0.5" style={{ color: '#1A1F2B' }}>{modeloActivo.nombre}</p>
                    {flatMetrics(modeloActivo.metricas).accuracy !== undefined && (
                      <p className="text-[11px] mt-1" style={{ color: '#54606E' }}>
                        Accuracy: {(flatMetrics(modeloActivo.metricas).accuracy * 100).toFixed(1)}%
                        {' · '}F1: {(flatMetrics(modeloActivo.metricas).f1_weighted * 100).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-xl p-4" style={{ background: '#FFF3E0', border: '1px solid #FFE0B2' }}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#E65100' }} />
                <p className="text-[11px]" style={{ color: '#E65100' }}>
                  Solo el modelo marcado como <strong>Activo</strong> será usado por el
                  panel clínico para generar predicciones nutricionales.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
