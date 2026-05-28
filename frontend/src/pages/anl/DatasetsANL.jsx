import { useState, useEffect, useRef } from 'react'
import {
  Upload, Database, Play, ToggleLeft, ToggleRight,
  CheckCircle, AlertCircle, Clock, Loader2, Trash2, RefreshCw, X,
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

const ESTADO_BADGE = {
  pendiente:  { bg: '#F3F4F6',               text: '#6B7280',  label: 'Pendiente' },
  procesando: { bg: 'rgba(79,180,210,0.12)', text: '#1976D2',  label: 'Procesando...' },
  procesado:  { bg: 'rgba(111,207,151,0.15)',text: '#3DAB6B',  label: 'Procesado' },
  error:      { bg: 'rgba(229,57,53,0.08)', text: '#B71C1C',  label: 'Error' },
}

function Toast({ msg, type }) {
  if (!msg) return null
  const ok = type === 'ok'
  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
      style={{
        background: ok ? 'rgba(111,207,151,0.15)' : 'rgba(229,57,53,0.1)',
        border: `1px solid ${ok ? 'rgba(111,207,151,0.4)' : 'rgba(229,57,53,0.3)'}`,
        color:  ok ? '#1A6B3C' : '#B71C1C',
      }}
    >
      {ok
        ? <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#3DAB6B' }} />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#E53935' }} />
      }
      {msg}
    </div>
  )
}

