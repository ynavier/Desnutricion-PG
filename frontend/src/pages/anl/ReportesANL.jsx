import { useState } from 'react'
import { FileDown, FileText, BarChart2, Users, Calendar, Filter, CheckCircle } from 'lucide-react'

const CARD = { background: '#fff', borderRadius: 16, border: '1px solid #E0E6ED', padding: '20px 24px' }

const reportTypes = [
  {
    id: 'nutricional',
    titulo: 'Reporte Nutricional',
    desc: 'Estado nutricional de pacientes por período, zona y establecimiento.',
    icon: BarChart2,
    color: '#4FB4D2',
    bg: 'rgba(79,180,210,0.1)',
  },
  {
    id: 'epidemiologico',
    titulo: 'Reporte Epidemiológico',
    desc: 'Tendencias, incidencia y distribución geográfica de casos de desnutrición.',
    icon: FileText,
    color: '#6FCF97',
    bg: 'rgba(111,207,151,0.1)',
  },
  {
    id: 'pacientes',
    titulo: 'Listado de Pacientes',
    desc: 'Registro completo de pacientes con historial de controles y estado actual.',
    icon: Users,
    color: '#FB8C00',
    bg: 'rgba(251,140,0,0.1)',
  },
  {
    id: 'modelo',
    titulo: 'Desempeño del Modelo ML',
    desc: 'Métricas del modelo activo, comparación histórica y evolución de predicciones.',
    icon: BarChart2,
    color: '#9C27B0',
    bg: 'rgba(156,39,176,0.1)',
  },
]

const zones = ['Todas', 'Ventanilla', 'Callao', 'Ate', 'SJL', 'Villa El Salvador', 'Miraflores']
const establecimientos = ['Todos', 'C.S. Ventanilla', 'C.S. Callao', 'C.S. Ate', 'C.S. SJL', 'P.S. Villa El Salvador']

const mockHistory = [
  { id: 1, tipo: 'Reporte Nutricional', formato: 'PDF', fecha: '2025-05-18', generado: '2025-05-18 10:42', tamaño: '1.2 MB' },
  { id: 2, tipo: 'Reporte Epidemiológico', formato: 'Excel', fecha: '2025-04-30', generado: '2025-05-01 09:15', tamaño: '3.8 MB' },
  { id: 3, tipo: 'Listado de Pacientes', formato: 'Excel', fecha: '2025-03-31', generado: '2025-04-02 11:30', tamaño: '2.1 MB' },
  { id: 4, tipo: 'Desempeño del Modelo ML', formato: 'PDF', fecha: '2025-05-10', generado: '2025-05-10 14:22', tamaño: '0.9 MB' },
]

