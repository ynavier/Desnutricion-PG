import { useState } from 'react'
import { Play, ChevronDown, ChevronUp, CheckSquare, Square, Cpu, AlertCircle } from 'lucide-react'

const CARD = { background: '#fff', borderRadius: 16, border: '1px solid #E0E6ED', padding: '20px 24px' }

const modelos = [
  {
    id: 'rf',
    nombre: 'Random Forest',
    desc: 'Ensemble de árboles de decisión. Alta robustez y resistencia a overfitting.',
    params: [
      { key: 'n_estimators', label: 'Número de árboles', type: 'number', default: 100, min: 10, max: 500, step: 10 },
      { key: 'max_depth', label: 'Profundidad máxima', type: 'number', default: 10, min: 1, max: 50, step: 1 },
      { key: 'min_samples_split', label: 'Mínimo muestras división', type: 'number', default: 2, min: 2, max: 20, step: 1 },
      { key: 'max_features', label: 'Características máximas', type: 'select', default: 'sqrt', options: ['sqrt', 'log2', 'auto'] },
    ],
  },
  {
    id: 'xgb',
    nombre: 'XGBoost',
    desc: 'Gradient boosting optimizado. Alto rendimiento en datos tabulares clínicos.',
    params: [
      { key: 'n_estimators', label: 'Número de estimadores', type: 'number', default: 200, min: 50, max: 1000, step: 50 },
      { key: 'learning_rate', label: 'Tasa de aprendizaje', type: 'number', default: 0.1, min: 0.01, max: 0.5, step: 0.01 },
      { key: 'max_depth', label: 'Profundidad máxima', type: 'number', default: 6, min: 1, max: 20, step: 1 },
      { key: 'subsample', label: 'Submuestra', type: 'number', default: 0.8, min: 0.5, max: 1.0, step: 0.1 },
    ],
  },
  {
    id: 'gb',
    nombre: 'Gradient Boosting',
    desc: 'Boosting secuencial con alta precisión. Ideal para clasificación de riesgo nutricional.',
    params: [
      { key: 'n_estimators', label: 'Número de estimadores', type: 'number', default: 150, min: 50, max: 500, step: 25 },
      { key: 'learning_rate', label: 'Tasa de aprendizaje', type: 'number', default: 0.05, min: 0.01, max: 0.3, step: 0.01 },
      { key: 'max_depth', label: 'Profundidad máxima', type: 'number', default: 5, min: 2, max: 15, step: 1 },
      { key: 'min_samples_leaf', label: 'Mínimo muestras en hoja', type: 'number', default: 4, min: 1, max: 20, step: 1 },
    ],
  },
  {
    id: 'lr',
    nombre: 'Regresión Logística',
    desc: 'Modelo lineal interpretable. Útil como baseline y para análisis de coeficientes.',
    params: [
      { key: 'C', label: 'Regularización (C)', type: 'number', default: 1.0, min: 0.01, max: 10, step: 0.1 },
      { key: 'max_iter', label: 'Iteraciones máximas', type: 'number', default: 200, min: 50, max: 1000, step: 50 },
      { key: 'solver', label: 'Solver', type: 'select', default: 'lbfgs', options: ['lbfgs', 'liblinear', 'saga', 'newton-cg'] },
    ],
  },
]

const testSizeOptions = [
  { label: '20% prueba / 80% entreno', value: 0.2 },
  { label: '25% prueba / 75% entreno', value: 0.25 },
  { label: '30% prueba / 70% entreno', value: 0.3 },
]