export default function DatasetsANL() {
  const [datasets,       setDatasets]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [uploadProgress, setUploadProgress] = useState(null)   // null | { done, total, errors }
  const [procesando,     setProcesando]     = useState(null)   // id del dataset en ETL individual
  const [batchEtl,       setBatchEtl]       = useState(null)   // null | { done, total, currentName }
  const [toggling,       setToggling]       = useState(null)
  const [deleting,       setDeleting]       = useState(null)
  const [toast,          setToast]          = useState({ msg: '', type: '' })
  const [etlResultados,  setEtlResultados]  = useState({})
  const [etlExpandido,   setEtlExpandido]   = useState({})
  const [seleccionados,  setSeleccionados]  = useState(new Set()) // IDs seleccionados
  const fileRef = useRef()

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3500)
  }

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get('/datasets')
      setDatasets(data)
    } catch {
      showToast('No se pudieron cargar los datasets', 'err')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleFileChange(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    e.target.value = ''

    setUploadProgress({ done: 0, total: files.length, errors: [] })

    // Subir todos en paralelo, llevar conteo individual
    let done = 0
    const errors = []

    await Promise.all(files.map(async file => {
      const form = new FormData()
      form.append('file', file)
      try {
        await api.post('/datasets/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      } catch (err) {
        errors.push(file.name)
      } finally {
        done += 1
        setUploadProgress({ done, total: files.length, errors: [...errors] })
      }
    }))

    await load()
    setUploadProgress(null)

    if (errors.length === 0) {
      showToast(
        files.length === 1
          ? 'Dataset subido correctamente'
          : `${files.length} datasets subidos correctamente`
      )
    } else if (errors.length < files.length) {
      showToast(
        `${files.length - errors.length} subidos · ${errors.length} con error: ${errors.join(', ')}`,
        'err'
      )
    } else {
      showToast('Error al subir los archivos', 'err')
    }
  }

  async function handleProcesar(ds) {
    setProcesando(ds.id)
    setEtlResultados(prev => { const n = { ...prev }; delete n[ds.id]; return n })
    setEtlExpandido(prev => ({ ...prev, [ds.id]: false }))
    setDatasets(prev => prev.map(d => d.id === ds.id ? { ...d, estado: 'procesando' } : d))
    try {
      const { data } = await api.post(`/datasets/${ds.id}/procesar`)
      showToast(`ETL completado — ${(data.filas_proc || 0).toLocaleString('es-CO')} registros válidos`)
      setEtlResultados(prev => ({ ...prev, [ds.id]: data }))
      setEtlExpandido(prev => ({ ...prev, [ds.id]: true }))
      load()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error en el proceso ETL', 'err')
      load()
    } finally {
      setProcesando(null)
    }
  }

  async function handleToggle(ds) {
    setToggling(ds.id)
    try {
      await api.patch(`/datasets/${ds.id}/habilitar`, null, {
        params: { habilitado: !ds.habilitado },
      })
      setDatasets(prev => prev.map(d => d.id === ds.id ? { ...d, habilitado: !d.habilitado } : d))
      showToast(`Dataset ${!ds.habilitado ? 'habilitado' : 'deshabilitado'} para entrenamiento`)
    } catch (err) {
      showToast(err.response?.data?.detail || 'No se pudo cambiar el estado', 'err')
    } finally {
      setToggling(null)
    }
  }

  async function handleDelete(ds) {
    if (!window.confirm(`¿Eliminar "${ds.nombre}"?`)) return
    setDeleting(ds.id)
    try {
      await api.delete(`/datasets/${ds.id}`)
      setDatasets(prev => prev.filter(d => d.id !== ds.id))
      setSeleccionados(prev => { const n = new Set(prev); n.delete(ds.id); return n })
      showToast('Dataset eliminado')
    } catch {
      showToast('No se pudo eliminar el dataset', 'err')
    } finally {
      setDeleting(null)
    }
  }

  // ── Selección múltiple ─────────────────────────────────────────────────────
  function toggleSeleccion(id) {
    setSeleccionados(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleTodos() {
    // Solo selecciona datasets en estado pendiente o error (los que pueden procesarse)
    const elegibles = datasets.filter(d => d.estado === 'pendiente' || d.estado === 'error').map(d => d.id)
    const todosYaSeleccionados = elegibles.length > 0 && elegibles.every(id => seleccionados.has(id))
    if (todosYaSeleccionados) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(elegibles))
    }
  }

  function limpiarSeleccion() {
    setSeleccionados(new Set())
  }

  // ── ETL en lote (secuencial para no sobrecargar el servidor) ───────────────
  async function handleBatchEtl() {
    const ids = [...seleccionados]
    const cola = datasets.filter(d => ids.includes(d.id) && (d.estado === 'pendiente' || d.estado === 'error'))
    if (!cola.length) return

    setSeleccionados(new Set())
    setBatchEtl({ done: 0, total: cola.length, currentName: cola[0].nombre })

    let exitosos = 0
    let errores  = 0

    for (let i = 0; i < cola.length; i++) {
      const ds = cola[i]
      setBatchEtl({ done: i, total: cola.length, currentName: ds.nombre })

      // Marcar como procesando en la lista local
      setDatasets(prev => prev.map(d => d.id === ds.id ? { ...d, estado: 'procesando' } : d))

      try {
        const { data } = await api.post(`/datasets/${ds.id}/procesar`)
        setEtlResultados(prev => ({ ...prev, [ds.id]: data }))
        exitosos++
      } catch {
        errores++
      }
    }

    await load()
    setBatchEtl(null)

    if (errores === 0) {
      showToast(`ETL completado — ${exitosos} dataset${exitosos !== 1 ? 's' : ''} procesados`)
    } else {
      showToast(`${exitosos} OK · ${errores} con error`, errores === cola.length ? 'err' : 'ok')
    }
  }

  const procesados     = datasets.filter(d => d.estado === 'procesado').length
  const habilitados    = datasets.filter(d => d.habilitado).length
  const totalRegistros = datasets
    .filter(d => d.estado === 'procesado')
    .reduce((s, d) => s + (d.filas_proc || 0), 0)

  return (
    <div className="p-6 space-y-6 bg-neutral-bg min-h-screen">
      <Toast msg={toast.msg} type={toast.type} />

      {/* Barra flotante de acciones en lote */}
      {seleccionados.size > 0 && !batchEtl && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl"
          style={{
            transform: 'translateX(-50%)',
            background: '#1A1F2B',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span className="text-sm font-medium" style={{ color: '#E0E6ED' }}>
            {seleccionados.size} dataset{seleccionados.size !== 1 ? 's' : ''} seleccionado{seleccionados.size !== 1 ? 's' : ''}
          </span>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.15)' }} />
          <button
            onClick={handleBatchEtl}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff', boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.45), inset 0 -3px 6px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)' }}
          >
            <Play className="w-3.5 h-3.5" />
            Ejecutar ETL
          </button>
          <button
            onClick={limpiarSeleccion}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#9CA3AF' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barra de progreso ETL en lote */}
      {batchEtl && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex flex-col gap-2 px-5 py-3 rounded-2xl shadow-xl"
          style={{
            transform: 'translateX(-50%)',
            background: '#1A1F2B',
            border: '1px solid rgba(255,255,255,0.08)',
            minWidth: 320,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#4FB4D2' }} />
              <span className="text-sm font-medium" style={{ color: '#E0E6ED' }}>
                ETL en lote — {batchEtl.done}/{batchEtl.total}
              </span>
            </div>
            <span className="text-xs truncate max-w-[160px]" style={{ color: '#6B7280' }}>
              {batchEtl.currentName}
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: `${Math.round(batchEtl.done / batchEtl.total * 100)}%`,
                background: 'linear-gradient(90deg, #6FCF97, #4FB4D2)',
              }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Gestión de Datasets</h1>
          <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>
            Sube archivos SIVIGILA, aplica ETL y habilítalos para entrenamiento
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-neutral-sub hover:bg-neutral-bg"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!!uploadProgress}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={uploadProgress
                ? { background: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }
                : { background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff', boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.45), inset 0 -3px 6px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)' }
              }
            >
              {uploadProgress
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo {uploadProgress.done}/{uploadProgress.total}...</>
                : <><Upload className="w-4 h-4" /> Subir Excel SIVIGILA</>
              }
            </button>
            {uploadProgress && uploadProgress.total > 1 && (
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#E0E6ED', minWidth: 180 }}>
                <div
                  className="h-1 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(uploadProgress.done / uploadProgress.total * 100)}%`,
                    background: 'linear-gradient(90deg, #6FCF97, #4FB4D2)',
                  }}
                />
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total datasets',        value: datasets.length,                         color: '#4FB4D2', bg: 'rgba(79,180,210,0.1)' },
          { label: 'ETL completado',        value: procesados,                               color: '#3DAB6B', bg: 'rgba(111,207,151,0.1)' },
          { label: 'Habilitados para ML',   value: habilitados,                              color: '#FB8C00', bg: 'rgba(251,140,0,0.1)' },
          { label: 'Registros disponibles', value: totalRegistros.toLocaleString('es-CO'),   color: '#9B59B6', bg: 'rgba(155,89,182,0.1)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={CARD}>
            <p className="text-xs" style={{ color: '#54606E' }}>{label}</p>
            {loading
              ? <div className="h-7 w-16 rounded mt-1 animate-pulse" style={{ background: '#F0F0F0' }} />
              : <p className="text-2xl font-bold mt-1" style={{ color: '#1A1F2B' }}>{value}</p>
            }
            <div className="w-6 h-1 rounded-full mt-2" style={{ background: color, opacity: 0.5 }} />
          </div>
        ))}
      </div>

      {/* Lista */}
      <div style={CARD}>
        {/* Encabezado con "seleccionar todos" */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Datasets registrados</p>
          {!loading && datasets.some(d => d.estado === 'pendiente' || d.estado === 'error') && (
            <button
              onClick={toggleTodos}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
              style={{ background: '#F3F4F6', color: '#54606E' }}
            >
              {(() => {
                const elegibles = datasets.filter(d => d.estado === 'pendiente' || d.estado === 'error')
                const todos = elegibles.length > 0 && elegibles.every(d => seleccionados.has(d.id))
                return todos ? 'Deseleccionar todos' : 'Seleccionar todos'
              })()}
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-16 rounded-xl animate-pulse" style={{ background: '#F7F9FC' }} />
            ))}
          </div>
        ) : datasets.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-10 h-10 mx-auto mb-3" style={{ color: '#D1D5DB' }} />
            <p className="text-sm font-medium" style={{ color: '#9CA3AF' }}>No hay datasets registrados</p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
              Sube un archivo Excel SIVIGILA para comenzar
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {datasets.map(ds => {
              const badge       = ESTADO_BADGE[ds.estado] || ESTADO_BADGE.pendiente
              const isBusy      = procesando === ds.id || toggling === ds.id || deleting === ds.id || !!batchEtl
              const esElegible  = ds.estado === 'pendiente' || ds.estado === 'error'
              const isSelected  = seleccionados.has(ds.id)
              return (
                <div
                  key={ds.id}
                  className="rounded-xl p-4 transition-all hover:bg-black/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox (solo para pendiente/error) */}
                    <div className="flex-shrink-0 w-5 flex items-center justify-center">
                      {esElegible ? (
                        <button
                          onClick={() => toggleSeleccion(ds.id)}
                          disabled={!!batchEtl}
                          className="w-4 h-4 rounded flex items-center justify-center transition-all border"
                          style={isSelected
                            ? { background: '#4FB4D2', borderColor: '#4FB4D2' }
                            : { background: '#fff', borderColor: '#D1D5DB' }
                          }
                        >
                          {isSelected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      ) : (
                        <div className="w-4 h-4" /> // espacio vacío para alinear
                      )}
                    </div>

                    {/* Ícono */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: badge.bg }}
                    >
                      {ds.estado === 'procesado'
                        ? <CheckCircle className="w-5 h-5" style={{ color: badge.text }} />
                        : ds.estado === 'procesando'
                          ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: badge.text }} />
                          : ds.estado === 'error'
                            ? <AlertCircle className="w-5 h-5" style={{ color: badge.text }} />
                            : <Clock className="w-5 h-5" style={{ color: badge.text }} />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold truncate" style={{ color: '#1A1F2B' }}>
                          {ds.nombre}
                        </p>
                        {ds.anio && (
                          <span className="text-[10px] font-semibold flex-shrink-0"
                            style={{ color: '#1976D2' }}>
                            {ds.anio}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold flex-shrink-0"
                          style={{ color: badge.text }}>
                          {badge.label}
                        </span>
                        {ds.habilitado && (
                          <span className="text-[10px] font-semibold flex-shrink-0"
                            style={{ color: '#3DAB6B' }}>
                            ✓ Para entrenamiento
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: '#54606E' }}>
                        {ds.estado === 'procesado'
                          ? `${(ds.filas_proc || 0).toLocaleString('es-CO')} registros ML · raw: ${(ds.filas_raw || 0).toLocaleString('es-CO')}`
                          : ds.estado === 'error'
                            ? ds.mensaje_etl || 'Error en ETL'
                            : ds.archivo_raw
                        }
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {etlResultados[ds.id] && (
                        <button
                          onClick={() => setEtlExpandido(prev => ({ ...prev, [ds.id]: !prev[ds.id] }))}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-neutral-bg"
                          style={{ color: '#3DAB6B' }}
                        >
                          {etlExpandido[ds.id] ? 'Ocultar resultado ↑' : 'Ver resultado ↓'}
                        </button>
                      )}
                      {(ds.estado === 'pendiente' || ds.estado === 'error') && (
                        <button
                          onClick={() => handleProcesar(ds)}
                          disabled={isBusy}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!isBusy ? 'hover:bg-neutral-bg' : ''}`}
                          style={isBusy
                            ? { color: '#9CA3AF', cursor: 'not-allowed' }
                            : { color: '#1976D2' }
                          }
                        >
                          {procesando === ds.id
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando...</>
                            : <><Play className="w-3.5 h-3.5" /> Ejecutar ETL</>
                          }
                        </button>
                      )}

                      {ds.estado === 'procesado' && (
                        <button
                          onClick={() => handleProcesar(ds)}
                          disabled={isBusy}
                          title="Re-procesar ETL"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-neutral-bg"
                          style={{ color: '#6B7280' }}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${procesando === ds.id ? 'animate-spin' : ''}`} />
                        </button>
                      )}

                      {ds.estado === 'procesado' && (
                        <button
                          onClick={() => handleToggle(ds)}
                          disabled={isBusy}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-neutral-bg"
                          style={ds.habilitado
                            ? { color: '#3DAB6B' }
                            : { color: '#6B7280' }
                          }
                        >
                          {toggling === ds.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : ds.habilitado
                              ? <><ToggleRight className="w-4 h-4" /> Habilitado</>
                              : <><ToggleLeft  className="w-4 h-4" /> Habilitar</>
                          }
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(ds)}
                        disabled={isBusy}
                        title="Eliminar dataset"
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50"
                        style={{ color: '#E53935' }}
                      >
                        {deleting === ds.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </div>

                  {/* Panel de resultado ETL */}
                  {etlResultados[ds.id] && etlExpandido[ds.id] && (() => {
                    const r = etlResultados[ds.id]
                    const clases = r.clases || {}
                    const totalClases = Object.values(clases).reduce((s, v) => s + v, 0)
                    const CLASE_NOMBRE = {
                      1: 'Desnut. severa', 2: 'Desnut. moderada', 3: 'Normal bajo',
                      4: 'Normal', 5: 'Sobrepeso', 6: 'Obesidad',
                    }
                    const CLASE_COLOR = {
                      1: '#B71C1C', 2: '#E53935', 3: '#FBC02D',
                      4: '#6FCF97', 5: '#4FB4D2', 6: '#9B59B6',
                    }
                    const PASOS_ETL = [
                      { t: 'Limpieza de datos',   d: 'Elimina valores nulos, ceros clínicos y registros con clas_peso inválido' },
                      { t: 'Filtro pediátrico',   d: 'Conserva solo menores de 5 años según uni_med_ y edad_ del Reporte 113' },
                      { t: 'Normalización',        d: 'Corrige decimales con coma, calcula edad_meses y castea tipos numéricos' },
                      { t: 'Imputación',           d: 'Rellena faltantes con mediana estratificada y moda según la variable' },
                    ]
                    const fechaCarga = ds.created_at
                      ? new Date(ds.created_at).toISOString().split('T')[0]
                      : '—'
                    const retencion = r.filas_raw ? Math.round(r.filas_proc / r.filas_raw * 100) : 0

                    return (
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid #F0F0F0' }}>
                        <div className="grid grid-cols-2 gap-4">

                          {/* Pipeline ETL */}
                          <div className="rounded-xl p-4" style={{ background: '#FAFCFF', border: '1px solid #E8EDF3' }}>
                            <p className="text-sm font-bold mb-0.5" style={{ color: '#1A1F2B' }}>Pipeline ETL</p>
                            <p className="text-[11px] mb-4" style={{ color: '#9CA3AF' }}>
                              Dataset: {ds.archivo_raw}
                            </p>
                            <div className="space-y-3">
                              {PASOS_ETL.map(({ t, d }) => (
                                <div key={t} className="flex gap-2.5">
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                    style={{ background: 'rgba(111,207,151,0.18)' }}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" style={{ color: '#3DAB6B' }} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>{t}</p>
                                    <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: '#54606E' }}>{d}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Resumen + Distribución */}
                          <div className="flex flex-col gap-3">
                            {/* Resumen */}
                            <div className="rounded-xl p-4" style={{ background: '#FAFCFF', border: '1px solid #E8EDF3' }}>
                              <p className="text-sm font-bold mb-3" style={{ color: '#1A1F2B' }}>Resumen</p>
                              <div className="space-y-2">
                                {[
                                  { label: 'Registros totales', value: (r.filas_proc || 0).toLocaleString('es-CO'), highlight: true },
                                  { label: 'Filas originales',  value: (r.filas_raw  || 0).toLocaleString('es-CO') },
                                  { label: 'Retención',          value: `${retencion}%` },
                                  { label: 'Tipo de archivo',    value: 'Excel → CSV' },
                                  { label: 'Fecha de carga',     value: fechaCarga },
                                ].map(({ label, value, highlight }) => (
                                  <div key={label} className="flex items-center justify-between">
                                    <span className="text-xs" style={{ color: '#54606E' }}>{label}</span>
                                    <span
                                      className="text-xs font-semibold"
                                      style={{ color: highlight ? '#3DAB6B' : '#1A1F2B' }}
                                    >
                                      {value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Distribución de clases */}
                            {totalClases > 0 && (
                              <div className="rounded-xl p-4" style={{ background: '#FAFCFF', border: '1px solid #E8EDF3' }}>
                                <p className="text-xs font-semibold mb-2.5" style={{ color: '#1A1F2B' }}>
                                  Distribución de clases
                                </p>
                                <div className="space-y-2">
                                  {Object.entries(clases)
                                    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                                    .map(([clave, cnt]) => {
                                      const pct = Math.round(cnt / totalClases * 100)
                                      const color = CLASE_COLOR[parseInt(clave)] || '#9CA3AF'
                                      const nombre = CLASE_NOMBRE[parseInt(clave)] || `Clase ${clave}`
                                      return (
                                        <div key={clave} className="flex items-center gap-2">
                                          <span className="text-[11px] w-28 flex-shrink-0" style={{ color: '#54606E' }}>
                                            {nombre}
                                          </span>
                                          <div className="flex-1 h-1.5 rounded-full" style={{ background: '#EDEFF3' }}>
                                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                                          </div>
                                          <span className="text-[11px] w-16 text-right flex-shrink-0" style={{ color: '#54606E' }}>
                                            {cnt.toLocaleString('es-CO')} ({pct}%)
                                          </span>
                                        </div>
                                      )
                                    })
                                  }
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Guía de flujo */}
      <div style={{ ...CARD, background: 'rgba(79,180,210,0.04)', border: '1px solid rgba(79,180,210,0.2)' }}>
        <p className="text-xs font-semibold mb-3" style={{ color: '#1976D2' }}>Flujo de trabajo</p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { n: '1', t: 'Subir Excel',   d: 'Carga el Reporte 113 SIVIGILA (.xlsx)' },
            { n: '2', t: 'Ejecutar ETL',  d: 'Limpieza, cálculo de edad_meses, imputación y validación' },
            { n: '3', t: 'Habilitar',     d: 'Activa el dataset para que sea usado en entrenamiento' },
            { n: '4', t: 'Ir a Entrena.', d: 'Lanza el pipeline ML con los datasets habilitados' },
          ].map(({ n, t, d }) => (
            <div key={n} className="flex gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(79,180,210,0.15)', color: '#1976D2' }}>
                {n}
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>{t}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#54606E' }}>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
