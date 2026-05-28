import { useState, useRef, useEffect } from 'react'
import {
  Play, ChevronDown, ChevronUp, CheckSquare, Square,
  Cpu, AlertCircle, CheckCircle, RefreshCw, Database, FileText,
} from 'lucide-react'
import api from '../../services/api'

const CARD = {
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: 20,
  boxShadow: 'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.07), 0 4px 18px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.04)',
  padding: '20px 24px',
}
const SS_KEY = 'nutrivig_entrenamiento'

const modelos = [
  {
    id: 'rf',
    nombre: 'Random Forest',
    desc: 'Ensemble de árboles de decisión. Alta robustez y resistencia a overfitting.',
    params: [
      { key: 'n_estimators',      label: 'Número de árboles',       type: 'number', default: 100,    min: 10,   max: 500,  step: 10 },
      { key: 'max_depth',         label: 'Profundidad máxima',       type: 'number', default: 10,     min: 1,    max: 50,   step: 1 },
      { key: 'min_samples_split', label: 'Mínimo muestras división', type: 'number', default: 2,      min: 2,    max: 20,   step: 1 },
      { key: 'max_features',      label: 'Características máximas',  type: 'select', default: 'sqrt', options: ['sqrt', 'log2'] },
    ],
  },
  {
    id: 'xgb',
    nombre: 'XGBoost (HistGB)',
    desc: 'Gradient boosting con soporte nativo para datos faltantes (HistGradientBoosting).',
    params: [
      { key: 'n_estimators',  label: 'Número de iteraciones', type: 'number', default: 200,  min: 50,   max: 1000, step: 50 },
      { key: 'learning_rate', label: 'Tasa de aprendizaje',   type: 'number', default: 0.1,  min: 0.01, max: 0.5,  step: 0.01 },
      { key: 'max_depth',     label: 'Profundidad máxima',    type: 'number', default: 6,    min: 1,    max: 20,   step: 1 },
    ],
  },
  {
    id: 'gb',
    nombre: 'Gradient Boosting',
    desc: 'Boosting secuencial de alta precisión. Ideal para clasificación de riesgo nutricional.',
    params: [
      { key: 'n_estimators',     label: 'Número de estimadores',   type: 'number', default: 150,  min: 50,   max: 500,  step: 25 },
      { key: 'learning_rate',    label: 'Tasa de aprendizaje',     type: 'number', default: 0.05, min: 0.01, max: 0.3,  step: 0.01 },
      { key: 'max_depth',        label: 'Profundidad máxima',      type: 'number', default: 5,    min: 2,    max: 15,   step: 1 },
      { key: 'min_samples_leaf', label: 'Mínimo muestras en hoja', type: 'number', default: 4,    min: 1,    max: 20,   step: 1 },
    ],
  },
  {
    id: 'lr',
    nombre: 'Regresión Logística',
    desc: 'Modelo lineal interpretable. Útil como baseline y análisis de coeficientes.',
    params: [
      { key: 'C',        label: 'Regularización (C)',  type: 'number', default: 1.0,    min: 0.01, max: 10,   step: 0.1 },
      { key: 'max_iter', label: 'Iteraciones máximas', type: 'number', default: 200,    min: 50,   max: 1000, step: 50 },
      { key: 'solver',   label: 'Solver',              type: 'select', default: 'lbfgs', options: ['lbfgs', 'liblinear', 'saga', 'newton-cg'] },
    ],
  },
]

const testSizeOptions = [
  { label: '20% prueba / 80% entreno', value: 0.2 },
  { label: '25% prueba / 75% entreno', value: 0.25 },
  { label: '30% prueba / 70% entreno', value: 0.3 },
]

const DEFAULT_PARAMS = Object.fromEntries(
  modelos.map(m => [m.id, Object.fromEntries(m.params.map(p => [p.key, p.default]))])
)

// ── Helpers sessionStorage ─────────────────────────────────────────────────────
function ssLoad() {
  try { return JSON.parse(sessionStorage.getItem(SS_KEY) || '{}') } catch { return {} }
}
function ssSave(data) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(data)) } catch {}
}

