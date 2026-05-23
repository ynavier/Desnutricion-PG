import { useState } from 'react'
import { CheckCircle, Star, TrendingUp, AlertTriangle } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

const CARD = { background: '#fff', borderRadius: 16, border: '1px solid #E0E6ED', padding: '20px 24px' }

const mockModels = [
  {
    id: 'rf',
    nombre: 'Random Forest',
    fecha: '2025-05-20',
    activo: false,
    metrics: { accuracy: 0.924, precision: 0.911, recall: 0.938, f1: 0.924 },
    cm: [[210, 18], [13, 195]],
    params: { n_estimators: 100, max_depth: 10, max_features: 'sqrt' },
  },
  {
    id: 'xgb',
    nombre: 'XGBoost',
    fecha: '2025-05-20',
    activo: true,
    metrics: { accuracy: 0.941, precision: 0.935, recall: 0.948, f1: 0.941 },
    cm: [[214, 14], [10, 198]],
    params: { n_estimators: 200, learning_rate: 0.1, max_depth: 6 },
  },
  {
    id: 'gb',
    nombre: 'Gradient Boosting',
    fecha: '2025-05-20',
    activo: false,
    metrics: { accuracy: 0.931, precision: 0.922, recall: 0.941, f1: 0.931 },
    cm: [[212, 16], [12, 196]],
    params: { n_estimators: 150, learning_rate: 0.05, max_depth: 5 },
  },
  {
    id: 'lr',
    nombre: 'Regresión Logística',
    fecha: '2025-05-20',
    activo: false,
    metrics: { accuracy: 0.867, precision: 0.854, recall: 0.881, f1: 0.867 },
    cm: [[195, 33], [28, 180]],
    params: { C: 1.0, max_iter: 200, solver: 'lbfgs' },
  },
]

const metricLabels = { accuracy: 'Accuracy', precision: 'Precision', recall: 'Recall', f1: 'F1 Score' }
const metricColor = (v) => v >= 0.93 ? '#3DAB6B' : v >= 0.90 ? '#4FB4D2' : v >= 0.85 ? '#FBC02D' : '#E53935'

function MetricBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs" style={{ color: '#54606E' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: metricColor(value) }}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#F0F0F0' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${value * 100}%`, background: metricColor(value) }} />
      </div>
    </div>
  )
}

function ConfusionMatrix({ cm, nombre }) {
  const labels = ['No desnutrido', 'Desnutrido']
  const total = cm.flat().reduce((a, b) => a + b, 0)
  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: '#54606E' }}>Matriz de Confusión · {nombre}</p>
      <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
        <div />
        {labels.map(l => (
          <div key={l} className="p-1 font-semibold rounded" style={{ background: '#F7F9FC', color: '#54606E' }}>{l}</div>
        ))}
        {cm.map((row, i) => [
          <div key={`l${i}`} className="p-1 font-semibold rounded flex items-center justify-center" style={{ background: '#F7F9FC', color: '#54606E' }}>{labels[i]}</div>,
          ...row.map((val, j) => {
            const isDiag = i === j
            return (
              <div
                key={`${i}${j}`}
                className="p-2 rounded font-bold"
                style={{
                  background: isDiag ? 'rgba(111,207,151,0.15)' : 'rgba(229,57,53,0.08)',
                  color: isDiag ? '#3DAB6B' : '#C62828',
                  fontSize: 13,
                }}
              >
                {val}
                <div className="text-[9px] font-normal" style={{ color: '#9CA3AF' }}>
                  {((val / total) * 100).toFixed(1)}%
                </div>
              </div>
            )
          }),
        ])}
      </div>
    </div>
  )
}

