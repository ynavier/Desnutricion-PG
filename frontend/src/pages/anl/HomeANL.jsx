import { useState, useEffect } from 'react'
import { Users, AlertTriangle, TrendingUp, MapPin, Activity, BarChart2 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const CARD = { background: '#fff', borderRadius: 16, border: '1px solid #E0E6ED', padding: '20px 24px' }

const nivelColor = {
  crítico: { bg: '#FFEBEE', text: '#B71C1C' },
  alto:    { bg: '#FFF3E0', text: '#E65100' },
  medio:   { bg: '#FFF9C4', text: '#F57F17' },
}

function nivelZona(casos) {
  if (casos >= 10) return 'crítico'
  if (casos >= 5)  return 'alto'
  return 'medio'
}

function SkeletonKpi() {
  return (
    <div style={CARD}>
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-20 rounded" style={{ background: '#F0F0F0' }} />
        <div className="h-7 w-16 rounded" style={{ background: '#F0F0F0' }} />
        <div className="h-2.5 w-24 rounded" style={{ background: '#F0F0F0' }} />
      </div>
    </div>
  )
}

export default function HomeANL() {
  const { user } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/estadisticas')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const kpis = stats ? [
    {
      label: 'Pacientes registrados',
      value: stats.total.toLocaleString('es-CO'),
      sub:   `${stats.en_riesgo} en riesgo nutricional`,
      icon:  Users,
      color: '#4FB4D2',
      bg:    'rgba(79,180,210,0.1)',
    },
    {
      label: 'En riesgo nutricional',
      value: stats.en_riesgo,
      sub:   `${stats.total > 0 ? Math.round(stats.en_riesgo / stats.total * 100) : 0}% del total`,
      icon:  AlertTriangle,
      color: '#E53935',
      bg:    'rgba(229,57,53,0.08)',
    },
    {
      label: 'Tasa de desnutrición',
      value: `${stats.tasa_desnutricion}%`,
      sub:   'Moderada + severa',
      icon:  TrendingUp,
      color: '#6FCF97',
      bg:    'rgba(111,207,151,0.1)',
    },
    {
      label: 'Municipios monitoreados',
      value: stats.zonas_monitoreadas,
      sub:   `${stats.zonas_riesgo.length} zonas con mayor carga`,
      icon:  MapPin,
      color: '#FB8C00',
      bg:    'rgba(251,140,0,0.1)',
    },
  ] : []

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFCFF', minHeight: '100vh' }}>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>
          Bienvenido, {user?.nombre ?? 'Analítico'}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>
          Panel epidemiológico · Vigilancia nutricional infantil
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {loading
          ? [1, 2, 3, 4].map(n => <SkeletonKpi key={n} />)
          : kpis.map(({ label, value, sub, icon: Icon, color, bg }) => (
              <div key={label} style={CARD}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#54606E' }}>{label}</p>
                    <p className="text-2xl font-bold" style={{ color: '#1A1F2B' }}>{value}</p>
                    <p className="text-xs mt-1" style={{ color }}>{sub}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: bg }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                </div>
              </div>
            ))
        }
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Tendencia mensual */}
        <div style={{ ...CARD, gridColumn: 'span 2' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>
                Tendencia Mensual por Estado Nutricional
              </p>
              <p className="text-xs" style={{ color: '#54606E' }}>Últimos 6 meses · controles registrados</p>
            </div>
            <Activity className="w-4 h-4" style={{ color: '#6FCF97' }} />
          </div>
          {loading ? (
            <div className="h-52 rounded-xl animate-pulse" style={{ background: '#F7F9FC' }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats?.tendencia_mensual ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#54606E' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#54606E' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E0E6ED', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="adecuado" stroke="#6FCF97" strokeWidth={2} dot={false} name="Adecuado" />
                <Line type="monotone" dataKey="riesgo"   stroke="#FBC02D" strokeWidth={2} dot={false} name="Riesgo" />
                <Line type="monotone" dataKey="leve"     stroke="#FB8C00" strokeWidth={2} dot={false} name="D. Leve" />
                <Line type="monotone" dataKey="moderado" stroke="#E53935" strokeWidth={2} dot={false} name="D. Moderada" />
                <Line type="monotone" dataKey="severo"   stroke="#B71C1C" strokeWidth={2} dot={false} name="D. Severa" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Distribución Urbana/Rural */}
        <div style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Distribución por Zona</p>
              <p className="text-xs" style={{ color: '#54606E' }}>Urbana vs Rural</p>
            </div>
            <MapPin className="w-4 h-4" style={{ color: '#4FB4D2' }} />
          </div>
          {loading ? (
            <div className="h-44 rounded-xl animate-pulse" style={{ background: '#F7F9FC' }} />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stats?.distribucion_area ?? []}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    dataKey="value"
                  >
                    {(stats?.distribucion_area ?? []).map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => `${v}%`}
                    contentStyle={{ borderRadius: 10, border: '1px solid #E0E6ED', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {(stats?.distribucion_area ?? []).map(d => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                    <span className="text-xs" style={{ color: '#54606E' }}>{d.name} {d.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Distribución por estado nutricional */}
        <div style={{ ...CARD, gridColumn: 'span 2' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>
                Distribución por Estado Nutricional
              </p>
              <p className="text-xs" style={{ color: '#54606E' }}>Total de pacientes registrados</p>
            </div>
            <BarChart2 className="w-4 h-4" style={{ color: '#4FB4D2' }} />
          </div>
          {loading ? (
            <div className="h-44 rounded-xl animate-pulse" style={{ background: '#F7F9FC' }} />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats?.distribucion_estado ?? []} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                <XAxis dataKey="estado" tick={{ fontSize: 11, fill: '#54606E' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#54606E' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E0E6ED', fontSize: 12 }} />
                <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} name="Pacientes">
                  {(stats?.distribucion_estado ?? []).map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Zonas críticas */}
        <div style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Municipios con más casos</p>
            <AlertTriangle className="w-4 h-4" style={{ color: '#E53935' }} />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(n => (
                <div key={n} className="h-8 rounded-lg animate-pulse" style={{ background: '#F7F9FC' }} />
              ))}
            </div>
          ) : (stats?.zonas_riesgo ?? []).length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: '#9CA3AF' }}>
              Sin datos de municipio registrados
            </p>
          ) : (
            <div className="space-y-2.5">
              {(stats?.zonas_riesgo ?? []).map(({ zona, casos }) => {
                const nivel = nivelZona(casos)
                return (
                  <div key={zona} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: '#1A1F2B' }}>{zona}</p>
                      <p className="text-[11px]" style={{ color: '#54606E' }}>{casos} pacientes</p>
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                      style={{ background: nivelColor[nivel].bg, color: nivelColor[nivel].text }}
                    >
                      {nivel}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
