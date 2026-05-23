import { useState } from 'react'
import { Users, AlertTriangle, TrendingUp, MapPin, Activity, BarChart2 } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useAuth } from '../../contexts/AuthContext'

const kpis = [
  { label: 'Casos Detectados', value: '1,248', sub: '+38 este mes', icon: Users, color: '#4FB4D2', bg: 'rgba(79,180,210,0.1)' },
  { label: 'Riesgos Altos', value: '186', sub: '14.9% del total', icon: AlertTriangle, color: '#E53935', bg: 'rgba(229,57,53,0.08)' },
  { label: 'Tasa de Desnutrición', value: '8.3%', sub: '-1.2% vs año anterior', icon: TrendingUp, color: '#6FCF97', bg: 'rgba(111,207,151,0.1)' },
  { label: 'Zonas Monitoreadas', value: '24', sub: '5 zonas críticas', icon: MapPin, color: '#FB8C00', bg: 'rgba(251,140,0,0.1)' },
]

const tendenciaMensual = [
  { mes: 'Ene', adecuado: 210, riesgo: 42, leve: 28, moderado: 15, severo: 5 },
  { mes: 'Feb', adecuado: 198, riesgo: 45, leve: 31, moderado: 18, severo: 6 },
  { mes: 'Mar', adecuado: 225, riesgo: 38, leve: 25, moderado: 12, severo: 4 },
  { mes: 'Abr', adecuado: 215, riesgo: 50, leve: 29, moderado: 16, severo: 7 },
  { mes: 'May', adecuado: 240, riesgo: 44, leve: 27, moderado: 14, severo: 5 },
  { mes: 'Jun', adecuado: 228, riesgo: 47, leve: 30, moderado: 17, severo: 6 },
]

const distribucionEstado = [
  { estado: 'Adecuado', cantidad: 842, fill: '#6FCF97' },
  { estado: 'Riesgo', cantidad: 186, fill: '#FBC02D' },
  { estado: 'D. Leve', cantidad: 142, fill: '#FB8C00' },
  { estado: 'D. Moderada', cantidad: 62, fill: '#E53935' },
  { estado: 'D. Severa', cantidad: 16, fill: '#B71C1C' },
]

const distribucionZona = [
  { name: 'Urbana', value: 68, fill: '#4FB4D2' },
  { name: 'Rural', value: 32, fill: '#6FCF97' },
]

const zonasRiesgo = [
  { zona: 'Ventanilla', casos: 48, nivel: 'crítico' },
  { zona: 'San Juan de Lurigancho', casos: 37, nivel: 'alto' },
  { zona: 'Ate', casos: 29, nivel: 'alto' },
  { zona: 'Villa El Salvador', casos: 24, nivel: 'medio' },
  { zona: 'Callao', casos: 18, nivel: 'medio' },
]

const nivelColor = { crítico: { bg: '#FFEBEE', text: '#B71C1C' }, alto: { bg: '#FFF3E0', text: '#E65100' }, medio: { bg: '#FFF9C4', text: '#F57F17' } }

const CARD = { background: '#fff', borderRadius: 16, border: '1px solid #E0E6ED', padding: '20px 24px' }

export default function HomeANL() {
  const { user } = useAuth()
  const [period, setPeriod] = useState('semestre')

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFCFF', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>
            Bienvenido, {user?.nombre ?? 'Analítico'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>
            Panel epidemiológico · Vigilancia nutricional infantil
          </p>
        </div>
        <div className="flex gap-2">
          {['mes', 'semestre', 'año'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={period === p
                ? { background: 'rgba(111,207,151,0.15)', color: '#3DAB6B', border: '1px solid rgba(111,207,151,0.4)' }
                : { background: '#F7F9FC', color: '#54606E', border: '1px solid #E0E6ED' }
              }
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} style={CARD}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#54606E' }}>{label}</p>
                <p className="text-2xl font-bold" style={{ color: '#1A1F2B' }}>{value}</p>
                <p className="text-xs mt-1" style={{ color }}>{sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Line chart */}
        <div style={{ ...CARD, gridColumn: 'span 2' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Tendencia Mensual por Estado Nutricional</p>
              <p className="text-xs" style={{ color: '#54606E' }}>Últimos 6 meses</p>
            </div>
            <Activity className="w-4 h-4" style={{ color: '#6FCF97' }} />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={tendenciaMensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#54606E' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#54606E' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E0E6ED', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="adecuado" stroke="#6FCF97" strokeWidth={2} dot={false} name="Adecuado" />
              <Line type="monotone" dataKey="riesgo" stroke="#FBC02D" strokeWidth={2} dot={false} name="Riesgo" />
              <Line type="monotone" dataKey="leve" stroke="#FB8C00" strokeWidth={2} dot={false} name="D. Leve" />
              <Line type="monotone" dataKey="moderado" stroke="#E53935" strokeWidth={2} dot={false} name="D. Moderada" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart zona */}
        <div style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Distribución por Zona</p>
              <p className="text-xs" style={{ color: '#54606E' }}>Urbana vs Rural</p>
            </div>
            <MapPin className="w-4 h-4" style={{ color: '#4FB4D2' }} />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={distribucionZona} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                {distribucionZona.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E0E6ED', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {distribucionZona.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                <span className="text-xs" style={{ color: '#54606E' }}>{d.name} {d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bar chart */}
        <div style={{ ...CARD, gridColumn: 'span 2' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Distribución por Estado Nutricional</p>
              <p className="text-xs" style={{ color: '#54606E' }}>Total de casos registrados</p>
            </div>
            <BarChart2 className="w-4 h-4" style={{ color: '#4FB4D2' }} />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={distribucionEstado} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
              <XAxis dataKey="estado" tick={{ fontSize: 11, fill: '#54606E' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#54606E' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E0E6ED', fontSize: 12 }} />
              <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} name="Casos">
                {distribucionEstado.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Zonas de riesgo */}
        <div style={CARD}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Zonas Críticas</p>
            <AlertTriangle className="w-4 h-4" style={{ color: '#E53935' }} />
          </div>
          <div className="space-y-2.5">
            {zonasRiesgo.map(({ zona, casos, nivel }) => (
              <div key={zona} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: '#1A1F2B' }}>{zona}</p>
                  <p className="text-[11px]" style={{ color: '#54606E' }}>{casos} casos</p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
                  style={{ background: nivelColor[nivel].bg, color: nivelColor[nivel].text }}
                >
                  {nivel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
