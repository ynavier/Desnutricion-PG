import { useState, useEffect, useCallback, useRef } from 'react'
import {
  BarChart, Bar, ComposedChart, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell, Area, Line,
} from 'recharts'
import {
  Users, AlertTriangle, Activity, Heart, TrendingUp,
  RefreshCw, ChevronDown, X, Filter, Loader2,
  ChevronLeft, ChevronRight, BarChart2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'

const REFRESH_MS = 120_000

const C = {
  severo:   '#B71C1C',
  moderado: '#E53935',
  leve:     '#FB8C00',
  riesgo:   '#FBC02D',
  adecuado: '#6FCF97',
}

function round1(n) { return Math.round((n ?? 0) * 10) / 10 }

// ── Banner de estado epidemiológico ───────────────────────────────────────────
// Umbrales según OMS/OPS y MSPS 2016 (Protocolo Desnutrición Aguda Colombia)
const ESTADO_CONFIG = {
  critica: {
    label:  'SITUACIÓN CRÍTICA',
    bg:     '#FEF2F2',
    border: '#FECACA',
    dot:    '#EF4444',
    text:   '#B91C1C',
    sub:    '#DC2626',
    icon:   '🔴',
  },
  alta: {
    label:  'ALERTA ALTA',
    bg:     '#FFF7ED',
    border: '#FED7AA',
    dot:    '#F97316',
    text:   '#C2410C',
    sub:    '#EA580C',
    icon:   '🟠',
  },
  media: {
    label:  'ALERTA MEDIA',
    bg:     '#FFFBEB',
    border: '#FDE68A',
    dot:    '#F59E0B',
    text:   '#B45309',
    sub:    '#D97706',
    icon:   '🟡',
  },
  favorable: {
    label:  'SITUACIÓN FAVORABLE',
    bg:     '#F0FDF4',
    border: '#BBF7D0',
    dot:    '#22C55E',
    text:   '#15803D',
    sub:    '#16A34A',
    icon:   '🟢',
  },
}

function calcularEstado(stats, detalle) {
  if (!stats) return null
  const gam = stats.tasa_desnutricion ?? 0   // GAM = moderada + severa
  const severos = stats.distribucion_estado?.find(e => e.estado === 'Desnut. severa')
  const total   = stats.total || 1
  const sam     = severos ? round1(severos.cantidad / total * 100) : 0
  const sinSeg  = detalle?.crec_dllo?.tasa_sin ?? 0
  const hosp    = detalle?.tasa_hospitalizacion ?? 0

  // OMS: SAM ≥ 5% → crítica | GAM ≥ 15% → crítica
  if (sam >= 5 || gam >= 15)  return 'critica'
  // MSPS 2016: SAM ≥ 2% → alta | GAM ≥ 10% → alta
  if (sam >= 2 || gam >= 10)  return 'alta'
  // OPS región Caribe (agravantes): GAM ≥ 5% → media
  if (gam >= 5 || sinSeg >= 40 || hosp >= 10) return 'media'
  return 'favorable'
}

function BannerEstado({ stats, detalle, zona }) {
  const estado = calcularEstado(stats, detalle)
  if (!estado || !stats) return null
  const cfg = ESTADO_CONFIG[estado]
  const gam = stats.tasa_desnutricion ?? 0
  const severos = stats.distribucion_estado?.find(e => e.estado === 'Desnut. severa')
  const sam = severos ? round1((severos.cantidad / (stats.total || 1)) * 100) : 0
  const hosp = detalle?.tasa_hospitalizacion ?? 0
  const sinSeg = detalle?.crec_dllo?.tasa_sin ?? 0

  const UMBRAL_REF = {
    critica:   'GAM ≥ 15% o SAM ≥ 5% — Emergencia nutricional (OMS/MSPS 2016)',
    alta:      'GAM ≥ 10% o SAM ≥ 2% — Activar respuesta urgente territorial (MSPS 2016)',
    media:     'GAM ≥ 5% — Umbral de alerta región Caribe con agravantes (OPS)',
    favorable: 'GAM < 5% — Dentro de parámetros aceptables (OMS/OPS)',
  }

  const ACCIONES = {
    critica:   ['Declarar emergencia nutricional territorial', 'Activar protocolo MSPS de atención SAM', 'Notificación inmediata al nivel nacional'],
    alta:      ['Activar respuesta urgente en municipios críticos', 'Reforzar unidades de recuperación nutricional', 'Revisar cobertura de programas ICBF/MANÍ'],
    media:     ['Incrementar frecuencia de controles preventivos', 'Fortalecer red comunitaria de vigilancia', 'Revisar cobertura de seguimiento C&D'],
    favorable: ['Mantener y escalar intervenciones actuales', 'Documentar buenas prácticas replicables'],
  }

  return (
    <div className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: 'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.07), 0 4px 18px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.04)',
      }}>

      {/* Fila superior: badge de nivel + zona + métricas */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {/* Badge nivel — estilo clay activo */}
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
          style={{
            background: `${cfg.dot}18`,
            color: cfg.dot,
            boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), inset 0 -2px 4px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.07)',
          }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
          {cfg.label}
        </span>

        <span className="text-sm font-bold text-neutral-text">{zona}</span>

        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {[
            { label: 'GAM', value: `${gam}%` },
            { label: 'SAM', value: `${sam}%` },
            ...(hosp > 0   ? [{ label: 'Hosp.',   value: `${hosp}%`   }] : []),
            ...(sinSeg > 0 ? [{ label: 'Sin C&D', value: `${sinSeg}%` }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-sub">{label}</p>
              <p className="text-sm font-bold" style={{ color: cfg.text }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Separador */}
      <div className="border-t border-neutral-border mb-3" />

      {/* Fila inferior: referencia OMS + acciones */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-[11px] text-neutral-sub leading-relaxed">
          <span className="font-semibold" style={{ color: cfg.text }}>Referencia: </span>
          {UMBRAL_REF[estado]}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          {ACCIONES[estado].map((a, i) => (
            <span key={i} className="text-[11px] text-neutral-sub flex items-center gap-1">
              <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
              {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Generador de alertas — umbrales según OMS/OPS, MSPS Colombia e ICBF ───────
//
// Fuentes:
//   OMS/OPS: GAM ≥10% emergencia · ≥15% emergencia crítica
//            SAM ≥2% emergencia  · ≥5% emergencia crítica
//   MSPS 2016 (Protocolo Desnutrición Aguda):
//            SAM ≥2% → activar respuesta urgente territorial
//            GAM ≥10% → declarar emergencia nutricional
//   ICBF: Z-score P/T promedio < −1.5 → intervención preventiva
//   OPS — Región Caribe (con agravantes: desplazamiento, indígenas, acceso):
//            umbral GAM de emergencia baja a ≥5%
//
function generarAlertas(datos, metrica, zonaEfectiva) {
  if (!datos?.length) return []

  const hist = datos.filter(d => d.tipo === 'historico')
  const proy = datos.filter(d => d.tipo === 'proyeccion')
  if (!hist.length || !proy.length) return []

  const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
  const med = arr => {
    if (!arr.length) return 0
    const s = [...arr].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2
  }

  // Baseline: mediana de TODA la serie histórica (referencia estable)
  const todosHist   = hist.map(d => d.valor)
  const prom_hist   = med(todosHist)

  // Proyección: mediana de todos los meses proyectados
  const proyTodos   = proy.map(d => d.valor)
  const prom_proy   = med(proyTodos)
  const max_proy    = Math.max(...proyTodos)
  const ic95_lo_fin = proy.at(-1)?.limite_inf_95 ?? prom_proy

  // Incremento absoluto (casos/mes)
  const delta_abs   = prom_proy - prom_hist

  // Cambio relativo — solo si baseline ≥ 5 Y delta_abs ≥ 10
  // Evita porcentajes engañosos cuando los valores son muy bajos
  const cambio_pct = (prom_hist >= 5 && Math.abs(delta_abs) >= 10)
    ? ((delta_abs / prom_hist) * 100)
    : null

  const alertas = []

  // ── Tasa de desnutrición severa (SAM) ────────────────────────────────────
  // Fuente: OMS/OPS y MSPS 2016 — Protocolo de atención desnutrición aguda
  if (metrica === 'tasa_severa') {
    if (max_proy >= 5) {
      alertas.push({
        nivel: 'critica',
        titulo: 'Emergencia crítica — SAM ≥5%',
        mensaje: `La tasa SAM proyectada alcanza ${round1(max_proy)}%, superando el umbral de emergencia crítica de la OMS (≥5%). Se requiere activación inmediata del protocolo MSPS de atención a la desnutrición aguda severa.`,
        fuente: 'OMS/OPS · MSPS 2016',
      })
    } else if (max_proy >= 2) {
      alertas.push({
        nivel: 'alta',
        titulo: 'Emergencia nutricional — SAM ≥2%',
        mensaje: `La tasa SAM proyectada (${round1(max_proy)}%) supera el umbral de emergencia del MSPS (≥2%). Activar respuesta urgente territorial y reforzar unidades de recuperación nutricional.`,
        fuente: 'MSPS 2016',
      })
    } else if (max_proy >= 1) {
      alertas.push({
        nivel: 'media',
        titulo: 'Alerta SAM — zona de riesgo',
        mensaje: `La tasa SAM proyectada (${round1(max_proy)}%) supera el 1%. Monitoreo intensivo y activación de redes comunitarias de vigilancia nutricional.`,
        fuente: 'OMS/OPS',
      })
    }
    // Para SAM tampoco se usa cambio_pct relativo.
    // Los umbrales OMS absolutos (≥1%, ≥2%, ≥5%) ya son suficientes.
  }

  // ── Tasa de desnutrición aguda global GAM (moderada + severa aprox.) ──────
  // Fuente: OMS/OPS — con agravantes región Caribe (indígenas, desplazados)
  if (metrica === 'tasa_moderada') {
    // En Colombia Caribe (Cesar, Guajira) aplican agravantes → umbral baja a ≥5%
    if (max_proy >= 15) {
      alertas.push({
        nivel: 'critica',
        titulo: 'Emergencia crítica — GAM ≥15%',
        mensaje: `La tasa de desnutrición moderada proyectada (${round1(max_proy)}%) supera el umbral crítico de la OMS (≥15%). Declarar emergencia nutricional territorial y activar respuesta humanitaria.`,
        fuente: 'OMS/OPS — Clasificación IPC',
      })
    } else if (max_proy >= 10) {
      alertas.push({
        nivel: 'alta',
        titulo: 'Emergencia nutricional — GAM ≥10%',
        mensaje: `Tasa de desnutrición moderada proyectada en ${round1(max_proy)}%, superando el umbral de emergencia del MSPS (≥10%). Se recomienda notificación al nivel departamental y nacional.`,
        fuente: 'OMS/OPS · MSPS 2016',
      })
    } else if (max_proy >= 5) {
      alertas.push({
        nivel: 'media',
        titulo: 'Alerta GAM — umbral región Caribe',
        mensaje: `Tasa proyectada de ${round1(max_proy)}%. En la región Caribe, con presencia de poblaciones indígenas y desplazadas, la OPS establece el umbral de alerta en ≥5%.`,
        fuente: 'OPS — Criterios agravantes región Caribe',
      })
    }
    // Para tasas no se usa cambio_pct relativo (engañoso).
    // Los umbrales absolutos OMS (≥5%, ≥10%, ≥15%) ya cubren la severidad.
  }

  // ── Z-score promedio poblacional ──────────────────────────────────────────
  // Fuente: OMS (referencia 2006) e ICBF — Lineamientos técnicos
  if (metrica === 'zscore') {
    if (prom_proy <= -3) {
      alertas.push({
        nivel: 'critica',
        titulo: 'Z-score poblacional en zona de desnutrición severa',
        mensaje: `El z-score P/T promedio proyectado (${round1(prom_proy)}) está en zona de desnutrición severa (<−3). Indica afectación nutricional aguda grave a nivel poblacional. Activar protocolo AIEPI y referir a unidades de recuperación.`,
        fuente: 'OMS 2006 · ICBF',
      })
    } else if (prom_proy <= -2) {
      alertas.push({
        nivel: 'alta',
        titulo: 'Z-score poblacional en desnutrición moderada',
        mensaje: `El z-score promedio proyectado (${round1(prom_proy)}) está por debajo de −2 (desnutrición moderada). Indica deterioro nutricional colectivo. Intervención del programa de recuperación nutricional ambulatoria (PRANI/MANÍ).`,
        fuente: 'OMS 2006 · MSPS',
      })
    } else if (prom_proy <= -1.5) {
      alertas.push({
        nivel: 'media',
        titulo: 'Z-score en zona de alerta preventiva — ICBF',
        mensaje: `El z-score proyectado (${round1(prom_proy)}) está por debajo de −1.5, umbral de intervención preventiva del ICBF. Fortalecer programas de vigilancia nutricional comunitaria.`,
        fuente: 'ICBF — Lineamientos técnicos',
      })
    }
    if (cambio_pct !== null && cambio_pct < -10) {
      alertas.push({
        nivel: 'alta',
        titulo: 'Deterioro progresivo del estado nutricional',
        mensaje: `El z-score poblacional muestra una tendencia descendente del ${Math.round(Math.abs(cambio_pct))}%. El empeoramiento sostenido es indicador de inseguridad alimentaria estructural.`,
        fuente: 'OMS/OPS',
      })
    }
  }

  // ── Casos totales — alertas basadas en magnitud proyectada y tendencia ───
  // Fuente: OMS/OPS Vigilancia epidemiológica nutricional
  // Lógica: importa cuántos casos se proyectan y si la tendencia es robusta,
  // no el porcentaje de cambio desde el baseline (que puede ser engañoso).
  if (metrica === 'casos') {
    const media_proy_mensual = Math.round(prom_proy)
    // Tendencia: IC 95% inferior promedio — si sigue por encima del hist, la alza es robusta
    const ic95_lo_avg       = avg(proy.map(d => d.limite_inf_95 ?? d.valor))
    const tendencia_robusta  = ic95_lo_avg > prom_hist
    const tendencia_baja     = avg(proy.map(d => d.limite_sup_95 ?? d.valor)) < prom_hist

    if (media_proy_mensual >= 50 && tendencia_robusta) {
      alertas.push({
        nivel: 'critica',
        titulo: 'Carga de casos crítica proyectada',
        mensaje: `Se proyectan ~${media_proy_mensual} casos/mes en ${zonaEfectiva} hasta diciembre 2027. La tendencia es estadísticamente robusta — el escenario optimista (IC 95%) también confirma la carga elevada.`,
        fuente: 'OMS/OPS — Vigilancia epidemiológica',
      })
    } else if (media_proy_mensual >= 50) {
      alertas.push({
        nivel: 'alta',
        titulo: 'Alta carga de casos proyectada',
        mensaje: `Se proyectan ~${media_proy_mensual} casos/mes en ${zonaEfectiva} hasta diciembre 2027. Reforzar la capacidad de respuesta y los programas de vigilancia nutricional.`,
        fuente: 'OMS/OPS',
      })
    } else if (media_proy_mensual >= 20) {
      alertas.push({
        nivel: 'media',
        titulo: 'Carga de casos moderada — monitoreo activo',
        mensaje: `Se proyectan ~${media_proy_mensual} casos/mes en ${zonaEfectiva}. Mantener vigilancia activa y controles periódicos de crecimiento y desarrollo.`,
        fuente: 'OMS/OPS · MSPS 2016',
      })
    } else if (media_proy_mensual >= 5 && tendencia_robusta && delta_abs > 0) {
      alertas.push({
        nivel: 'media',
        titulo: 'Tendencia al alza estadísticamente confirmada',
        mensaje: `La proyección en ${zonaEfectiva} muestra ~${media_proy_mensual} casos/mes con tendencia ascendente confirmada por el IC 95%. Activar vigilancia reforzada.`,
        fuente: 'OMS/OPS',
      })
    }

    if (tendencia_baja && media_proy_mensual < prom_hist * 0.7) {
      alertas.push({
        nivel: 'positiva',
        titulo: 'Tendencia de reducción sostenida',
        mensaje: `La proyección indica ~${media_proy_mensual} casos/mes en ${zonaEfectiva}, por debajo del promedio histórico. El escenario optimista (IC 95%) confirma la tendencia favorable. Mantener y documentar las intervenciones actuales.`,
        fuente: 'OMS/OPS',
      })
    }
  }

  return alertas
}

const ALERTA_STYLE = {
  critica:  { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', dot: '#EF4444', label: 'CRÍTICA' },
  alta:     { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C', dot: '#FB923C', label: 'ALTA'    },
  media:    { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', dot: '#F59E0B', label: 'MEDIA'   },
  positiva: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D', dot: '#22C55E', label: 'FAVORABLE'},
}

// ── KPI Card con clay style ───────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, loading }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-border flex flex-col gap-2"
      style={{ boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), inset 0 -2px 4px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.07)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-sub uppercase tracking-wide">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      {loading
        ? <div className="h-7 w-24 rounded-lg animate-pulse bg-neutral-bg" />
        : <p className="text-2xl font-bold text-neutral-text leading-none">{value ?? '—'}</p>
      }
      {sub && <p className="text-[11px] text-neutral-sub leading-tight">{sub}</p>}
    </div>
  )
}

function SectionCard({ title, sub, children }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-border p-6"
      style={{ boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), 0 4px 14px rgba(0,0,0,0.06)' }}>
      <div className="mb-4">
        <h2 className="text-sm font-bold text-neutral-text">{title}</h2>
        {sub && <p className="text-xs text-neutral-sub mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-neutral-border rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-neutral-text mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-neutral-sub capitalize">{p.name}:</span>
          <span className="font-semibold">{typeof p.value === 'number' ? (p.value % 1 !== 0 ? p.value.toFixed(1) : p.value) : p.value}</span>
          {p.payload?.proyeccion && (
            <span className="text-[9px] px-1 py-0.5 rounded-full"
              style={{ background: 'rgba(79,180,210,0.12)', color: '#2A7A9A' }}>proy.</span>
          )}
        </div>
      ))}
    </div>
  )
}

function FilterSelect({ options, value, onChange, placeholder }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-7 py-2 text-xs bg-white border border-neutral-border rounded-xl text-neutral-text cursor-pointer focus:outline-none"
        style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' }}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-sub pointer-events-none" />
    </div>
  )
}


// ── Componente principal ──────────────────────────────────────────────────────
export default function HomeANL() {
  const [stats,       setStats]       = useState(null)
  const [detalle,     setDetalle]     = useState(null)
  const [proyecc,     setProyecc]     = useState(null)
  const [loadingProj, setLoadingProj] = useState(false)
  const [geoOpts,     setGeoOpts]     = useState({ departamentos: [], municipios: [] })
  const [dpto,        setDpto]        = useState('CESAR')
  const [municipio,   setMunicipio]   = useState('VALLEDUPAR')
  const [metricaProj, setMetricaProj] = useState('casos')
  const [vistaProj,   setVistaProj]   = useState('mensual')
  const [loading,     setLoading]     = useState(true)
  const [lastUpd,     setLastUpd]     = useState(null)
  const [vistaActual,  setVistaActual]  = useState(0)  // 0 = proyecciones, 1 = distribuciones
  const timerRef = useRef(null)

  const fetchProyecc = useCallback(async () => {
    setLoadingProj(true)
    try {
      const params = { metrica: metricaProj }
      if (dpto)      params.dpto      = dpto
      if (municipio) params.municipio = municipio
      const { data } = await api.get('/proyecciones', { params })
      setProyecc(data)
    } catch (e) {
      console.error('[PROY]', e)
      setProyecc(null)
    } finally { setLoadingProj(false) }
  }, [dpto, municipio, metricaProj])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (dpto)      params.dpto      = dpto
      if (municipio) params.municipio = municipio
      const [r1, r2] = await Promise.all([
        api.get('/estadisticas', { params }),
        api.get('/estadisticas/detalle', { params }),
      ])
      setStats(r1.data)
      setDetalle(r2.data)
      setLastUpd(new Date())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [dpto, municipio])

  useEffect(() => {
    fetchAll()
    const t = setInterval(fetchAll, REFRESH_MS)
    return () => clearInterval(t)
  }, [fetchAll])

  useEffect(() => {
    fetchProyecc()
    const t = setInterval(fetchProyecc, REFRESH_MS)
    return () => clearInterval(t)
  }, [fetchProyecc])

  useEffect(() => {
    const params = dpto ? { dpto } : {}
    api.get('/estadisticas/geo', { params })
      .then(r => setGeoOpts(r.data))
      .catch(() => {})
  }, [dpto])

  const hayFiltros = dpto || municipio
  const zona = [dpto, municipio].filter(Boolean).join(' › ') || 'Colombia'

  // ── Agregación anual ────────────────────────────────────────────────────────
  function agregarAnual(datos) {
    const porAnio = {}
    for (const d of datos) {
      const anio = d.anio_mes?.slice(0, 4)
      if (!anio) continue
      if (!porAnio[anio]) porAnio[anio] = { items: [], tipo: d.tipo }
      porAnio[anio].items.push(d)
      if (d.tipo === 'proyeccion') porAnio[anio].tipo = 'proyeccion'
    }
    const esPromedio = metricaProj !== 'casos'
    function avg(items, campo) {
      const v = items.filter(i => i[campo] != null)
      return v.length ? round1(v.reduce((a, i) => a + i[campo], 0) / v.length) : null
    }
    return Object.entries(porAnio).sort().map(([anio, { items, tipo }]) => {
      const vals  = items.map(i => i.valor)
      const valor = esPromedio
        ? round1(vals.reduce((a, b) => a + b, 0) / vals.length)
        : Math.round(vals.reduce((a, b) => a + b, 0))
      return {
        label: anio, anio_mes: anio, valor, tipo,
        limite_inf_80: avg(items, 'limite_inf_80'),
        limite_sup_80: avg(items, 'limite_sup_80'),
        limite_inf_95: avg(items, 'limite_inf_95'),
        limite_sup_95: avg(items, 'limite_sup_95'),
      }
    })
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-text">Dashboard Epidemiológico</h1>
          <p className="text-xs text-neutral-sub mt-0.5">
            Vigilancia nutricional infantil · {zona}
            {lastUpd && ` · ${lastUpd.toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-neutral-sub" />
          <FilterSelect options={geoOpts.departamentos} value={dpto}
            onChange={v => { setDpto(v); setMunicipio('') }} placeholder="Departamento" />
          {dpto && (
            <FilterSelect options={geoOpts.municipios} value={municipio}
              onChange={setMunicipio} placeholder="Municipio" />
          )}
          {hayFiltros && (
            <button onClick={() => { setDpto(''); setMunicipio('') }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-neutral-sub hover:bg-neutral-bg">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border border-neutral-border bg-white hover:bg-neutral-bg disabled:opacity-50"
            style={{ boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.07)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Chip filtro */}
      {hayFiltros && (
        <p className="text-xs text-neutral-sub">Zona: <strong className="text-neutral-text">{zona}</strong></p>
      )}

      {/* ── Banner de estado — se actualiza con los filtros ─────── */}
      <BannerEstado stats={stats} detalle={detalle} zona={zona} />

      {/* ── KPIs ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total casos" icon={Users} color="#4FB4D2" loading={loading}
          value={stats?.total?.toLocaleString()}
          sub={stats ? `BD: ${stats.total_bd?.toLocaleString()} · Hist: ${stats.total_historico?.toLocaleString()}` : undefined} />
        <KpiCard label="Desnutrición severa" icon={AlertTriangle} color="#B71C1C" loading={loading}
          value={stats?.distribucion_estado?.find(e => e.estado === 'Desnut. severa')?.cantidad?.toLocaleString()}
          sub={stats?.total ? `${((stats.distribucion_estado?.find(e => e.estado === 'Desnut. severa')?.cantidad ?? 0) / stats.total * 100).toFixed(1)}% del total` : undefined} />
        <KpiCard label="Desnutrición moderada" icon={Activity} color="#E53935" loading={loading}
          value={stats?.distribucion_estado?.find(e => e.estado === 'Desnut. moderada')?.cantidad?.toLocaleString()}
          sub={stats?.total ? `${((stats.distribucion_estado?.find(e => e.estado === 'Desnut. moderada')?.cantidad ?? 0) / stats.total * 100).toFixed(1)}% del total` : undefined} />
        <KpiCard label="Tasa hospitalización" icon={Heart} color="#9B59B6" loading={loading}
          value={detalle ? `${detalle.tasa_hospitalizacion}%` : undefined}
          sub={detalle?.total ? `De ${detalle.total?.toLocaleString()} pacientes` : undefined} />
      </div>

      {/* ── Navegación de vistas ───────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[
            { i: 0, label: 'Proyecciones', icon: TrendingUp },
            { i: 1, label: 'Distribuciones', icon: BarChart2 },
          ].map(({ i, label, icon: Icon }) => (
            <button key={i} onClick={() => setVistaActual(i)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={vistaActual === i
                ? { background: 'white', color: '#2A7A9A', boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), 0 4px 14px rgba(0,0,0,0.08)', border: '1px solid rgba(79,180,210,0.2)' }
                : { color: '#94A3B8', background: 'transparent' }
              }>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setVistaActual(v => Math.max(0, v - 1))} disabled={vistaActual === 0}
            className="w-8 h-8 rounded-xl flex items-center justify-center border border-neutral-border bg-white disabled:opacity-30 hover:bg-neutral-bg transition-all"
            style={{ boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.06)' }}>
            <ChevronLeft className="w-4 h-4 text-neutral-sub" />
          </button>
          <div className="flex gap-1.5">
            {[0, 1].map(i => (
              <button key={i} onClick={() => setVistaActual(i)}
                className="rounded-full transition-all"
                style={{ width: vistaActual === i ? 20 : 8, height: 8, background: vistaActual === i ? '#4FB4D2' : '#CBD5E1' }} />
            ))}
          </div>
          <button onClick={() => setVistaActual(v => Math.min(1, v + 1))} disabled={vistaActual === 1}
            className="w-8 h-8 rounded-xl flex items-center justify-center border border-neutral-border bg-white disabled:opacity-30 hover:bg-neutral-bg transition-all"
            style={{ boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.06)' }}>
            <ChevronRight className="w-4 h-4 text-neutral-sub" />
          </button>
        </div>
      </div>

      {/* ── Contenido animado entre vistas ─────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div key={vistaActual}
          initial={{ opacity: 0, x: vistaActual === 0 ? -24 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: vistaActual === 0 ? 24 : -24 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="space-y-5">

      {vistaActual === 0 && <>
      {/* ── Proyecciones SARIMA ─────────────────────────────────── */}
      <SectionCard
        title="Proyecciones hasta diciembre 2027"
        sub="SARIMA(1,1,1)(1,1,0,12) · Intervalos de confianza IC 80% y IC 95% · Hasta diciembre 2027"
      >
        {/* Controles */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(0,0,0,0.04)' }}>
            {[{v:'casos',l:'Casos'},{v:'tasa_severa',l:'Tasa severa'},{v:'tasa_moderada',l:'Tasa moderada'},{v:'zscore',l:'Z-score'}].map(({v,l}) => (
              <button key={v} onClick={() => setMetricaProj(v)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={metricaProj === v
                  ? { background: 'white', color: '#2A7A9A', boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.08)' }
                  : { color: '#94A3B8' }}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(0,0,0,0.04)' }}>
            {[{v:'mensual',l:'Mensual'},{v:'anual',l:'Anual'}].map(({v,l}) => (
              <button key={v} onClick={() => setVistaProj(v)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={vistaProj === v
                  ? { background: 'white', color: '#2A7A9A', boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.9), 0 2px 8px rgba(0,0,0,0.08)' }
                  : { color: '#94A3B8' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {loadingProj ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-neutral-sub">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#4FB4D2' }} />
            <p className="text-xs">Ajustando modelo SARIMA…</p>
          </div>
        ) : proyecc?.fuente === 'nacional_fallback' || (proyecc?.fuente === 'nacional' && (dpto || municipio)) ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-center px-8">
            <TrendingUp className="w-8 h-8" style={{ color: '#CBD5E1' }} />
            <p className="text-sm font-semibold text-neutral-text">
              Datos insuficientes para {dpto || 'este filtro'}
            </p>
            <p className="text-xs text-neutral-sub leading-relaxed">
              Se necesitan al menos <strong>12 meses</strong> de registros para generar una proyección confiable.
              Este departamento tiene muy pocos casos en los datasets históricos.
            </p>
            <p className="text-xs" style={{ color: '#4FB4D2' }}>
              Selecciona <strong>CESAR</strong>, <strong>GUAJIRA</strong> o <strong>MAGDALENA</strong> para ver proyecciones con datos suficientes.
            </p>
          </div>
        ) : proyecc?.datos?.length > 0 ? (() => {
          // Banner de nivel efectivo
          const nivelConfig = {
            municipio:            { label: `Datos de ${proyecc.zona_efectiva}`,                         color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
            departamento:         { label: `Datos de ${proyecc.zona_efectiva}`,                         color: '#2A7A9A', bg: 'rgba(79,180,210,0.08)', border: 'rgba(79,180,210,0.25)' },
            departamento_fallback:{ label: `Sin datos suficientes para ${municipio} — usando ${proyecc.zona_efectiva}`, color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
            nacional:             { label: 'Datos nacionales',                                          color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' },
          }
          const nivel = nivelConfig[proyecc.fuente] ?? nivelConfig.nacional
          const datosBase  = vistaProj === 'anual' ? agregarAnual(proyecc.datos) : proyecc.datos
          const hist       = datosBase.filter(d => d.tipo === 'historico')
          const divisor    = hist.at(-1)?.label
          const unidad     = metricaProj === 'casos' ? 'Casos' : metricaProj === 'zscore' ? 'Z-score' : '%'
          // Separar histórico y pronóstico en datakeys distintos.
          // El último punto histórico aparece en AMBAS series para que las líneas conecten sin salto.
          const lastHistIdx = datosBase.reduce((li, d, i) => d.tipo === 'historico' ? i : li, -1)
          const valFn = (v) => metricaProj === 'casos' ? Math.round(v ?? 0) : +round1(v ?? 0)
          const chartData = datosBase.map((d, i) => ({
            label:      d.label,
            tipo:       d.tipo,
            // historico: valores históricos + el último punto también en pronóstico = conexión limpia
            historico:  d.tipo === 'historico' ? valFn(d.valor) : null,
            pronostico: (d.tipo === 'proyeccion' || i === lastHistIdx) ? valFn(d.valor) : null,
            ic80_lo:    d.limite_inf_80 != null ? +round1(d.limite_inf_80) : null,
            ic80_hi:    d.limite_sup_80 != null ? +round1(d.limite_sup_80) : null,
            ic95_lo:    d.limite_inf_95 != null ? +round1(d.limite_inf_95) : null,
            ic95_hi:    d.limite_sup_95 != null ? +round1(d.limite_sup_95) : null,
          }))
          return (
            <div>
              {/* Banner de nivel — siempre visible */}
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: nivel.bg, border: `1px solid ${nivel.border}`, color: nivel.color }}>
                <span>📍</span>
                <span>{nivel.label}</span>
                {proyecc.n_train && <span className="font-normal opacity-70">· {proyecc.n_train} meses de entrenamiento</span>}
              </div>

              {/* Alertas de proyección */}
              {(() => {
                const alertas = generarAlertas(proyecc.datos, metricaProj, proyecc.zona_efectiva || zona)
                if (!alertas.length) return null
                return (
                  <div className="flex flex-col gap-2 mb-4">
                    {alertas.map((a, i) => {
                      const s = ALERTA_STYLE[a.nivel] ?? ALERTA_STYLE.media
                      return (
                        <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl"
                          style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ background: s.dot }} />
                            <span className="text-[10px] font-bold tracking-wide"
                              style={{ color: s.text }}>{s.label}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold" style={{ color: s.text }}>{a.titulo}</p>
                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: s.text, opacity: 0.85 }}>
                              {a.mensaje}
                            </p>
                            {a.fuente && (
                              <p className="text-[10px] mt-1 font-semibold opacity-60" style={{ color: s.text }}>
                                Fuente: {a.fuente}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }}
                    label={{ value: unidad, angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    if (!d) return null
                    const rawVal = d.historico ?? d.pronostico ?? 0
                    const val = metricaProj === 'casos'
                      ? Math.round(rawVal)
                      : round1(rawVal)
                    return (
                      <div className="bg-white border border-neutral-border rounded-xl shadow px-4 py-3 text-xs">
                        <p className="font-semibold text-neutral-text mb-2">{label}</p>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ background: d?.tipo === 'proyeccion' ? '#7E57C2' : '#2563EB' }} />
                          <span className="text-neutral-sub">{unidad}:</span>
                          <span className="font-semibold">{val}</span>
                          {d?.tipo === 'proyeccion' && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                              style={{ background: '#EDE7F6', color: '#7E57C2' }}>pronóstico</span>
                          )}
                        </div>
                        {d?.ic80_lo != null && (
                          <>
                            <p className="text-neutral-sub mt-1">IC 80%: [{round1(d.ic80_lo)} — {round1(d.ic80_hi)}]</p>
                            <p className="text-neutral-sub">IC 95%: [{round1(d.ic95_lo)} — {round1(d.ic95_hi)}]</p>
                          </>
                        )}
                      </div>
                    )
                  }} />
                  {divisor && (
                    <ReferenceLine x={divisor} stroke="#CBD5E1" strokeDasharray="4 4"
                      label={{ value: 'Hoy', fontSize: 9, fill: '#94A3B8', position: 'insideTopRight' }} />
                  )}
                  <Area type="monotone" dataKey="ic95_hi" stroke="none" fill="#EDE7F6" legendType="none" name="" />
                  <Area type="monotone" dataKey="ic95_lo" stroke="none" fill="white"   legendType="none" name="" />
                  <Area type="monotone" dataKey="ic80_hi" stroke="none" fill="#B39DDB" legendType="none" name="" />
                  <Area type="monotone" dataKey="ic80_lo" stroke="none" fill="white"   legendType="none" name="" />
                  <Line type="monotone" dataKey="historico"  name="Histórico"  stroke="#2563EB" strokeWidth={2.5} dot={false} connectNulls={false} />
                  <Line type="monotone" dataKey="pronostico" name="Pronóstico" stroke="#7E57C2" strokeWidth={2.5} strokeDasharray="6 3" connectNulls={false}
                    dot={(props) => {
                      const { cx, cy, payload } = props
                      // Solo el punto exacto de unión: tiene ambos valores y cy es válido
                      if (payload.historico == null || payload.pronostico == null) return null
                      if (!isFinite(cy)) return null
                      return <circle key={`dot-union-${cx}`} cx={cx} cy={cy} r={4} fill="#7E57C2" stroke="white" strokeWidth={2} />
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              {proyecc?.baja_densidad && (
                <p className="text-xs text-center mt-3" style={{ color: '#B45309' }}>
                  ⚠ Pocos casos históricos ({proyecc.total_casos}) — los intervalos de confianza son amplios. Interpreta con cautela.
                </p>
              )}
              <div className="flex items-center gap-5 mt-3 justify-center text-[10px] text-neutral-sub flex-wrap">
                <div className="flex items-center gap-1.5"><div className="w-6 h-0.5 rounded" style={{ background: '#2563EB' }} /><span>Histórico</span></div>
                <div className="flex items-center gap-1.5"><div className="w-6 h-0" style={{ borderTop: '2px dashed #7E57C2', width: 24 }} /><span>Pronóstico</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded" style={{ background: '#B39DDB' }} /><span>IC 80%</span></div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-3 rounded" style={{ background: '#EDE7F6' }} /><span>IC 95%</span></div>
              </div>
            </div>
          )
        })() : (
          <div className="h-64 flex flex-col items-center justify-center gap-2 text-neutral-sub">
            <TrendingUp className="w-8 h-8" style={{ color: '#CBD5E1' }} />
            <p className="text-sm">Sin datos suficientes para proyectar.</p>
            <p className="text-xs">Re-procesa los datasets desde el panel ADM.</p>
          </div>
        )}
      </SectionCard>

      </>}

      {vistaActual === 1 && <>
      {/* ── Estrato + Sexo ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Por estrato socioeconómico" sub="Distribución de casos por estrato">
          {detalle?.por_estrato?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={detalle.por_estrato} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="label" type="category" width={70} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="severo"   name="Severo"   stackId="a" fill={C.severo} />
                <Bar dataKey="moderado" name="Moderado" stackId="a" fill={C.moderado} />
                <Bar dataKey="adecuado" name="Adecuado" stackId="a" fill={C.adecuado} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-neutral-sub">
              {loading ? 'Cargando…' : 'Sin datos'}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Por sexo" sub="Distribución M vs F">
          {detalle?.por_sexo?.length > 0 ? (
            <div className="space-y-5 pt-2">
              {detalle.por_sexo.map(s => {
                const total  = s.total || 1
                const pctSev = round1(s.severo  / total * 100)
                const pctMod = round1(s.moderado / total * 100)
                const pctAde = round1(s.adecuado / total * 100)
                return (
                  <div key={s.sexo}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm font-semibold text-neutral-text">{s.label}</span>
                      <span className="text-xs text-neutral-sub">{s.total?.toLocaleString()} casos</span>
                    </div>
                    <div className="h-4 rounded-full overflow-hidden flex"
                      style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }}>
                      <div style={{ width: `${pctSev}%`, background: C.severo }} title={`Severo ${pctSev}%`} />
                      <div style={{ width: `${pctMod}%`, background: C.moderado }} title={`Moderado ${pctMod}%`} />
                      <div style={{ width: `${pctAde}%`, background: C.adecuado }} title={`Adecuado ${pctAde}%`} />
                      <div style={{ flex: 1, background: '#F1F5F9' }} />
                    </div>
                    <div className="flex gap-3 mt-1.5 text-[10px] text-neutral-sub">
                      <span style={{ color: C.severo }}>■ Severo {pctSev}%</span>
                      <span style={{ color: C.moderado }}>■ Moderado {pctMod}%</span>
                      <span style={{ color: C.adecuado }}>■ Adecuado {pctAde}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-neutral-sub">
              {loading ? 'Cargando…' : 'Sin datos'}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Grupo etario + Crec y desarrollo ───────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionCard title="Por grupo etario" sub="Casos severos y moderados por edad">
          {detalle?.por_grupo_etario?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={detalle.por_grupo_etario}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="grupo" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="severo"   name="Severo"   stackId="a" fill={C.severo} />
                <Bar dataKey="moderado" name="Moderado" stackId="a" fill={C.moderado} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-neutral-sub">
              {loading ? 'Cargando…' : 'Sin datos'}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Crecimiento y desarrollo" sub="Seguimiento por parte del sistema de salud">
          {detalle?.crec_dllo ? (() => {
            const { con, sin, tasa_sin } = detalle.crec_dllo
            const total = con + sin || 1
            return (
              <div className="flex flex-col gap-4 pt-1">
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="45%" height={130}>
                    <PieChart>
                      <Pie data={[{ value: con, fill: '#6FCF97' }, { value: sin, fill: '#E53935' }]}
                        cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value">
                        <Cell fill="#6FCF97" />
                        <Cell fill="#E53935" />
                      </Pie>
                      <Tooltip formatter={v => [v, 'Casos']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-3 h-3 rounded-full" style={{ background: '#6FCF97' }} />
                        <span className="text-xs text-neutral-sub">Con seguimiento</span>
                      </div>
                      <p className="text-xl font-bold" style={{ color: '#6FCF97' }}>{con?.toLocaleString()}</p>
                      <p className="text-xs text-neutral-sub">{round1(con / total * 100)}%</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-3 h-3 rounded-full" style={{ background: '#E53935' }} />
                        <span className="text-xs text-neutral-sub">Sin seguimiento</span>
                      </div>
                      <p className="text-xl font-bold" style={{ color: '#E53935' }}>{sin?.toLocaleString()}</p>
                      <p className="text-xs text-neutral-sub">{tasa_sin}%</p>
                    </div>
                  </div>
                </div>
                {tasa_sin > 30 && (
                  <p className="text-xs font-semibold" style={{ color: '#B91C1C' }}>
                    ⚠ {tasa_sin}% sin seguimiento — intervención prioritaria requerida.
                  </p>
                )}
              </div>
            )
          })() : (
            <div className="h-48 flex items-center justify-center text-sm text-neutral-sub">
              {loading ? 'Cargando…' : 'Sin datos'}
            </div>
          )}
        </SectionCard>
      </div>

      </>}

        </motion.div>
      </AnimatePresence>

      <p className="text-center text-[10px] text-neutral-sub pb-2">
        Actualización automática cada 2 min · BD + Datasets SIVIGILA · NutriVigilancia
      </p>

    </div>
  )
}
