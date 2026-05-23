import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle, Trash2, Eye } from 'lucide-react'

const CARD = { background: '#fff', borderRadius: 16, border: '1px solid #E0E6ED', padding: '20px 24px' }

const mockDatasets = [
  {
    id: 1, nombre: '2020-2025_113_Reporte.xlsx', tipo: 'Excel', tamaño: '2.4 MB',
    registros: 1248, fecha: '2025-05-18', estado: 'completado',
    etl: { limpieza: true, normalizacion: true, deduplicacion: true, validacion: true }
  },
  {
    id: 2, nombre: 'SIVIGILA_2024_Q1.csv', tipo: 'CSV', tamaño: '1.1 MB',
    registros: 587, fecha: '2025-03-10', estado: 'completado',
    etl: { limpieza: true, normalizacion: true, deduplicacion: true, validacion: true }
  },
  {
    id: 3, nombre: 'SIVIGILA_2024_Q2.csv', tipo: 'CSV', tamaño: '980 KB',
    registros: 612, fecha: '2025-04-22', estado: 'error',
    etl: { limpieza: true, normalizacion: false, deduplicacion: false, validacion: false }
  },
]

const etlSteps = [
  { key: 'limpieza', label: 'Limpieza de datos', desc: 'Elimina valores nulos, outliers y datos inválidos' },
  { key: 'normalizacion', label: 'Normalización', desc: 'Estandariza formatos de fechas, sexo, zonas y variables numéricas' },
  { key: 'deduplicacion', label: 'Deduplicación', desc: 'Elimina registros duplicados por DNI y fecha de control' },
  { key: 'validacion', label: 'Validación', desc: 'Verifica consistencia de columnas con el esquema SIVIGILA' },
]

const estadoConfig = {
  completado: { label: 'Completado', color: '#43A047', bg: '#E8F5E9', icon: CheckCircle },
  procesando: { label: 'Procesando', color: '#1976D2', bg: '#E3F2FD', icon: Clock },
  error: { label: 'Error', color: '#E53935', bg: '#FFEBEE', icon: XCircle },
}

export default function DatasetsANL() {
  const [datasets, setDatasets] = useState(mockDatasets)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState(null)
  const fileRef = useRef()

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) simulateUpload(file)
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) simulateUpload(file)
  }

  function simulateUpload(file) {
    setUploading(true)
    setTimeout(() => {
      const nuevo = {
        id: Date.now(),
        nombre: file.name,
        tipo: file.name.endsWith('.csv') ? 'CSV' : 'Excel',
        tamaño: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        registros: Math.floor(Math.random() * 800) + 200,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'completado',
        etl: { limpieza: true, normalizacion: true, deduplicacion: true, validacion: true },
      }
      setDatasets(prev => [nuevo, ...prev])
      setUploading(false)
    }, 2500)
  }

  function removeDataset(id) {
    setDatasets(prev => prev.filter(d => d.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFCFF', minHeight: '100vh' }}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Gestión de Datasets</h1>
        <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>Carga archivos CSV/Excel con estructura SIVIGILA para entrenamiento del modelo</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Upload area + history */}
        <div className="col-span-2 space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
            style={{
              border: `2px dashed ${dragging ? '#6FCF97' : '#D1D5DB'}`,
              background: dragging ? 'rgba(111,207,151,0.06)' : '#F7F9FC',
              padding: '48px 24px',
            }}
          >
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileChange} />
            {uploading ? (
              <>
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#6FCF97', borderTopColor: 'transparent' }} />
                <p className="text-sm font-medium" style={{ color: '#3DAB6B' }}>Procesando archivo y ejecutando ETL...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(111,207,151,0.12)' }}>
                  <Upload className="w-6 h-6" style={{ color: '#3DAB6B' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Arrastra tu archivo aquí o haz clic para seleccionar</p>
                  <p className="text-xs mt-1" style={{ color: '#54606E' }}>Formatos aceptados: CSV, XLSX · Estructura SIVIGILA requerida</p>
                </div>
              </>
            )}
          </div>

          {/* Dataset table */}
          <div style={CARD}>
            <p className="text-sm font-semibold mb-4" style={{ color: '#1A1F2B' }}>Historial de Datasets</p>
            <div className="space-y-2">
              {datasets.map(ds => {
                const cfg = estadoConfig[ds.estado]
                const StatusIcon = cfg.icon
                return (
                  <div
                    key={ds.id}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: selected?.id === ds.id ? 'rgba(111,207,151,0.08)' : '#F7F9FC',
                      border: `1px solid ${selected?.id === ds.id ? 'rgba(111,207,151,0.3)' : '#E0E6ED'}`,
                    }}
                    onClick={() => setSelected(selected?.id === ds.id ? null : ds)}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(79,180,210,0.1)' }}>
                      <FileText className="w-4 h-4" style={{ color: '#4FB4D2' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: '#1A1F2B' }}>{ds.nombre}</p>
                      <p className="text-[11px]" style={{ color: '#54606E' }}>{ds.tipo} · {ds.tamaño} · {ds.registros.toLocaleString()} registros · {ds.fecha}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <StatusIcon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                      <span className="text-[11px] font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); removeDataset(ds.id) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" style={{ color: '#D1D5DB' }} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ETL detail panel */}
        <div className="space-y-4">
          <div style={CARD}>
            <p className="text-sm font-semibold mb-1" style={{ color: '#1A1F2B' }}>Pipeline ETL</p>
            <p className="text-xs mb-4" style={{ color: '#54606E' }}>
              {selected ? `Dataset: ${selected.nombre}` : 'Selecciona un dataset para ver el detalle ETL'}
            </p>
            <div className="space-y-3">
              {etlSteps.map(step => {
                const ok = selected ? selected.etl[step.key] : null
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {ok === null
                        ? <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: '#E0E6ED' }} />
                        : ok
                          ? <CheckCircle className="w-5 h-5" style={{ color: '#43A047' }} />
                          : <XCircle className="w-5 h-5" style={{ color: '#E53935' }} />
                      }
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: ok === false ? '#E53935' : '#1A1F2B' }}>{step.label}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: '#54606E' }}>{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {selected && (
            <div style={CARD}>
              <p className="text-sm font-semibold mb-3" style={{ color: '#1A1F2B' }}>Resumen</p>
              <div className="space-y-2">
                {[
                  ['Registros totales', selected.registros.toLocaleString()],
                  ['Tipo de archivo', selected.tipo],
                  ['Tamaño', selected.tamaño],
                  ['Fecha de carga', selected.fecha],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-xs" style={{ color: '#54606E' }}>{k}</span>
                    <span className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>{v}</span>
                  </div>
                ))}
              </div>
              <button
                className="w-full mt-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(111,207,151,0.12)', color: '#3DAB6B', border: '1px solid rgba(111,207,151,0.3)' }}
              >
                Usar para entrenamiento
              </button>
            </div>
          )}

          <div className="rounded-xl p-4" style={{ background: '#FFF3E0', border: '1px solid #FFE0B2' }}>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#E65100' }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: '#E65100' }}>Formato requerido</p>
                <p className="text-[11px] mt-1" style={{ color: '#BF360C' }}>
                  Los archivos deben tener la estructura SIVIGILA con las columnas: sexo_, edad_meses, area_, peso_act, talla_act, zscore_pt, entre otras.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