export default function ModelosANL() {
  const [models, setModels] = useState(mockModels)
  const [selectedId, setSelectedId] = useState('xgb')

  const selected = models.find(m => m.id === selectedId) ?? models[0]

  const radarData = Object.entries(metricLabels).map(([key, label]) => ({
    metric: label,
    ...Object.fromEntries(models.map(m => [m.nombre, parseFloat((m.metrics[key] * 100).toFixed(1))]))
  }))

  const radarColors = ['#4FB4D2', '#6FCF97', '#FBC02D', '#E53935']

  function setActive(id) {
    setModels(prev => prev.map(m => ({ ...m, activo: m.id === id })))
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFCFF', minHeight: '100vh' }}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Evaluación de Modelos</h1>
        <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>Compara métricas y selecciona el modelo activo para el panel clínico</p>
      </div>

      {/* Model cards */}
      <div className="grid grid-cols-4 gap-4">
        {models.map(m => (
          <div
            key={m.id}
            onClick={() => setSelectedId(m.id)}
            className="cursor-pointer transition-all rounded-2xl p-4"
            style={{
              background: selectedId === m.id ? 'rgba(79,180,210,0.06)' : '#fff',
              border: `1px solid ${selectedId === m.id ? 'rgba(79,180,210,0.4)' : '#E0E6ED'}`,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-bold" style={{ color: '#1A1F2B' }}>{m.nombre}</p>
              {m.activo && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(111,207,151,0.15)', color: '#3DAB6B' }}>
                  Activo
                </span>
              )}
            </div>
            <div className="space-y-2">
              {Object.entries(m.metrics).map(([key, val]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-[11px]" style={{ color: '#54606E' }}>{metricLabels[key]}</span>
                  <span className="text-[11px] font-bold" style={{ color: metricColor(val) }}>
                    {(val * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F0F0F0' }}>
              <p className="text-[11px] font-bold text-center" style={{ color: metricColor(m.metrics.f1) }}>
                F1: {(m.metrics.f1 * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Detail + matrix */}
        <div className="col-span-2 space-y-4">
          {/* Metric bars */}
          <div style={CARD}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>{selected.nombre} · Métricas</p>
                <p className="text-xs" style={{ color: '#54606E' }}>Entrenado el {selected.fecha}</p>
              </div>
              {selected.activo
                ? <div className="flex items-center gap-1.5" style={{ color: '#3DAB6B' }}>
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-semibold">Modelo activo</span>
                  </div>
                : <button
                    onClick={() => setActive(selected.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={{ background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff' }}
                  >
                    <Star className="w-3.5 h-3.5" />
                    Activar para CLI
                  </button>
              }
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(selected.metrics).map(([key, val]) => (
                <MetricBar key={key} label={metricLabels[key]} value={val} />
              ))}
            </div>
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F0F0F0' }}>
              <p className="text-xs font-medium mb-2" style={{ color: '#54606E' }}>Hiperparámetros</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selected.params).map(([k, v]) => (
                  <span key={k} className="text-[11px] px-2 py-1 rounded-lg" style={{ background: '#F7F9FC', color: '#54606E', border: '1px solid #E0E6ED' }}>
                    {k}: <strong>{String(v)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Confusion matrix */}
          <div style={CARD}>
            <ConfusionMatrix cm={selected.cm} nombre={selected.nombre} />
            <div className="mt-3 flex gap-4 text-[11px]" style={{ color: '#54606E' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded" style={{ background: 'rgba(111,207,151,0.3)' }} />
                Predicciones correctas
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded" style={{ background: 'rgba(229,57,53,0.15)' }} />
                Errores de clasificación
              </div>
            </div>
          </div>
        </div>

        {/* Radar + active info */}
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
                    stroke={radarColors[i]} fill={radarColors[i]} fillOpacity={0.1}
                    strokeWidth={selectedId === m.id ? 2 : 1}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2 mt-2">
              {models.map((m, i) => (
                <div key={m.id} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: radarColors[i] }} />
                  <span className="text-[10px]" style={{ color: '#54606E' }}>{m.nombre.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active model banner */}
          {models.filter(m => m.activo).map(m => (
            <div key={m.id} className="rounded-xl p-4" style={{ background: 'rgba(111,207,151,0.1)', border: '1px solid rgba(111,207,151,0.3)' }}>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#3DAB6B' }} />
                <div>
                  <p className="text-xs font-bold" style={{ color: '#3DAB6B' }}>Modelo activo en CLI</p>
                  <p className="text-xs mt-0.5" style={{ color: '#1A1F2B' }}>{m.nombre}</p>
                  <p className="text-[11px] mt-1" style={{ color: '#54606E' }}>
                    F1: {(m.metrics.f1 * 100).toFixed(1)}% · Accuracy: {(m.metrics.accuracy * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl p-4" style={{ background: '#FFF3E0', border: '1px solid #FFE0B2' }}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#E65100' }} />
              <p className="text-[11px]" style={{ color: '#E65100' }}>
                Solo el modelo marcado como <strong>Activo</strong> será usado por el panel clínico para generar predicciones nutricionales.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
