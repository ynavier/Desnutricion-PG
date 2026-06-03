import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, BarChart2, Users, Filter,
  Download, Mail, Sparkles, Loader2, X, Send,
  Copy, Check, Link, MessageCircle,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import api from '../../services/api'

// ── Design tokens (sidebar / config panel) ───────────────────────────────────
const CARD = {
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: 20,
  boxShadow:
    'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.07), ' +
    '0 4px 18px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.04)',
  padding: '20px 24px',
}

const CHART_COLORS = ['#4FB4D2', '#6FCF97', '#FB8C00', '#E53935', '#9C27B0', '#FBC02D', '#B71C1C']

const ESTADO_FILL = {
  'Normal':           '#6FCF97',
  'Normal bajo':      '#FBC02D',
  'Desnut. leve':     '#FB8C00',
  'Desnut. moderada': '#E53935',
  'Desnut. severa':   '#B71C1C',
  'Sobrepeso':        '#4FB4D2',
  'Obesidad':         '#9B59B6',
}

// ── Report type config ────────────────────────────────────────────────────────
const reportTypes = [
  {
    id: 'nutricional',
    titulo: 'Informe Nutricional',
    tituloCompleto: 'Informe de Evaluación Nutricional — Población Infantil Vigilada',
    desc: 'Estado nutricional de pacientes por período, zona y establecimiento.',
    icon: BarChart2,
    color: '#4FB4D2',
    bg: 'rgba(79,180,210,0.1)',
  },
  {
    id: 'epidemiologico',
    titulo: 'Informe Epidemiológico',
    tituloCompleto: 'Informe Epidemiológico — Desnutrición Infantil en la Región',
    desc: 'Tendencias, incidencia y distribución geográfica de casos de desnutrición.',
    icon: FileText,
    color: '#6FCF97',
    bg: 'rgba(111,207,151,0.1)',
  },
  {
    id: 'pacientes',
    titulo: 'Informe Clínico de Pacientes',
    tituloCompleto: 'Informe Clínico de Pacientes — Desnutrición Infantil',
    desc: 'Registro completo de pacientes con historial de controles y estado actual.',
    icon: Users,
    color: '#FB8C00',
    bg: 'rgba(251,140,0,0.1)',
  },
]

// ── Static content ────────────────────────────────────────────────────────────
const OBJETIVOS = {
  nutricional:
    'Evaluar el estado nutricional de la población infantil bajo vigilancia, identificar distribuciones ' +
    'por clasificación nutricional, zona geográfica y tendencias temporales, orientando intervenciones ' +
    'preventivas y de recuperación conforme a los estándares OMS/WHO.',
  epidemiologico:
    'Analizar la distribución epidemiológica de la desnutrición infantil en el área de vigilancia, ' +
    'identificar municipios con mayor carga de enfermedad y detectar tendencias temporales que permitan ' +
    'la activación oportuna de alertas de salud pública.',
  pacientes:
    'Documentar el estado actual del seguimiento nutricional de la población bajo vigilancia, ' +
    'identificar brechas en la cobertura de controles y priorizar la intervención en pacientes ' +
    'con mayor riesgo de desnutrición activa.',
  modelo:
    'Evaluar el desempeño del modelo de Machine Learning activo para la predicción del estado ' +
    'nutricional infantil, comparar con versiones históricas y formular recomendaciones para la ' +
    'mejora continua del sistema predictivo.',
}

const NOTAS_TECNICAS = {
  nutricional: [
    'El estado nutricional se clasifica siguiendo los criterios OMS/WHO para niños menores de 5 años según el indicador peso/edad (P/E).',
    'El Z-score se calcula utilizando las tablas de referencia de crecimiento infantil de la OMS (2006).',
    'Los datos provienen del Sistema de Vigilancia Nutricional Infantil y se actualizan en tiempo real.',
  ],
  epidemiologico: [
    'Los controles corresponden a registros del sistema de vigilancia nutricional del período evaluado.',
    'La distribución geográfica se basa en el municipio de residencia del paciente según la historia clínica.',
    'La probabilidad de desnutrición corresponde a la predicción del modelo ML activo en el sistema.',
  ],
  pacientes: [
    'Se considera "sin seguimiento en el período" a pacientes sin controles registrados en el rango de fechas aplicado.',
    'El estado nutricional mostrado corresponde al último control registrado en el sistema.',
    'La tabla muestra un máximo de 50 registros en el informe PDF.',
  ],
  modelo: [
    'Las métricas reportadas corresponden al modelo activo al momento de generación del informe.',
    'El accuracy y métricas derivadas se calculan sobre el conjunto de validación del último entrenamiento.',
    'Un ROC-AUC > 0.85 se considera óptimo para sistemas de vigilancia nutricional predictiva.',
  ],
}

const REFERENCIAS = [
  'OMS/WHO. Child growth standards. World Health Organization, Geneva, 2006.',
  'SIVIGILA — Sistema Nacional de Vigilancia en Salud Pública, Colombia. Protocolo de vigilancia nutricional.',
  'ESPEN guidelines on clinical nutrition and hydration in geriatrics. Clinical Nutrition, 2019.',
  'UNICEF. Improving child nutrition: The achievable imperative for global progress, 2013.',
  'Ministerio de Salud y Protección Social. Guías de Atención Integral en Nutrición Infantil, Colombia.',
]

// ── Clinical document primitive components ────────────────────────────────────

function SectionHeader({ number, title }) {
  return (
    <div
      className="report-section-header"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        paddingBottom: 10, marginBottom: 16,
        borderBottom: '2px solid #0D47A1',
      }}
    >
      <span style={{
        background: '#0D47A1', color: '#fff',
        width: 26, height: 26, borderRadius: 5,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {number}
      </span>
      <h2 style={{
        color: '#0D47A1', fontSize: 13, fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0,
      }}>
        {title}
      </h2>
    </div>
  )
}