export default function EntrenamientoANL() {
  const _s = useRef(ssLoad())   // leer sessionStorage una sola vez

  // ── Config — inicializar desde sessionStorage ──────────────────────────────
  const [selected,   setSelected]   = useState(_s.current.selected   ?? { rf: true, xgb: false, gb: false, lr: false })
  const [expanded,   setExpanded]   = useState({})
  const [params,     setParams]     = useState(_s.current.params     ?? DEFAULT_PARAMS)
  const [testSize,   setTestSize]   = useState(_s.current.testSize   ?? 0.2)
  const [crossVal,   setCrossVal]   = useState(_s.current.crossVal   ?? 5)
  const [usarSmote,  setUsarSmote]  = useState(_s.current.usarSmote  ?? true)
  const [nombreBase,   setNombreBase]   = useState(_s.current.nombreBase   ?? '')
  const [maxVersions,  setMaxVersions]  = useState(_s.current.maxVersions  ?? 3)

  // ── Fuente de datos ────────────────────────────────────────────────────────
  const [datasets,         setDatasets]         = useState([])
  const [loadingDS,        setLoadingDS]        = useState(true)
  const [incluirBD,        setIncluirBD]        = useState(_s.current.incluirBD        ?? false)
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(_s.current.filtroFechaDesde ?? '')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(_s.current.filtroFechaHasta ?? '')
  const [filtroArea,       setFiltroArea]       = useState(_s.current.filtroArea       ?? '')

  // ── Job state — inicializar desde sessionStorage ───────────────────────────
  const [jobId,     setJobId]     = useState(_s.current.jobId     ?? null)
  const [status,    setStatus]    = useState(_s.current.status    ?? 'idle')
  const [progress,  setProgress]  = useState(_s.current.progress  ?? 0)
  const [log,       setLog]       = useState(_s.current.log       ?? [])
  const [resultado, setResultado] = useState(_s.current.resultado ?? null)

  const pollRef = useRef(null)
  const logRef  = useRef(null)

  // ── Persistir TODO en sessionStorage cuando cambia cualquier cosa ──────────
  useEffect(() => {
    ssSave({
      selected, params, testSize, crossVal, usarSmote, nombreBase, maxVersions,
      incluirBD, filtroFechaDesde, filtroFechaHasta, filtroArea,
      jobId, status, progress, log, resultado,
    })
  }, [
    selected, params, testSize, crossVal, usarSmote, nombreBase, maxVersions,
    incluirBD, filtroFechaDesde, filtroFechaHasta, filtroArea,
    jobId, status, progress, log, resultado,
  ])

  // ── Reanudar polling si había un job en curso al volver ───────────────────
  useEffect(() => {
    if (status === 'training' && jobId && !pollRef.current) {
      pollRef.current = setInterval(() => pollJob(jobId), 1500)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, []) // solo al montar

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  // Cargar datasets
  useEffect(() => {
    api.get('/datasets')
      .then(({ data }) => setDatasets(data))
      .catch(() => {})
      .finally(() => setLoadingDS(false))
  }, [])

  const selectedCount        = Object.values(selected).filter(Boolean).length
  const datasetsHabilitados  = datasets.filter(d => d.habilitado && d.estado === 'procesado')

  function toggleModel(id) { setSelected(prev => ({ ...prev, [id]: !prev[id] })) }
  function toggleExpand(id) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })) }
  function updateParam(modelId, key, value) {
    setParams(prev => ({ ...prev, [modelId]: { ...prev[modelId], [key]: value } }))
  }

  // ── Iniciar entrenamiento ──────────────────────────────────────────────────
  async function startTraining() {
    if (selectedCount === 0) return
    if (datasetsHabilitados.length === 0 && !incluirBD) return

    setStatus('training')
    setProgress(0)
    setLog([])
    setResultado(null)

    const modelosPayload = Object.fromEntries(
      Object.entries(selected).filter(([, v]) => v).map(([id]) => [id, params[id]])
    )
    const filtros_db = incluirBD ? {
      fecha_desde: filtroFechaDesde || null,
      fecha_hasta: filtroFechaHasta || null,
      area:        filtroArea ? parseInt(filtroArea) : null,
    } : null

    try {
      const { data } = await api.post('/entrenamiento/iniciar', {
        modelos: modelosPayload, test_size: testSize, cv_folds: crossVal,
        usar_smote: usarSmote, nombre: nombreBase.trim(),
        incluir_db: incluirBD, filtros_db,
        max_versions: maxVersions,
      })
      setJobId(data.job_id)
      setLog(['Entrenamiento iniciado en el servidor...'])
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(() => pollJob(data.job_id), 1500)
    } catch (err) {
      setLog([`ERROR: ${err.response?.data?.detail || 'Error al iniciar el entrenamiento'}`])
      setStatus('error')
    }
  }

  async function pollJob(id) {
    try {
      const { data } = await api.get(`/entrenamiento/${id}`)
      setProgress(data.progreso ?? 0)
      setLog(data.log ?? [])
      if (data.estado === 'done') {
        clearInterval(pollRef.current)
        pollRef.current = null
        setStatus('done')
        setResultado(data.resultado)
      } else if (data.estado === 'error') {
        clearInterval(pollRef.current)
        pollRef.current = null
        setStatus('error')
      }
    } catch { /* reintentar */ }
  }

  function resetTraining() {
    if (pollRef.current) clearInterval(pollRef.current)
    setStatus('idle')
    setProgress(0)
    setLog([])
    setResultado(null)
    setJobId(null)
  }

  const sinFuente = datasetsHabilitados.length === 0 && !incluirBD
  const canStart  = selectedCount > 0 && !sinFuente && status !== 'training'

  return (
    <div className="p-6 space-y-6 bg-neutral-bg min-h-screen">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Entrenamiento de Modelos</h1>
        <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>
          Configura el pipeline, selecciona la fuente de datos e inicia el entrenamiento
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Columna izquierda ── */}
        <div className="col-span-2 space-y-3">

          {/* Config global */}
          <div style={CARD}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1A1F2B' }}>Configuración del Pipeline</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>División train/test</label>
                <select value={testSize} onChange={e => setTestSize(parseFloat(e.target.value))}
                  className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}>
                  {testSizeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Validación cruzada (k-folds)</label>
                <input type="number" min={2} max={10} value={crossVal}
                  onChange={e => setCrossVal(parseInt(e.target.value))}
                  className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>
                  Nombre del modelo <span style={{ color: '#9CA3AF' }}>(opcional)</span>
                </label>
                <input type="text" value={nombreBase} onChange={e => setNombreBase(e.target.value)}
                  placeholder="Ej: RF v2 mayo 2026"
                  className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>
                  Versiones a conservar por tipo
                </label>
                <input type="number" min={1} max={10} value={maxVersions}
                  onChange={e => setMaxVersions(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }} />
                <p className="text-[10px] mt-1" style={{ color: '#9CA3AF' }}>
                  Al entrenar, se eliminan automáticamente las versiones más antiguas del mismo tipo.
                </p>
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setUsarSmote(p => !p)}
                    className="w-8 h-4 rounded-full relative transition-all cursor-pointer"
                    style={{ background: usarSmote ? '#6FCF97' : '#D1D5DB' }}>
                    <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all"
                      style={{ left: usarSmote ? '17px' : '2px' }} />
                  </div>
                  <span className="text-xs" style={{ color: '#54606E' }}>Aplicar SMOTE (balanceo de clases)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Fuente de datos */}
          <div style={CARD}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1A1F2B' }}>Fuente de datos</p>

            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4" style={{ color: '#4FB4D2' }} />
                <p className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>Datasets SIVIGILA habilitados</p>
              </div>
              {loadingDS ? (
                <div className="h-10 rounded-xl animate-pulse" style={{ background: '#F7F9FC' }} />
              ) : datasetsHabilitados.length === 0 ? (
                <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: '#FFF3E0' }}>
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#E65100' }} />
                  <p className="text-[11px]" style={{ color: '#E65100' }}>
                    No hay datasets habilitados. Ve a <strong>Datasets</strong> para subir un Excel SIVIGILA, ejecutar el ETL y habilitarlo.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {datasetsHabilitados.map(ds => (
                    <div key={ds.id} className="flex items-center justify-between px-3 py-2 rounded-xl transition-colors hover:bg-black/[0.03]">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" style={{ color: '#3DAB6B' }} />
                        <span className="text-xs font-medium" style={{ color: '#1A1F2B' }}>{ds.nombre}</span>
                      </div>
                      <span className="text-xs" style={{ color: '#54606E' }}>
                        {(ds.filas_proc || 0).toLocaleString('es-CO')} registros
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #F0F0F0', paddingTop: 12 }}>
              <label className="flex items-center gap-3 cursor-pointer mb-3"
                onClick={() => setIncluirBD(p => !p)}>
                <div className="w-8 h-4 rounded-full relative transition-all"
                  style={{ background: incluirBD ? '#4FB4D2' : '#D1D5DB' }}>
                  <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all"
                    style={{ left: incluirBD ? '17px' : '2px' }} />
                </div>
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" style={{ color: '#4FB4D2' }} />
                  <span className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>
                    Incluir registros de la BD
                  </span>
                </div>
              </label>

              {incluirBD && (
                <div className="pl-11 space-y-3">
                  <p className="text-[11px]" style={{ color: '#54606E' }}>
                    Se aplicará ETL a los controles registrados en la plataforma y se combinarán con los datasets SIVIGILA.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-medium block mb-1" style={{ color: '#54606E' }}>Fecha desde</label>
                      <input type="date" value={filtroFechaDesde}
                        onChange={e => setFiltroFechaDesde(e.target.value)}
                        className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                        style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium block mb-1" style={{ color: '#54606E' }}>Fecha hasta</label>
                      <input type="date" value={filtroFechaHasta}
                        onChange={e => setFiltroFechaHasta(e.target.value)}
                        className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                        style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }} />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium block mb-1" style={{ color: '#54606E' }}>Área</label>
                      <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)}
                        className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                        style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}>
                        <option value="">Todas</option>
                        <option value="1">Urbana</option>
                        <option value="2">Rural</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tarjetas de modelos */}
          {modelos.map(modelo => {
            const isOn  = selected[modelo.id]
            const isExp = expanded[modelo.id]
            return (
              <div key={modelo.id} style={{
                ...CARD, padding: 0, overflow: 'hidden',
                border: `1px solid ${isOn ? 'rgba(111,207,151,0.4)' : 'transparent'}`,
                background: isOn ? 'rgba(111,207,151,0.04)' : 'rgba(0,0,0,0.025)',
              }}>
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggleModel(modelo.id)}>
                  <div className="flex-shrink-0">
                    {isOn
                      ? <CheckSquare className="w-5 h-5" style={{ color: '#3DAB6B' }} />
                      : <Square      className="w-5 h-5" style={{ color: '#D1D5DB' }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: isOn ? '#1A1F2B' : '#54606E' }}>{modelo.nombre}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#54606E' }}>{modelo.desc}</p>
                  </div>
                  {isOn && (
                    <button
                      onClick={e => { e.stopPropagation(); toggleExpand(modelo.id) }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-neutral-bg"
                      style={{ color: '#3DAB6B' }}
                    >
                      Parámetros
                      {isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {isOn && isExp && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid #F0F0F0' }}>
                    <p className="col-span-2 text-xs font-medium pt-3" style={{ color: '#54606E' }}>Hiperparámetros</p>
                    {modelo.params.map(param => (
                      <div key={param.key}>
                        <label className="text-[11px] font-medium block mb-1" style={{ color: '#54606E' }}>{param.label}</label>
                        {param.type === 'select' ? (
                          <select value={params[modelo.id][param.key]}
                            onChange={e => updateParam(modelo.id, param.key, e.target.value)}
                            className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                            style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}>
                            {param.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input type="number" min={param.min} max={param.max} step={param.step}
                            value={params[modelo.id][param.key]}
                            onChange={e => updateParam(modelo.id, param.key, parseFloat(e.target.value))}
                            className="w-full text-xs rounded-xl px-3 py-2 outline-none"
                            style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Columna derecha ── */}
        <div className="space-y-4">

          {/* Resumen */}
          <div style={CARD}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1A1F2B' }}>Resumen</p>
            <div className="space-y-2">
              <Row label="Modelos seleccionados" value={selectedCount} valueColor="#3DAB6B" />
              <Row label="Datasets habilitados"  value={datasetsHabilitados.length} />
              <Row label="Incluir BD"             value={incluirBD ? 'Sí' : 'No'} />
              <Row label="División test"          value={`${testSize * 100}%`} />
              <Row label="K-folds"                value={crossVal} />
              <Row label="SMOTE"                  value={usarSmote ? 'Activo' : 'Desactivado'} />
              <Row label="Versiones a conservar"  value={`${maxVersions} por tipo`} />
            </div>

            {selectedCount === 0 && <Alert msg="Selecciona al menos un modelo" />}
            {sinFuente && <Alert msg="Habilita al menos un dataset o activa «Incluir BD»" />}

            <button
              onClick={status === 'done' || status === 'error' ? resetTraining : startTraining}
              disabled={!canStart}
              className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={
                !canStart
                  ? { background: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }
                  : status === 'error'
                    ? { background: 'linear-gradient(135deg, #FB8C00, #E53935)', color: '#fff', boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.45), inset 0 -3px 6px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)' }
                    : { background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff', boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.45), inset 0 -3px 6px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)' }
              }
            >
              {status === 'training'
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Entrenando...</>
                : status === 'done'
                  ? <><RefreshCw className="w-4 h-4" /> Nuevo entrenamiento</>
                  : status === 'error'
                    ? <><RefreshCw className="w-4 h-4" /> Reintentar</>
                    : <><Play className="w-4 h-4" /> Iniciar entrenamiento</>
              }
            </button>

            {status === 'done' && (
              <p className="text-[11px] text-center mt-2" style={{ color: '#3DAB6B' }}>
                ✓ Guardado. Ve a <strong>Modelos ML</strong> para activar.
              </p>
            )}
          </div>

          {/* Progreso */}
          {status !== 'idle' && (
            <div style={CARD}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Progreso</p>
                <div className="flex items-center gap-1.5">
                  {status === 'done'
                    ? <CheckCircle className="w-3.5 h-3.5" style={{ color: '#3DAB6B' }} />
                    : status === 'error'
                      ? <AlertCircle className="w-3.5 h-3.5" style={{ color: '#E53935' }} />
                      : <Cpu className="w-3.5 h-3.5" style={{ color: '#4FB4D2' }} />
                  }
                  <span className="text-xs font-bold"
                    style={{ color: status === 'done' ? '#3DAB6B' : status === 'error' ? '#E53935' : '#4FB4D2' }}>
                    {progress}%
                  </span>
                </div>
              </div>

              <div className="h-2 rounded-full mb-4" style={{ background: '#F0F0F0' }}>
                <div className="h-2 rounded-full transition-all duration-500" style={{
                  width: `${progress}%`,
                  background: status === 'done' ? '#6FCF97'
                    : status === 'error' ? '#E53935'
                    : 'linear-gradient(90deg, #4FB4D2, #6FCF97)',
                }} />
              </div>

              {/* ── Consola Hacker-Clin ── */}
              <div className="rounded-xl overflow-hidden"
                style={{ background: 'rgba(2,6,23,0.94)', border: '1px solid #1e293b' }}>
                {/* Barra de título */}
                <div className="flex items-center gap-2 px-3 py-2"
                  style={{ borderBottom: '1px solid #1e293b', background: 'rgba(15,23,42,0.8)' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{
                    background: status === 'error' ? '#ef4444' : status === 'done' ? '#6FCF97' : '#6FCF97',
                    boxShadow: status === 'training' ? '0 0 7px #6FCF97' : 'none',
                    animation: status === 'training' ? 'glow-pulse 1.5s infinite ease-in-out' : 'none',
                  }} />
                  <span className="text-[10px] font-mono tracking-widest" style={{ color: '#334155' }}>
                    NUTRIVIG_ML — TRAINING LOG
                  </span>
                  <div className="flex-1" />
                  <span className="text-[10px] font-mono" style={{ color: '#1e3a5f' }}>v1.0</span>
                </div>
                {/* Contenido del log */}
                <div ref={logRef}
                  className="p-3 space-y-0.5 overflow-y-auto custom-scrollbar"
                  style={{ maxHeight: 200 }}>
                  {log.length === 0
                    ? <p className="text-[11px] font-mono" style={{ color: '#334155' }}>
                        <span style={{ color: '#1d4ed8', opacity: 0.6 }}>$ </span>
                        Esperando inicio...
                      </p>
                    : log.map((line, i) => (
                      <p key={i} className="text-[11px] font-mono leading-relaxed" style={{
                        color: line.startsWith('ERROR') ? '#fca5a5'
                          : line.startsWith('──') ? '#38bdf8'
                          : i === log.length - 1 ? '#6FCF97'
                          : '#475569',
                      }}>
                        <span style={{ color: '#1d4ed8', opacity: 0.5 }}>$ </span>
                        {line}
                      </p>
                    ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* Resultados */}
          {resultado?.length > 0 && (
            <div style={CARD}>
              <p className="text-sm font-semibold mb-3" style={{ color: '#1A1F2B' }}>Métricas obtenidas</p>
              <div className="space-y-4">
                {resultado.map(r => (
                  <div key={r.tipo}>
                    <p className="text-xs font-semibold mb-2" style={{ color: '#4FB4D2' }}>{r.nombre}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Acc A',  val: r.metricas?.modelo_A?.accuracy },
                        { label: 'F1w A',  val: r.metricas?.modelo_A?.f1_weighted },
                        { label: 'Acc B',  val: r.metricas?.modelo_B?.accuracy },
                        { label: 'F1w B',  val: r.metricas?.modelo_B?.f1_weighted },
                      ].map(({ label, val }) => (
                        <div key={label} className="rounded-xl p-2 text-center" style={{ background: '#F7F9FC' }}>
                          <p className="text-[10px]" style={{ color: '#54606E' }}>{label}</p>
                          <p className="text-sm font-bold" style={{
                            color: val == null ? '#9CA3AF'
                              : val >= 0.8 ? '#3DAB6B'
                              : val >= 0.6 ? '#FB8C00'
                              : '#E53935',
                          }}>
                            {val != null ? `${(val * 100).toFixed(1)}%` : '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                    {r.metricas?.n_muestras != null && (
                      <p className="text-[10px] mt-1.5 text-center" style={{ color: '#9CA3AF' }}>
                        {r.metricas.n_muestras.toLocaleString('es-CO')} muestras
                        {r.metricas.fuentes?.length ? ` · ${r.metricas.fuentes.join(' + ')}` : ''}
                        {r.metricas.smote ? ' · SMOTE' : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, valueColor }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs" style={{ color: '#54606E' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: valueColor || '#1A1F2B' }}>{value}</span>
    </div>
  )
}

function Alert({ msg }) {
  return (
    <div className="flex items-start gap-2 mt-3 p-2.5 rounded-xl" style={{ background: '#FFF3E0' }}>
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#E65100' }} />
      <p className="text-[11px]" style={{ color: '#E65100' }}>{msg}</p>
    </div>
  )
}