export default function EntrenamientoANL() {
  const [selected, setSelected] = useState({ rf: true, xgb: false, gb: false, lr: false })
  const [expanded, setExpanded] = useState({})
  const [params, setParams] = useState(() =>
    Object.fromEntries(modelos.map(m => [m.id, Object.fromEntries(m.params.map(p => [p.key, p.default]))]))
  )
  const [testSize, setTestSize] = useState(0.2)
  const [crossVal, setCrossVal] = useState(5)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [log, setLog] = useState([])

  const selectedCount = Object.values(selected).filter(Boolean).length

  function toggleModel(id) {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function updateParam(modelId, key, value) {
    setParams(prev => ({ ...prev, [modelId]: { ...prev[modelId], [key]: value } }))
  }

  function startTraining() {
    if (selectedCount === 0) return
    setStatus('training')
    setProgress(0)
    setLog([])

    const msgs = [
      'Cargando dataset procesado...',
      'Aplicando feature engineering...',
      'Dividiendo datos (train/test)...',
      ...Object.entries(selected).filter(([, v]) => v).flatMap(([id]) => {
        const m = modelos.find(m => m.id === id)
        return [`Entrenando ${m.nombre}...`, `Evaluando ${m.nombre}...`]
      }),
      'Calculando métricas finales...',
      'Guardando modelos entrenados...',
      'Entrenamiento completado.',
    ]

    let i = 0
    const interval = setInterval(() => {
      if (i < msgs.length) {
        setLog(prev => [...prev, msgs[i]])
        setProgress(Math.round(((i + 1) / msgs.length) * 100))
        i++
      } else {
        clearInterval(interval)
        setStatus('done')
      }
    }, 600)
  }

  function resetTraining() {
    setStatus('idle')
    setProgress(0)
    setLog([])
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFCFF', minHeight: '100vh' }}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Entrenamiento de Modelos</h1>
        <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>Selecciona modelos, ajusta parámetros e inicia el entrenamiento</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Models + params */}
        <div className="col-span-2 space-y-3">
          {/* Config global */}
          <div style={CARD}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1A1F2B' }}>Configuración Global</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>División train/test</label>
                <select
                  value={testSize}
                  onChange={e => setTestSize(parseFloat(e.target.value))}
                  className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                >
                  {testSizeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Validación cruzada (k-folds)</label>
                <input
                  type="number" min={2} max={10} value={crossVal}
                  onChange={e => setCrossVal(parseInt(e.target.value))}
                  className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                />
              </div>
            </div>
          </div>

          {/* Model cards */}
          {modelos.map(modelo => {
            const isOn = selected[modelo.id]
            const isExp = expanded[modelo.id]
            return (
              <div
                key={modelo.id}
                style={{
                  ...CARD, padding: 0, overflow: 'hidden',
                  border: `1px solid ${isOn ? 'rgba(111,207,151,0.4)' : '#E0E6ED'}`,
                  background: isOn ? 'rgba(111,207,151,0.03)' : '#fff',
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggleModel(modelo.id)}>
                  <div className="flex-shrink-0">
                    {isOn
                      ? <CheckSquare className="w-5 h-5" style={{ color: '#3DAB6B' }} />
                      : <Square className="w-5 h-5" style={{ color: '#D1D5DB' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: isOn ? '#1A1F2B' : '#54606E' }}>{modelo.nombre}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#54606E' }}>{modelo.desc}</p>
                  </div>
                  {isOn && (
                    <button
                      onClick={e => { e.stopPropagation(); toggleExpand(modelo.id) }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all"
                      style={{ background: 'rgba(111,207,151,0.1)', color: '#3DAB6B' }}
                    >
                      Parámetros
                      {isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Params */}
                {isOn && isExp && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid #F0F0F0' }}>
                    <p className="col-span-2 text-xs font-medium pt-3" style={{ color: '#54606E' }}>Hiperparámetros</p>
                    {modelo.params.map(param => (
                      <div key={param.key}>
                        <label className="text-[11px] font-medium block mb-1" style={{ color: '#54606E' }}>{param.label}</label>
                        {param.type === 'select' ? (
                          <select
                            value={params[modelo.id][param.key]}
                            onChange={e => updateParam(modelo.id, param.key, e.target.value)}
                            className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                            style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                          >
                            {param.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            type="number" min={param.min} max={param.max} step={param.step}
                            value={params[modelo.id][param.key]}
                            onChange={e => updateParam(modelo.id, param.key, parseFloat(e.target.value))}
                            className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                            style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Summary */}
          <div style={CARD}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1A1F2B' }}>Resumen</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: '#54606E' }}>Modelos seleccionados</span>
                <span className="text-xs font-bold" style={{ color: '#3DAB6B' }}>{selectedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: '#54606E' }}>División test</span>
                <span className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>{testSize * 100}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: '#54606E' }}>K-folds</span>
                <span className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>{crossVal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: '#54606E' }}>Variable objetivo</span>
                <span className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>desnutrido</span>
              </div>
            </div>

            {selectedCount === 0 && (
              <div className="flex items-start gap-2 mt-3 p-2.5 rounded-xl" style={{ background: '#FFF3E0' }}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#E65100' }} />
                <p className="text-[11px]" style={{ color: '#E65100' }}>Selecciona al menos un modelo para entrenar</p>
              </div>
            )}

            <button
              onClick={status === 'done' ? resetTraining : startTraining}
              disabled={selectedCount === 0 || status === 'training'}
              className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={
                selectedCount === 0 || status === 'training'
                  ? { background: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }
                  : { background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff' }
              }
            >
              {status === 'training'
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Entrenando...</>
                : status === 'done'
                  ? 'Nuevo entrenamiento'
                  : <><Play className="w-4 h-4" /> Iniciar entrenamiento</>
              }
            </button>
          </div>

          {/* Progress / log */}
          {(status === 'training' || status === 'done') && (
            <div style={CARD}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Progreso</p>
                <div className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" style={{ color: '#4FB4D2' }} />
                  <span className="text-xs font-bold" style={{ color: status === 'done' ? '#3DAB6B' : '#4FB4D2' }}>
                    {progress}%
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full mb-4" style={{ background: '#F0F0F0' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: status === 'done' ? '#6FCF97' : 'linear-gradient(90deg, #4FB4D2, #6FCF97)' }}
                />
              </div>
              <div
                className="rounded-xl p-3 space-y-1 overflow-y-auto"
                style={{ background: '#1A1F2B', maxHeight: 180 }}
              >
                {log.map((line, i) => (
                  <p key={i} className="text-[11px] font-mono" style={{ color: i === log.length - 1 ? '#6FCF97' : '#9CA3AF' }}>
                    {'>'} {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