export default function ReportesANL() {
  const [selectedType, setSelectedType] = useState('nutricional')
  const [format, setFormat] = useState('PDF')
  const [dateFrom, setDateFrom] = useState('2025-01-01')
  const [dateTo, setDateTo] = useState('2025-05-22')
  const [zone, setZone] = useState('Todas')
  const [estab, setEstab] = useState('Todos')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [history, setHistory] = useState(mockHistory)

  const selectedReport = reportTypes.find(r => r.id === selectedType)

  function handleGenerate() {
    setGenerating(true)
    setGenerated(false)
    setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
      const nuevo = {
        id: Date.now(),
        tipo: selectedReport.titulo,
        formato: format,
        fecha: `${dateFrom} — ${dateTo}`,
        generado: new Date().toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }),
        tamaño: (Math.random() * 3 + 0.5).toFixed(1) + ' MB',
      }
      setHistory(prev => [nuevo, ...prev])
      setTimeout(() => setGenerated(false), 3000)
    }, 2200)
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFCFF', minHeight: '100vh' }}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Generación de Reportes</h1>
        <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>Genera y descarga reportes en PDF o Excel para vigilancia nutricional</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Config panel */}
        <div className="col-span-2 space-y-4">
          {/* Report type */}
          <div style={CARD}>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1A1F2B' }}>Tipo de reporte</p>
            <div className="grid grid-cols-2 gap-3">
              {reportTypes.map(rt => {
                const Icon = rt.icon
                const isOn = selectedType === rt.id
                return (
                  <div
                    key={rt.id}
                    onClick={() => setSelectedType(rt.id)}
                    className="rounded-xl p-3 cursor-pointer transition-all"
                    style={{
                      border: `1px solid ${isOn ? rt.color : '#E0E6ED'}`,
                      background: isOn ? rt.bg : '#F7F9FC',
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isOn ? rt.bg : '#F0F0F0' }}>
                        <Icon className="w-4 h-4" style={{ color: isOn ? rt.color : '#9CA3AF' }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: isOn ? '#1A1F2B' : '#54606E' }}>{rt.titulo}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#9CA3AF' }}>{rt.desc}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Filters */}
          <div style={CARD}>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4" style={{ color: '#4FB4D2' }} />
              <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Filtros</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Fecha desde</label>
                <input
                  type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Fecha hasta</label>
                <input
                  type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Zona geográfica</label>
                <select
                  value={zone} onChange={e => setZone(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                >
                  {zones.map(z => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Establecimiento</label>
                <select
                  value={estab} onChange={e => setEstab(e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                >
                  {establecimientos.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* History */}
          <div style={CARD}>
            <p className="text-sm font-semibold mb-4" style={{ color: '#1A1F2B' }}>Reportes generados</p>
            <div className="space-y-2">
              {history.map(h => (
                <div
                  key={h.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: '#F7F9FC', border: '1px solid #E0E6ED' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: h.formato === 'PDF' ? 'rgba(229,57,53,0.1)' : 'rgba(67,160,71,0.1)' }}
                  >
                    <FileDown className="w-4 h-4" style={{ color: h.formato === 'PDF' ? '#E53935' : '#43A047' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#1A1F2B' }}>{h.tipo}</p>
                    <p className="text-[11px]" style={{ color: '#54606E' }}>{h.formato} · {h.tamaño} · {h.generado}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ background: h.formato === 'PDF' ? 'rgba(229,57,53,0.1)' : 'rgba(67,160,71,0.1)', color: h.formato === 'PDF' ? '#E53935' : '#43A047' }}>
                    {h.formato}
                  </span>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                    style={{ background: 'rgba(79,180,210,0.1)', color: '#4FB4D2' }}
                  >
                    Descargar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div style={CARD}>
            <p className="text-sm font-semibold mb-4" style={{ color: '#1A1F2B' }}>Configuración de salida</p>

            <div className="mb-4">
              <label className="text-xs font-medium block mb-2" style={{ color: '#54606E' }}>Formato de exportación</label>
              <div className="grid grid-cols-2 gap-2">
                {['PDF', 'Excel'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className="py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={format === f
                      ? { background: 'rgba(79,180,210,0.12)', color: '#4FB4D2', border: '1px solid rgba(79,180,210,0.4)' }
                      : { background: '#F7F9FC', color: '#54606E', border: '1px solid #E0E6ED' }
                    }
                  >
                    {f === 'PDF' ? '📄 PDF' : '📊 Excel'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 py-3" style={{ borderTop: '1px solid #F0F0F0', borderBottom: '1px solid #F0F0F0' }}>
              {[
                ['Tipo', selectedReport.titulo],
                ['Período', `${dateFrom} → ${dateTo}`],
                ['Zona', zone],
                ['Establecimiento', estab],
                ['Formato', format],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-xs" style={{ color: '#54606E' }}>{k}</span>
                  <span className="text-xs font-semibold text-right truncate" style={{ color: '#1A1F2B', maxWidth: 140 }}>{v}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full mt-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={generating
                ? { background: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }
                : generated
                  ? { background: '#6FCF97', color: '#fff' }
                  : { background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff' }
              }
            >
              {generating
                ? <><div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" /> Generando...</>
                : generated
                  ? <><CheckCircle className="w-4 h-4" /> Reporte listo</>
                  : <><FileDown className="w-4 h-4" /> Generar reporte</>
              }
            </button>
          </div>

          <div className="rounded-xl p-4" style={{ background: 'rgba(79,180,210,0.08)', border: '1px solid rgba(79,180,210,0.2)' }}>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#4FB4D2' }} />
              <p className="text-[11px]" style={{ color: '#1976D2' }}>
                Los reportes incluyen datos procesados y validados según los estándares SIVIGILA del MINSA.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