function ReportSection({ number, title, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <SectionHeader number={number} title={title} />
      <div style={{ paddingLeft: 4 }}>{children}</div>
    </div>
  )
}

function ReportSubsection({ number, title, children }) {
  return (
    <div className="report-subsection" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 10 }}>
        <span style={{ color: '#9CA3AF', fontSize: 11, fontFamily: 'monospace', fontWeight: 600, flexShrink: 0 }}>
          {number}
        </span>
        <h3 style={{
          color: '#1565C0', fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
        }}>
          {title}
        </h3>
        <div style={{ flex: 1, height: 1, background: '#E3F2FD', marginLeft: 4 }} />
      </div>
      <div style={{ paddingLeft: 20, fontSize: 13, color: '#374151', lineHeight: '1.75' }}>
        {children}
      </div>
    </div>
  )
}

// Formal KPI table
function KpiTable({ kpis }) {
  const entries = Object.entries(kpis).filter(([, v]) => v !== null && v !== undefined)
  if (!entries.length) return null
  return (
    <div className="report-kpi-table" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #BBDEFB' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#0D47A1' }}>
            <th style={{ padding: '9px 16px', textAlign: 'left', color: '#fff', fontWeight: 600, fontSize: 11, width: '65%' }}>
              Indicador
            </th>
            <th style={{ padding: '9px 16px', textAlign: 'right', color: '#fff', fontWeight: 600, fontSize: 11 }}>
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v], i) => (
            <tr key={k} style={{ background: i % 2 === 0 ? '#F7F9FC' : '#fff', borderBottom: '1px solid #E3F2FD' }}>
              <td style={{ padding: '8px 16px', color: '#374151', fontWeight: 500 }}>
                {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </td>
              <td style={{ padding: '8px 16px', textAlign: 'right', color: '#0D47A1', fontWeight: 700 }}>
                {String(v)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Bulleted list
function BulletList({ items = [], color = '#0D47A1' }) {
  if (!items.length) return null
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: color, flexShrink: 0, marginTop: 7,
          }} />
          <span style={{ fontSize: 13, color: '#374151', lineHeight: '1.65' }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

// Numbered recommendations
function RecList({ items = [] }) {
  if (!items.length) return null
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 11 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 4,
            background: '#E3F2FD', color: '#1565C0',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {i + 1}
          </span>
          <span style={{ fontSize: 13, color: '#374151', lineHeight: '1.65' }}>{item}</span>
        </li>
      ))}
    </ol>
  )
}

// Chart label
function ChartCaption({ text }) {
  return (
    <p className="report-chart-caption" style={{
      fontSize: 11, color: '#546E7A', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      paddingLeft: 10, borderLeft: '3px solid #4FB4D2',
      marginBottom: 14,
    }}>
      {text}
    </p>
  )
}

