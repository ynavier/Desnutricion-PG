import { useEffect, useState } from 'react'
import { Users, Database, BrainCircuit, BarChart3, ArrowRight, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

const CLAY_CARD = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: 20,
  boxShadow:
    'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.07), ' +
    '0 4px 18px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.04)',
}

const accesos = [
  {
    title: 'Gestión de Usuarios',
    desc:  'Crear, habilitar y administrar cuentas de profesionales de salud.',
    icon:  Users,
    to:    '/adm/usuarios',
    color: '#9B59B6',
  },
  {
    title: 'Datasets SIVIGILA',
    desc:  'Cargar y procesar archivos de datos epidemiológicos.',
    icon:  Database,
    to:    '/adm/datasets',
    color: '#4FB4D2',
  },
  {
    title: 'Entrenamiento ML',
    desc:  'Configurar y ejecutar pipelines de entrenamiento de modelos.',
    icon:  BrainCircuit,
    to:    '/adm/entrenamiento',
    color: '#E67E22',
  },
  {
    title: 'Modelos ML',
    desc:  'Gestionar versiones de modelos y activar el modelo en producción.',
    icon:  BarChart3,
    to:    '/adm/modelos',
    color: '#27AE60',
  },
  {
    title: 'Informe ML',
    desc:  'Generar el informe de desempeño del modelo predictivo activo.',
    icon:  FileText,
    to:    '/adm/reportes',
    color: '#1565C0',
  },
]

export default function HomeADM() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/estadisticas').then(r => setStats(r.data)).catch(() => {})
  }, [])

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-text">Panel Administrativo</h1>
        <p className="text-sm text-neutral-sub mt-1">
          Configuración del sistema, gestión de usuarios y modelos ML.
        </p>
      </div>

      {/* KPIs rápidos */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pacientes registrados',   value: stats.total },
            { label: 'Municipios monitoreados', value: stats.zonas_monitoreadas },
            { label: 'Tasa de desnutrición',    value: `${stats.tasa_desnutricion}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{ ...CLAY_CARD, padding: '20px 24px' }}>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-sub mb-1">{label}</p>
              <p className="text-2xl font-bold text-neutral-text">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Accesos rápidos */}
      <h2 className="text-xs font-semibold text-neutral-sub uppercase tracking-wide mb-4">
        Módulos de administración
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accesos.map(({ title, desc, icon: Icon, to, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="text-left transition-all group"
            style={{
              ...CLAY_CARD,
              padding: '24px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow =
                'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.10), ' +
                '0 8px 26px rgba(0,0,0,0.11), 0 2px 8px rgba(0,0,0,0.06)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow =
                'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.07), ' +
                '0 4px 18px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.04)'
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <Icon className="w-5 h-5" style={{ color }} />
              <ArrowRight className="w-4 h-4 text-neutral-sub group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="font-semibold text-neutral-text text-sm mb-1">{title}</p>
            <p className="text-xs text-neutral-sub leading-relaxed">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