// Area / urban-rural mini table helper
function AreaTable({ data }) {
  return (
    <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
      <thead>
        <tr style={{ background: '#F7F9FC' }}>
          <th style={{ padding: '6px 12px', textAlign: 'left', color: '#546E7A', fontWeight: 600 }}>Área</th>
          <th style={{ padding: '6px 12px', textAlign: 'right', color: '#546E7A', fontWeight: 600 }}>%</th>
        </tr>
      </thead>
      <tbody>
        {data.map(d => (
          <tr key={d.name} style={{ borderBottom: '1px solid #E3F2FD' }}>
            <td style={{ padding: '7px 12px', color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
              {d.name}
            </td>
            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#0D47A1' }}>{d.value}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Patients table ────────────────────────────────────────────────────────────
function TablaPacientes({ tabla }) {
  if (!tabla || tabla.length === 0) return null
  const cols   = ['nombre', 'edad', 'sexo', 'municipio', 'establecimiento', 'ultimo_estado', 'ultimo_control', 'n_controles']
  const labels = ['Nombre', 'Edad', 'Sexo', 'Municipio', 'Establecimiento', 'Último estado', 'Último control', 'Ctrls.']
  return (
    <div className="report-pacientes-table" style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #BBDEFB' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#0D47A1' }}>
            {labels.map(l => (
              <th key={l} style={{ padding: '9px 10px', textAlign: 'left', color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabla.slice(0, 50).map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#F7F9FC' : '#fff', borderBottom: '1px solid #E3F2FD' }}>
              {cols.map(col => (
                <td key={col} style={{ padding: '6px 10px', color: '#374151', whiteSpace: 'nowrap' }}>
                  {col === 'ultimo_estado' ? (
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: ESTADO_FILL[row[col]] || '#546E7A',
                    }}>
                      {row[col]}
                    </span>
                  ) : (row[col] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Per-type data sections ────────────────────────────────────────────────────

function SectionsNutricional({ charts }) {
  const { distribucion_estado = [], tendencia_mensual = [], zonas_top = [], distribucion_area = [] } = charts

  return (
    <>
      {/* Section 2 */}
      <ReportSection number="2" title="Estado Nutricional de la Población">
        <ReportSubsection number="2.1" title="Distribución por clasificación nutricional">
          {distribucion_estado.length > 0 ? (
            <>
              <ChartCaption text="Número de pacientes según última clasificación nutricional registrada" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distribucion_estado} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="estado" tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E6ED', fontSize: 12 }} />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                    {distribucion_estado.map((e, i) => <Cell key={i} fill={ESTADO_FILL[e.estado] || CHART_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos para el período seleccionado.</p>
          )}
        </ReportSubsection>

        <ReportSubsection number="2.2" title="Distribución por área de residencia (urbana / rural)">
          {distribucion_area.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 20, alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={distribucion_area} dataKey="value" cx="50%" cy="50%" innerRadius={34} outerRadius={56}>
                    {distribucion_area.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={v => `${v}%`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <AreaTable data={distribucion_area} />
            </div>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos de área disponibles.</p>
          )}
        </ReportSubsection>
      </ReportSection>

      {/* Section 3 */}
      <ReportSection number="3" title="Distribución Geográfica">
        <ReportSubsection number="3.1" title="Municipios con mayor concentración de pacientes en riesgo">
          {zonas_top.length > 0 ? (
            <>
              <ChartCaption text="Número de pacientes por municipio de residencia (Top 10)" />
              <ResponsiveContainer width="100%" height={Math.max(160, zonas_top.length * 26)}>
                <BarChart data={zonas_top} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="zona" type="category" tick={{ fontSize: 10, fill: '#374151' }} width={85} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E6ED', fontSize: 12 }} />
                  <Bar dataKey="casos" fill="#1565C0" radius={[0, 4, 4, 0]} name="Pacientes" />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos geográficos para el período.</p>
          )}
        </ReportSubsection>
      </ReportSection>

      {/* Section 4 */}
      <ReportSection number="4" title="Tendencias Temporales">
        <ReportSubsection number="4.1" title="Evolución mensual por estado nutricional (últimos 6 meses)">
          {tendencia_mensual.length > 0 ? (
            <>
              <ChartCaption text="Controles registrados por clasificación y mes" />
              {/* HTML legend — renders correctly in print/PDF unlike Recharts <Legend> */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', marginBottom: 10 }}>
                {[
                  { name: 'Adecuado',    color: '#43A047' },
                  { name: 'Riesgo',      color: '#FBC02D' },
                  { name: 'D. Leve',     color: '#FB8C00' },
                  { name: 'D. Moderada', color: '#E53935' },
                  { name: 'D. Severa',   color: '#B71C1C' },
                ].map(l => (
                  <span key={l.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#374151' }}>
                    <span style={{ display: 'inline-block', width: 22, height: 3, background: l.color, borderRadius: 2 }} />
                    {l.name}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={tendencia_mensual} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E6ED', fontSize: 12 }} />
                  <Line type="monotone" dataKey="adecuado" stroke="#43A047" strokeWidth={2} dot={false} name="Adecuado" />
                  <Line type="monotone" dataKey="riesgo"   stroke="#FBC02D" strokeWidth={2} dot={false} name="Riesgo" />
                  <Line type="monotone" dataKey="leve"     stroke="#FB8C00" strokeWidth={2} dot={false} name="D. Leve" />
                  <Line type="monotone" dataKey="moderado" stroke="#E53935" strokeWidth={2} dot={false} name="D. Moderada" />
                  <Line type="monotone" dataKey="severo"   stroke="#B71C1C" strokeWidth={2} dot={false} name="D. Severa" />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos de tendencia disponibles.</p>
          )}
        </ReportSubsection>
      </ReportSection>
    </>
  )
}

function SectionsEpidemiologico({ charts }) {
  const { incidencia_municipios = [], tendencia_casos = [], distribucion_sexo = [], distribucion_edad = [] } = charts

  return (
    <>
      {/* Section 2 */}
      <ReportSection number="2" title="Caracterización de la Población">
        <ReportSubsection number="2.1" title="Distribución por sexo">
          {distribucion_sexo.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 20, alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={distribucion_sexo} dataKey="cantidad" nameKey="sexo" cx="50%" cy="50%" outerRadius={56}>
                    {distribucion_sexo.map((e, i) => <Cell key={i} fill={e.fill || CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
                <thead>
                  <tr style={{ background: '#F7F9FC' }}>
                    <th style={{ padding: '6px 12px', textAlign: 'left', color: '#546E7A', fontWeight: 600 }}>Sexo</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right', color: '#546E7A', fontWeight: 600 }}>Controles</th>
                  </tr>
                </thead>
                <tbody>
                  {distribucion_sexo.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E3F2FD' }}>
                      <td style={{ padding: '7px 12px', color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: d.fill || CHART_COLORS[i], display: 'inline-block' }} />
                        {d.sexo}
                      </td>
                      <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: '#0D47A1' }}>{d.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos disponibles.</p>
          )}
        </ReportSubsection>

        <ReportSubsection number="2.2" title="Distribución por rango de edad">
          {distribucion_edad.length > 0 ? (
            <>
              <ChartCaption text="Número de controles por grupo etario" />
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={distribucion_edad} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="rango" tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E6ED', fontSize: 12 }} />
                  <Bar dataKey="cantidad" fill="#43A047" radius={[4, 4, 0, 0]} name="Controles" />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos de edad disponibles.</p>
          )}
        </ReportSubsection>
      </ReportSection>

      {/* Section 3 */}
      <ReportSection number="3" title="Carga Epidemiológica por Municipio">
        <ReportSubsection number="3.1" title="Incidencia y riesgo por municipio (Top 10)">
          {incidencia_municipios.length > 0 ? (
            <>
              <ChartCaption text="Controles en riesgo por municipio de residencia" />
              <ResponsiveContainer width="100%" height={Math.max(180, incidencia_municipios.length * 28)}>
                <BarChart data={incidencia_municipios} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="municipio" type="category" tick={{ fontSize: 10, fill: '#374151' }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E6ED', fontSize: 12 }} />
                  <Bar dataKey="riesgo" fill="#C62828" radius={[0, 4, 4, 0]} name="En riesgo" />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos geográficos disponibles.</p>
          )}
        </ReportSubsection>

        {incidencia_municipios.length > 0 && (
          <ReportSubsection number="3.2" title="Tabla de incidencia por municipio">
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #BBDEFB' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#0D47A1' }}>
                    {['Municipio', 'Total controles', 'En riesgo', 'Tasa (%)'].map((h, i) => (
                      <th key={h} style={{ padding: '8px 14px', textAlign: i === 0 ? 'left' : 'right', color: '#fff', fontWeight: 600, fontSize: 11 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incidencia_municipios.slice(0, 10).map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#F7F9FC' : '#fff', borderBottom: '1px solid #E3F2FD' }}>
                      <td style={{ padding: '7px 14px', color: '#374151', fontWeight: 500 }}>{row.municipio}</td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', color: '#1A1F2B' }}>{row.total}</td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', color: '#C62828', fontWeight: 700 }}>{row.riesgo}</td>
                      <td style={{ padding: '7px 14px', textAlign: 'right', color: '#374151' }}>{row.tasa}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSubsection>
        )}
      </ReportSection>

      {/* Section 4 */}
      <ReportSection number="4" title="Tendencias Temporales">
        <ReportSubsection number="4.1" title="Tendencia de controles registrados en el período">
          {tendencia_casos.length > 0 ? (
            <>
              <ChartCaption text="Total de controles por mes en el período evaluado" />
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={tendencia_casos} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E6ED', fontSize: 12 }} />
                  <Line type="monotone" dataKey="casos" stroke="#1565C0" strokeWidth={2.5} dot={{ r: 3, fill: '#1565C0' }} name="Controles" />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos de tendencia disponibles.</p>
          )}
        </ReportSubsection>
      </ReportSection>
    </>
  )
}

function SectionsPacientes({ charts, tabla }) {
  const { distribucion_estado = [], distribucion_area = [], piramide_edad = [] } = charts

  return (
    <>
      {/* Section 2 */}
      <ReportSection number="2" title="Caracterización Demográfica">
        <ReportSubsection number="2.1" title="Distribución por rango de edad">
          {piramide_edad.length > 0 ? (
            <>
              <ChartCaption text="Número de pacientes por grupo etario" />
              <ResponsiveContainer width="100%" height={185}>
                <BarChart data={piramide_edad} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="rango" tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E6ED', fontSize: 12 }} />
                  <Bar dataKey="cantidad" fill="#E65100" radius={[4, 4, 0, 0]} name="Pacientes" />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos de edad disponibles.</p>
          )}
        </ReportSubsection>

        <ReportSubsection number="2.2" title="Distribución por área de residencia">
          {distribucion_area.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 20, alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={distribucion_area} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={54}>
                    {distribucion_area.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={v => `${v}%`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <AreaTable data={distribucion_area} />
            </div>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos de área disponibles.</p>
          )}
        </ReportSubsection>
      </ReportSection>

      {/* Section 3 */}
      <ReportSection number="3" title="Estado Nutricional y Cobertura de Seguimiento">
        <ReportSubsection number="3.1" title="Distribución del estado nutricional (último control registrado)">
          {distribucion_estado.length > 0 ? (
            <>
              <ChartCaption text="Pacientes por clasificación nutricional" />
              <ResponsiveContainer width="100%" height={195}>
                <BarChart data={distribucion_estado} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="estado" tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E6ED', fontSize: 12 }} />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                    {distribucion_estado.map((e, i) => <Cell key={i} fill={ESTADO_FILL[e.estado] || CHART_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin datos de estado nutricional disponibles.</p>
          )}
        </ReportSubsection>
      </ReportSection>

      {/* Section 4 */}
      {tabla && tabla.length > 0 && (
        <ReportSection number="4" title="Listado de Pacientes Registrados">
          <ReportSubsection number="4.1" title={`Registro individual de pacientes — ${tabla.length} total (mostrando primeros 50)`}>
            <TablaPacientes tabla={tabla} />
          </ReportSubsection>
        </ReportSection>
      )}
    </>
  )
}

function SectionsModelo({ charts }) {
  const { radar_metricas = [], evolucion_accuracy = [] } = charts

  return (
    <>
      {/* Section 2 */}
      <ReportSection number="2" title="Métricas de Rendimiento del Modelo Activo">
        <ReportSubsection number="2.1" title="Diagrama radar de métricas globales">
          {radar_metricas.length > 0 ? (
            <>
              <ChartCaption text="Comparación de métricas del modelo activo (escala 0-100%)" />
              <ResponsiveContainer width="100%" height={270}>
                <RadarChart data={radar_metricas} margin={{ top: 10, right: 36, bottom: 10, left: 36 }}>
                  <PolarGrid stroke="#BBDEFB" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#374151' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                  <Radar name="Valor" dataKey="value" stroke="#0D47A1" fill="#0D47A1" fillOpacity={0.18} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E6ED', fontSize: 12 }} formatter={v => [`${v}%`, 'Valor']} />
                </RadarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin métricas disponibles.</p>
          )}
        </ReportSubsection>

        {radar_metricas.length > 0 && (
          <ReportSubsection number="2.2" title="Tabla de métricas detallada con interpretación">
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #BBDEFB' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#0D47A1' }}>
                    {['Métrica', 'Valor', 'Umbral', 'Interpretación'].map((h, i) => (
                      <th key={h} style={{ padding: '9px 14px', textAlign: i === 0 ? 'left' : 'right', color: '#fff', fontWeight: 600, fontSize: 11 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {radar_metricas.map((row, i) => {
                    const v = row.value
                    const [interp, ic] = v >= 90 ? ['Excelente', '#2E7D32']
                      : v >= 80 ? ['Bueno', '#1565C0']
                      : v >= 70 ? ['Aceptable', '#E65100']
                      : ['Requiere mejora', '#C62828']
                    return (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#F7F9FC' : '#fff', borderBottom: '1px solid #E3F2FD' }}>
                        <td style={{ padding: '8px 14px', color: '#374151', fontWeight: 500 }}>{row.metric}</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 700, color: '#0D47A1' }}>{v}%</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', color: '#546E7A' }}>≥ 80%</td>
                        <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 600, fontSize: 11, color: ic }}>{interp}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ReportSubsection>
        )}
      </ReportSection>

      {/* Section 3 */}
      <ReportSection number="3" title="Evolución Histórica del Modelo">
        <ReportSubsection number="3.1" title="Accuracy por versión entrenada del modelo">
          {evolucion_accuracy.length > 0 ? (
            <>
              <ChartCaption text="Evolución del accuracy a través de las versiones del modelo predictivo" />
              <ResponsiveContainer width="100%" height={205}>
                <LineChart data={evolucion_accuracy} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#546E7A' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#546E7A' }} unit="%" axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E0E6ED', fontSize: 12 }} formatter={v => [`${v}%`, 'Accuracy']} />
                  <Line type="monotone" dataKey="accuracy" stroke="#0D47A1" strokeWidth={2.5} dot={{ r: 4, fill: '#0D47A1' }} name="Accuracy" />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <p style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic' }}>Sin historial de modelos disponible.</p>
          )}
        </ReportSubsection>
      </ReportSection>
    </>
  )
}

// ── Section offsets per type ──────────────────────────────────────────────────
// Secciones: 1=KPIs, 2-4=Gráficas, 5=Objetivo+Síntesis, 6=Análisis, 7=Conclusiones, 8=Notas
const SO = {
  nutricional:    { analysis: 6, conclusions: 7, notes: 8 },
  epidemiologico: { analysis: 6, conclusions: 7, notes: 8 },
  pacientes:      { analysis: 6, conclusions: 7, notes: 8 },
}

// ── Genera HTML del informe para subir a Supabase Storage ────────────────────
// Captura el DOM del informe, oculta los botones, y produce un HTML
// autocontenido que el destinatario puede abrir en el navegador e imprimir.
function generarHtmlInforme(elementId) {
  const el = document.getElementById(elementId)
  if (!el) throw new Error('Elemento del informe no encontrado')

  // Clonar para no modificar el DOM original
  const clon = el.cloneNode(true)

  // Quitar botones y elementos que no deben aparecer
  clon.querySelectorAll('[class*="print:hidden"], .print\\:hidden, button, [data-no-pdf]')
      .forEach(e => e.remove())

  // Recolectar todos los estilos del documento
  const estilos = Array.from(document.styleSheets)
    .flatMap(ss => {
      try { return Array.from(ss.cssRules).map(r => r.cssText) }
      catch { return [] }
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Informe NutriVigilancia</title>
  <style>
    ${estilos}
    body { margin: 0; background: #f5f7fa; font-family: system-ui, sans-serif; }
    .report-print-doc { max-width: 900px; margin: 0 auto; }
    @media print {
      body { background: white; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>
  ${clon.outerHTML}
  <div style="text-align:center;padding:24px;color:#9CA3AF;font-size:11px">
    Para exportar como PDF: Archivo → Guardar como PDF (en el diálogo del navegador)
  </div>
</body>
</html>`

  // Convertir a base64 con soporte correcto para UTF-8
  const bytes  = new TextEncoder().encode(html)
  let binary   = ''
  const chunk  = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// ── Modal compartir ───────────────────────────────────────────────────────────
function ModalCompartir({ reportData, onClose }) {
  const [step,    setStep]    = useState('idle')   // idle | generando | listo | error
  const [link,    setLink]    = useState('')
  const [copiado, setCopiado] = useState(false)
  const [err,     setErr]     = useState('')

  const nombre = `informe_${reportData.tipo}_${new Date().toISOString().slice(0,10)}.pdf`
  const fileRef = useRef(null)

  async function subirArchivo(file) {
    if (!file || file.type !== 'application/pdf') {
      setErr('Selecciona un archivo PDF válido.')
      return
    }
    setStep('generando'); setErr('')
    try {
      const reader = new FileReader()
      const base64 = await new Promise((res, rej) => {
        reader.onload  = e => res(e.target.result.split(',')[1])
        reader.onerror = rej
        reader.readAsDataURL(file)
      })
      const { default: api } = await import('../../services/api')
      const { data } = await api.post('/compartir/subir-pdf', {
        pdf_base64:     base64,
        nombre_archivo: file.name || nombre,
        titulo:         reportData.titulo,
      })
      setLink(data.url)
      setStep('listo')
    } catch (e) {
      setErr(e.response?.data?.detail || 'Error al subir el PDF.')
      setStep('error')
    }
  }

  function copiar() {
    navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const asunto  = encodeURIComponent(`Informe: ${reportData.titulo}`)
  const cuerpo  = encodeURIComponent(`Accede al informe aquí:\n${link}\n\n(Válido 7 días — ábrelo en el navegador y usa Ctrl+P para guardarlo como PDF)\n\n— NutriVigilancia`)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
        style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-neutral-text">Compartir informe</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-bg">
            <X className="w-4 h-4 text-neutral-sub" />
          </button>
        </div>

        {/* Estado: idle — flujo 2 pasos */}
        {step === 'idle' && (
          <>
            {/* Paso 1 */}
            <div className="flex items-start gap-3 mb-4">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ background: '#0D47A1' }}>1</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-neutral-text mb-1">Descarga el PDF</p>
                <p className="text-xs text-neutral-sub mb-2">Usa el botón <strong>Exportar PDF</strong> del encabezado del informe para obtener el archivo.</p>
                <button onClick={() => { onClose(); setTimeout(() => window.print(), 100) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-neutral-border hover:bg-neutral-bg transition-all">
                  <Download className="w-3.5 h-3.5" /> Exportar PDF ahora
                </button>
              </div>
            </div>

            <div className="border-t border-neutral-border my-3" />

            {/* Paso 2 */}
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{ background: '#0D47A1' }}>2</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-neutral-text mb-1">Sube el PDF y obtén el link</p>
                <p className="text-xs text-neutral-sub mb-3">Selecciona el PDF que acabas de descargar para obtener un link de descarga.</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => subirArchivo(e.target.files?.[0])}
                />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#0D47A1,#1976D2)', color: '#fff' }}>
                  <Link className="w-4 h-4" /> Seleccionar PDF y generar link
                </button>
              </div>
            </div>
          </>
        )}

        {/* Estado: generando */}
        {step === 'generando' && (
          <div className="flex flex-col items-center py-6 gap-3 text-neutral-sub">
            <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#1565C0' }} />
            <p className="text-sm">Generando PDF y subiendo…</p>
          </div>
        )}

        {/* Estado: error */}
        {step === 'error' && (
          <>
            <div className="px-4 py-3 rounded-xl text-xs mb-4" style={{ background: '#FEF2F2', color: '#B91C1C' }}>
              {err}
            </div>
            <button onClick={() => setStep('idle')}
              className="w-full py-2 rounded-xl text-sm font-medium text-neutral-sub border border-neutral-border hover:bg-neutral-bg">
              Reintentar
            </button>
          </>
        )}

        {/* Estado: listo */}
        {step === 'listo' && (
          <div className="space-y-3">
            {/* Link */}
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <Link className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#15803D' }} />
              <p className="text-xs flex-1 truncate font-medium" style={{ color: '#15803D' }}>
                Link generado — abre el informe en el navegador
              </p>
            </div>

            {/* Copiar link */}
            <button onClick={copiar}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={copiado
                ? { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }
                : { background: '#F8FAFC', color: '#374151', border: '1px solid #E2E8F0' }}>
              {copiado ? <><Check className="w-4 h-4" />¡Copiado!</> : <><Copy className="w-4 h-4" />Copiar link</>}
            </button>

            {/* Compartir por... */}
            <p className="text-[10px] text-center font-semibold text-neutral-sub uppercase tracking-wide">
              Compartir por
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
              {/* Correo */}
              <a href={`mailto:?subject=${asunto}&body=${cuerpo}`}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all hover:bg-neutral-bg"
                style={{ border: '1px solid #E2E8F0', color: '#374151', textDecoration: 'none' }}>
                <Mail className="w-5 h-5" style={{ color: '#6366F1' }} />
                Correo
              </a>
              {/* Outlook */}
              <a href={`https://outlook.live.com/mail/0/deeplink/compose?to=&subject=${asunto}&body=${cuerpo}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all hover:bg-neutral-bg"
                style={{ border: '1px solid #E2E8F0', color: '#374151', textDecoration: 'none' }}>
                <img src="https://img.icons8.com/color/28/microsoft-outlook-2019.png" alt="Outlook" className="w-5 h-5" />
                Outlook
              </a>
              {/* WhatsApp */}
              <a href={`https://wa.me/?text=${encodeURIComponent(`*${reportData.titulo}*\n\nDescarga el informe aquí:\n${link}\n\n_(válido 7 días)_`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all hover:bg-neutral-bg"
                style={{ border: '1px solid #E2E8F0', color: '#374151', textDecoration: 'none' }}>
                <MessageCircle className="w-5 h-5" style={{ color: '#25D366' }} />
                WhatsApp
              </a>
            </div>

            <p className="text-[10px] text-neutral-sub text-center">
              El destinatario podrá descargar el PDF directamente desde el link.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Report preview — formal clinical document ─────────────────────────────────
function ReportPreview({ reportData }) {
  const { titulo, filtros = {}, generado, kpis = {}, charts = {}, tabla = [], analisis, tipo } = reportData
  const rt = reportTypes.find(r => r.id === tipo)
  const so = SO[tipo] || SO.nutricional
  const [modalCompartir, setModalCompartir] = useState(false)

  return (
    <div className="lg:col-span-2 print:col-span-3">
      {modalCompartir && <ModalCompartir reportData={reportData} onClose={() => setModalCompartir(false)} />}
      <div id="report-print-doc" className="report-print-doc" style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 28px rgba(0,0,0,0.09), 0 1px 6px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>

        {/* ── Document header ─── */}
        <div className="report-print-header" style={{
          background: 'linear-gradient(135deg, #0A3880 0%, #0D47A1 55%, #1565C0 100%)',
          padding: '28px 40px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="report-print-institution" style={{
                color: 'rgba(255,255,255,0.6)', fontSize: 10,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                fontWeight: 600, marginBottom: 8,
              }}>
                Sistema de Vigilancia Nutricional Infantil
              </p>
              <h1 className="report-print-title" style={{ color: '#fff', fontSize: 19, fontWeight: 800, lineHeight: 1.3, marginBottom: 12 }}>
                {rt?.tituloCompleto || titulo}
              </h1>
              <div className="report-print-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                  Período:{' '}
                  <strong style={{ color: '#fff' }}>{filtros.fecha_desde || 'N/A'}</strong>
                  {' → '}
                  <strong style={{ color: '#fff' }}>{filtros.fecha_hasta || 'N/A'}</strong>
                </span>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                  Generado: <strong style={{ color: '#fff' }}>{generado?.replace('T', ' ') || '—'}</strong>
                </span>
                {filtros.zona && (
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                    Zona: <strong style={{ color: '#fff' }}>{filtros.zona}</strong>
                  </span>
                )}
                {filtros.establecimiento && (
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                    Establecimiento: <strong style={{ color: '#fff' }}>{filtros.establecimiento}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Botones Compartir + Descargar */}
            <div className="print:hidden" style={{ flexShrink: 0, display: 'flex', gap: 8 }}>
              <button
                onClick={() => setModalCompartir(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.12)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 600,
                }}
              >
                <Mail size={13} /> Compartir
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.22)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 600,
                }}
              >
                <Download size={13} /> Exportar PDF
              </button>
            </div>
          </div>

          {/* Source & confidentiality strip */}
          <div className="report-print-conf-strip" style={{
            marginTop: 16, paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
          }}>
            <span style={{
              background: analisis?.fuente === 'ia' ? 'rgba(129,199,132,0.22)' : 'rgba(255,255,255,0.1)',
              color: analisis?.fuente === 'ia' ? '#A5D6A7' : 'rgba(255,255,255,0.65)',
              border: `1px solid ${analisis?.fuente === 'ia' ? 'rgba(129,199,132,0.4)' : 'rgba(255,255,255,0.2)'}`,
              padding: '3px 12px', borderRadius: 20, fontSize: 10, fontWeight: 600,
            }}>
              {analisis?.fuente === 'ia'
                ? `Análisis IA · ${analisis.modelo_usado || 'Gemini'}`
                : 'Análisis basado en datos del sistema'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
              Documento confidencial — uso exclusivo del sistema de vigilancia
            </span>
          </div>
        </div>

        {/* ── Document body ─── */}
        <div className="report-print-body" style={{ padding: '40px 44px' }}>

          {/* SECTION 1: Indicadores Clave (siempre primero, visual) */}
          <ReportSection number="1" title="Indicadores Clave del Período">
            <ReportSubsection number="1.1" title="Métricas principales del período evaluado">
              <KpiTable kpis={kpis} />
            </ReportSubsection>
          </ReportSection>

          {/* SECTIONS 2-4: Gráficas y datos por tipo (antes del texto) */}
          {tipo === 'nutricional'    && <SectionsNutricional    charts={charts} />}
          {tipo === 'epidemiologico' && <SectionsEpidemiologico charts={charts} />}
          {tipo === 'pacientes'      && <SectionsPacientes      charts={charts} tabla={tabla} />}

          {/* SECTION 5: Objetivo + Síntesis + Hallazgos (texto después de las gráficas) */}
          <ReportSection number={so.analysis - 1} title="Objetivo y Síntesis del Informe">
            <ReportSubsection number={`${so.analysis - 1}.1`} title="Objetivo del Informe">
              <p style={{ margin: 0 }}>
                {analisis?.objetivo || OBJETIVOS[tipo] || OBJETIVOS.nutricional}
              </p>
            </ReportSubsection>

            {analisis?.resumen && (
              <ReportSubsection number={`${so.analysis - 1}.2`} title="Síntesis de Resultados">
                <p style={{ margin: 0 }}>{analisis.resumen}</p>
              </ReportSubsection>
            )}

            {analisis?.hallazgos?.length > 0 && (
              <ReportSubsection number={`${so.analysis - 1}.3`} title="Principales Hallazgos">
                <BulletList items={analisis.hallazgos} color="#0D47A1" />
              </ReportSubsection>
            )}
          </ReportSection>

          {/* SECTION 6: Análisis y Discusión */}
          {analisis?.discusion && (
            <ReportSection number={so.analysis} title="Análisis y Discusión Epidemiológica">
              <ReportSubsection number={`${so.analysis}.1`} title="Interpretación de los Hallazgos">
                <p style={{ margin: 0 }}>{analisis.discusion}</p>
              </ReportSubsection>
            </ReportSection>
          )}

          {/* SECTION 7: Conclusiones y Recomendaciones */}
          <ReportSection number={so.conclusions} title="Conclusiones Clínicas y Recomendaciones">
            {analisis?.conclusiones?.length > 0 && (
              <ReportSubsection number={`${so.conclusions}.1`} title="Conclusiones">
                <BulletList items={analisis.conclusiones} color="#0D47A1" />
              </ReportSubsection>
            )}
            {analisis?.recomendaciones?.length > 0 && (
              <ReportSubsection number={`${so.conclusions}.2`} title="Recomendaciones para la Práctica Clínica">
                <RecList items={analisis.recomendaciones} />
              </ReportSubsection>
            )}
          </ReportSection>

          {/* SECTION 8: Notas Técnicas y Referencias */}
          <ReportSection number={so.notes} title="Notas Técnicas y Referencias">
            <ReportSubsection number={`${so.notes}.1`} title="Fuentes de datos y consideraciones metodológicas">
              <BulletList items={NOTAS_TECNICAS[tipo] || []} color="#4FB4D2" />
            </ReportSubsection>
            <ReportSubsection number={`${so.notes}.2`} title="Estándares y bibliografía de referencia">
              <BulletList items={REFERENCIAS} color="#9CA3AF" />
            </ReportSubsection>
          </ReportSection>

          {/* Footer */}
          <div className="report-print-footer" style={{
            marginTop: 32, paddingTop: 16,
            borderTop: '1px solid #E3F2FD',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
          }}>
            <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>
              Sistema de Vigilancia Nutricional Infantil · Documento confidencial · {generado?.replace('T', ' ')}
            </p>
            <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0 }}>
              {analisis?.fuente === 'ia' ? `Análisis generado por IA · ${analisis.modelo_usado}` : 'Análisis estático'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Config / right panel ──────────────────────────────────────────────────────
function ConfigPanel({
  selectedType, dateFrom, dateTo, zone, estab,
  setDateFrom, setDateTo, setZone, setEstab,
  generating, reportData, handleGenerate,
  historial, onHistoryClick, error,
}) {
  const selectedReport = reportTypes.find(r => r.id === selectedType)

  return (
    <div className="space-y-4">
      <div style={CARD}>
        <p className="text-sm font-semibold mb-4" style={{ color: '#1A1F2B' }}>Configuración de salida</p>

        <div className="space-y-2 py-3" style={{ borderTop: '1px solid #F0F0F0', borderBottom: '1px solid #F0F0F0' }}>
          {[
            ['Tipo',    selectedReport?.titulo],
            ['Período', `${dateFrom} → ${dateTo}`],
            ['Zona',    zone || 'Todas'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-xs" style={{ color: '#54606E' }}>{k}</span>
              <span className="text-xs font-semibold text-right truncate" style={{ color: '#1A1F2B', maxWidth: 130 }}>{v}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-3 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(229,57,53,0.07)', color: '#C62828' }}>
            ⚠ {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full mt-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={generating
            ? { background: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }
            : { background: 'linear-gradient(135deg, #0D47A1, #1976D2)', color: '#fff', boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.20), 0 6px 20px rgba(13,71,161,0.30)' }
          }
        >
          {generating
            ? <><div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin" /> Generando...</>
            : <><FileText className="w-4 h-4" /> Generar informe</>
          }
        </button>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'rgba(13,71,161,0.05)', border: '1px solid rgba(13,71,161,0.15)' }}>
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#1565C0' }} />
          <p className="text-[11px]" style={{ color: '#1565C0' }}>
            Los informes incluyen análisis de IA con Gemini y datos validados según estándares SIVIGILA / OMS.
          </p>
        </div>
      </div>

      {historial.length > 0 && (
        <div style={CARD}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#1A1F2B' }}>Informes recientes</p>
          <div className="space-y-1.5">
            {historial.slice(0, 8).map(h => (
              <div
                key={h.id}
                onClick={() => onHistoryClick(h.id)}
                className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors hover:bg-black/[0.03]"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(13,71,161,0.08)' }}>
                  <FileText className="w-3.5 h-3.5" style={{ color: '#1565C0' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate" style={{ color: '#1A1F2B' }}>{h.titulo}</p>
                  <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{h.generado?.slice(0, 16).replace('T', ' ')}</p>
                </div>
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={h.fuente_ia === 'ia'
                    ? { background: 'rgba(76,175,80,0.12)', color: '#2E7D32' }
                    : { background: 'rgba(0,0,0,0.05)', color: '#9CA3AF' }
                  }
                >
                  {h.fuente_ia === 'ia' ? 'IA' : 'Est.'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportesANL() {
  const [selectedType, setSelectedType] = useState('nutricional')
  const [dateFrom,  setDateFrom]  = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6)
    return d.toISOString().slice(0, 10)
  })
  const [dateTo,    setDateTo]    = useState(() => new Date().toISOString().slice(0, 10))
  const [zone,      setZone]      = useState('')
  const [estab,     setEstab]     = useState('')
  const [generating, setGenerating] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [historial,  setHistorial]  = useState([])
  const [error,      setError]      = useState(null)

  const selectedReport = reportTypes.find(r => r.id === selectedType)

  useEffect(() => {
    api.get('/reportes/historial')
      .then(({ data }) => setHistorial(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const { data } = await api.post('/reportes/generar', {
        tipo:            selectedType,
        fecha_desde:     dateFrom || null,
        fecha_hasta:     dateTo   || null,
        zona:            zone     || null,
        establecimiento: estab    || null,
      })
      setReportData(data)
      api.get('/reportes/historial')
        .then(({ data: h }) => setHistorial(Array.isArray(h) ? h : []))
        .catch(() => {})
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Error al generar el informe')
    } finally {
      setGenerating(false)
    }
  }, [selectedType, dateFrom, dateTo, zone, estab])

  const handleHistoryClick = useCallback(async (histId) => {
    try {
      const { data } = await api.get(`/reportes/${histId}`)
      setReportData(data)
      if (data.tipo) setSelectedType(data.tipo)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    }
  }, [])

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 bg-neutral-bg min-h-screen print:p-0 print:bg-white print:space-y-0">

      {/* Page header */}
      <div className="print:hidden">
        <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Generación de Informes Clínicos</h1>
        <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>
          Informes epidemiológicos y nutricionales con análisis de IA — exportación PDF
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start print:block">

        {/* Left area: type selector + filters OR report preview */}
        {reportData ? (
          <ReportPreview reportData={reportData} />
        ) : (
          <div className="lg:col-span-2 space-y-4">

            {/* Report type selector */}
            <div style={CARD}>
              <p className="text-sm font-semibold mb-4" style={{ color: '#1A1F2B' }}>Tipo de informe</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reportTypes.map(rt => {
                  const Icon = rt.icon
                  const isOn = selectedType === rt.id
                  return (
                    <div
                      key={rt.id}
                      onClick={() => setSelectedType(rt.id)}
                      className={`rounded-xl p-3 cursor-pointer transition-all ${!isOn ? 'hover:bg-black/[0.03]' : ''}`}
                      style={isOn ? {
                        background: rt.bg,
                        boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), inset 0 -2px 4px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.09)',
                      } : {}}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: isOn ? rt.bg : '#F0F0F0' }}>
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
                <Filter className="w-4 h-4" style={{ color: '#1565C0' }} />
                <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>Filtros del informe</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['Fecha desde', 'date', dateFrom, setDateFrom],
                  ['Fecha hasta', 'date', dateTo,   setDateTo],
                ].map(([label, type, val, setter]) => (
                  <div key={label}>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>{label}</label>
                    <input
                      type={type} value={val}
                      onChange={e => setter(e.target.value)}
                      className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                      style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Zona geográfica</label>
                  <input
                    type="text" value={zone} onChange={e => setZone(e.target.value)}
                    placeholder="Ej: Bogotá (opcional)"
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                    style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Establecimiento</label>
                  <input
                    type="text" value={estab} onChange={e => setEstab(e.target.value)}
                    placeholder="Ej: C.S. Norte (opcional)"
                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                    style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                  />
                </div>
              </div>
            </div>

            {/* Empty state */}
            <div className="rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center"
              style={{ border: '2px dashed #BBDEFB', background: 'rgba(227,242,253,0.3)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: selectedReport?.bg || 'rgba(13,71,161,0.08)' }}>
                {selectedReport && <selectedReport.icon className="w-7 h-7" style={{ color: selectedReport.color }} />}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#1A1F2B' }}>
                  {selectedReport?.tituloCompleto}
                </p>
                <p className="text-xs mt-1.5" style={{ color: '#54606E' }}>
                  Configura los filtros y presiona <strong>Generar informe</strong> para ver el documento con análisis de IA.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Right panel — always visible on screen, hidden in print */}
        <div className="print:hidden">
          <ConfigPanel
            selectedType={selectedType}
            dateFrom={dateFrom} dateTo={dateTo} zone={zone} estab={estab}
            setDateFrom={setDateFrom} setDateTo={setDateTo}
            setZone={setZone} setEstab={setEstab}
            generating={generating} reportData={reportData}
            handleGenerate={handleGenerate}
            historial={historial} onHistoryClick={handleHistoryClick}
            error={error}
          />
        </div>
      </div>

      {/* Back to config */}
      {reportData && (
        <div className="print:hidden">
          <button
            onClick={() => setReportData(null)}
            className="text-sm font-medium px-4 py-2 rounded-xl transition-all hover:bg-black/[0.04]"
            style={{ color: '#54606E', border: '1px solid #E0E6ED' }}
          >
            ← Nuevo informe
          </button>
        </div>
      )}
    </div>
  )
}
