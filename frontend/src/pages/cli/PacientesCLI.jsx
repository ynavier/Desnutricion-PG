import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, ChevronRight, X, CheckCircle, User, MapPin, Scale } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'

// ─── Config ───────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.06 } }),
}

const statusConfig = {
  adequate: { label: 'Adecuado',    color: '#52C41A', bg: 'rgba(82,196,26,0.10)'  },
  risk:     { label: 'Riesgo',      color: '#B8860B', bg: 'rgba(255,193,7,0.18)'  },
  mild:     { label: 'D. Leve',     color: '#FB8C00', bg: 'rgba(251,140,0,0.10)'  },
  moderate: { label: 'D. Moderada', color: '#E53935', bg: 'rgba(229,57,53,0.10)'  },
  severe:   { label: 'D. Severa',   color: '#B71C1C', bg: 'rgba(183,28,28,0.10)'  },
}

const filterLabels = {
  todos:    'Todos',
  adequate: 'Adecuado',
  risk:     'Riesgo',
  mild:     'D. Leve',
  moderate: 'D. Moderada',
  severe:   'D. Severa',
}

const departamentos = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D.C.',
  'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca',
  'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare',
  'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño',
  'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
  'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
  'Valle del Cauca', 'Vaupés', 'Vichada',
]

const municipiosPorDepartamento = {
  'Amazonas':                ['Leticia', 'Puerto Nariño', 'El Encanto', 'La Chorrera', 'Mirití-Paraná', 'Otro'],
  'Antioquia':               ['Medellín', 'Bello', 'Itagüí', 'Envigado', 'Apartadó', 'Turbo', 'Rionegro', 'Caucasia', 'Montería', 'Quibdó', 'Sabaneta', 'Copacabana', 'Girardota', 'La Estrella', 'Caldas', 'Otro'],
  'Arauca':                  ['Arauca', 'Arauquita', 'Saravena', 'Tame', 'Fortul', 'Puerto Rondón', 'Cravo Norte', 'Otro'],
  'Atlántico':               ['Barranquilla', 'Soledad', 'Malambo', 'Sabanalarga', 'Galapa', 'Puerto Colombia', 'Baranoa', 'Ponedera', 'Otro'],
  'Bogotá D.C.':             ['Bogot�� D.C.', 'Otro'],
  'Bolívar':                 ['Cartagena', 'Magangué', 'El Carmen de Bolívar', 'Mompox', 'Turbaco', 'Arjona', 'San Jacinto', 'Otro'],
  'Boyacá':                  ['Tunja', 'Duitama', 'Sogamoso', 'Chiquinquirá', 'Monguí', 'Villa de Leyva', 'Paipa', 'Nobsa', 'Otro'],
  'Caldas':                  ['Manizales', 'La Dorada', 'Riosucio', 'Chinchiná', 'Villamaría', 'Anserma', 'Aguadas', 'Salamina', 'Otro'],
  'Caquetá':                 ['Florencia', 'San Vicente del Caguán', 'Puerto Rico', 'El Doncello', 'La Montañita', 'Belén de los Andaquíes', 'Otro'],
  'Casanare':                ['Yopal', 'Aguazul', 'Villanueva', 'Tauramena', 'Paz de Ariporo', 'Trinidad', 'Hato Corozal', 'Otro'],
  'Cauca':                   ['Popayán', 'Santander de Quilichao', 'Puerto Tejada', 'Patía', 'Corinto', 'Miranda', 'Buenos Aires', 'Otro'],
  'Cesar':                   ['Valledupar', 'Aguachica', 'Bosconia', 'Codazzi', 'La Jagua de Ibirico', 'Pelaya', 'Chimichagua', 'Otro'],
  'Chocó':                   ['Quibdó', 'Istmina', 'Tumaco', 'Condoto', 'Riosucio', 'Bahía Solano', 'Nuquí', 'Otro'],
  'Córdoba':                 ['Montería', 'Cereté', 'Sahagún', 'Lorica', 'Montelíbano', 'Tierralta', 'Planeta Rica', 'Otro'],
  'Cundinamarca':            ['Soacha', 'Facatativá', 'Zipaquirá', 'Chía', 'Fusagasugá', 'Madrid', 'Mosquera', 'Girardot', 'Cajicá', 'Otro'],
  'Guainía':                 ['Inírida', 'Barranco Minas', 'Mapiripana', 'San Felipe', 'Puerto Colombia', 'Otro'],
  'Guaviare':                ['San José del Guaviare', 'Calamar', 'El Retorno', 'Miraflores', 'Otro'],
  'Huila':                   ['Neiva', 'Pitalito', 'Garzón', 'La Plata', 'Campoalegre', 'Palermo', 'Rivera', 'Otro'],
  'La Guajira':              ['Riohacha', 'Maicao', 'Uribia', 'Manaure', 'Fonseca', 'San Juan del Cesar', 'Villanueva', 'Otro'],
  'Magdalena':               ['Santa Marta', 'Ciénaga', 'Fundación', 'El Banco', 'Plato', 'Aracataca', 'Pivijay', 'Otro'],
  'Meta':                    ['Villavicencio', 'Acacías', 'Granada', 'Puerto López', 'San Martín', 'Cumaral', 'Restrepo', 'Otro'],
  'Nariño':                  ['Pasto', 'Tumaco', 'Ipiales', 'Túquerres', 'La Unión', 'Samaniego', 'El Charco', 'Otro'],
  'Norte de Santander':      ['Cúcuta', 'Ocaña', 'Pamplona', 'Villa del Rosario', 'Los Patios', 'El Zulia', 'Tibú', 'Otro'],
  'Putumayo':                ['Mocoa', 'Puerto Asís', 'Orito', 'Valle del Guamuez', 'Sibundoy', 'San Francisco', 'Otro'],
  'Quindío':                 ['Armenia', 'Calarcá', 'Montenegro', 'Quimbaya', 'La Tebaida', 'Circasia', 'Filandia', 'Otro'],
  'Risaralda':               ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Quinchía', 'Belén de Umbría', 'Otro'],
  'San Andrés y Providencia':['San Andrés', 'Providencia', 'Santa Catalina', 'Otro'],
  'Santander':               ['Bucaramanga', 'Floridablanca', 'Girón', 'Piedecuesta', 'Barrancabermeja', 'Socorro', 'San Gil', 'Otro'],
  'Sucre':                   ['Sincelejo', 'Corozal', 'Sampués', 'San Marcos', 'Tolú', 'Morroa', 'Betulia', 'Otro'],
  'Tolima':                  ['Ibagué', 'Espinal', 'Melgar', 'Honda', 'Líbano', 'Chaparral', 'Mariquita', 'Otro'],
  'Valle del Cauca':         ['Cali', 'Buenaventura', 'Palmira', 'Tuluá', 'Buga', 'Cartago', 'Jamundí', 'Yumbo', 'Otro'],
  'Vaupés':                  ['Mitú', 'Caruru', 'Pacoa', 'Papunaua', 'Taraira', 'Yavaraté', 'Otro'],
  'Vichada':                 ['Puerto Carreño', 'La Primavera', 'Santa Rosalía', 'Cumaribo', 'Otro'],
}

const establecimientos = [
  'ESE Hospital Local', 'ESE Hospital Regional', 'ESE Hospital Departamental',
  'IPS Centro de Salud', 'IPS Clínica', 'Puesto de Salud',
  'Hospital Universitario', 'Unidad Médica ICBF', 'Centro de Atención Primaria',
  'Otro',
]

const factoresSociales = [
  'Pobreza extrema',
  'Agua no segura',
  'Madre con bajo nivel educativo',
  'Hacinamiento en el hogar',
  'Acceso limitado a servicios de salud',
  'Inseguridad alimentaria',
]

// ─── Helpers API ─────────────────────────────────────────────────────────────

function clasNombreToEstado(nombre) {
  if (!nombre) return 'adequate'
  const n = nombre.toLowerCase()
  if (n.includes('severa')) return 'severe'
  if (n.includes('moderada')) return 'moderate'
  if (n === 'normal bajo') return 'mild'
  if (n === 'normal') return 'adequate'
  return 'risk'
}

function mesesATexto(m) {
  return `${Math.floor((m || 0) / 12)}a ${(m || 0) % 12}m`
}

const MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function formatFechaCorta(iso) {
  if (!iso) return '-'
  const [y, mo, d] = iso.split('-')
  return `${parseInt(d)} ${MESES_ES[parseInt(mo) - 1]} ${y}`
}

function siNoToInt(v)   { return v === 'Sí' ? 1 : 2 }
function vacunasToInt(v){ return v === 'No' ? 2 : 1 }
function zonaToInt(v)   { return v === 'Rural' ? 2 : 1 }
function etniaToInt(v)  {
  return ({ Mestizo: 1, Indígena: 2, Afroperuano: 3, Blanco: 4, Otro: 5 })[v] ?? null
}
function estratoToInt(v){ return v ? parseInt(v) || null : null }
function educToInt(v)   {
  return ({
    'Sin educación': 1, 'Primaria incompleta': 2, 'Primaria completa': 3,
    'Secundaria incompleta': 4, 'Secundaria completa': 5, 'Superior': 6,
  })[v] ?? null
}

function mapPacienteRow(p) {
  const uc = p.ultimo_control
  return {
    id:      p.id,
    nombre:  `${p.nombre} ${p.apellidos}`,
    sexo:    p.sexo,
    edad:    mesesATexto(p.edad_meses),
    peso:    uc ? `${uc.peso_act} kg` : '-',
    talla:   uc ? `${uc.talla_act} cm` : '-',
    estado:  clasNombreToEstado(p.estado_nutricional),
    control: uc ? formatFechaCorta(uc.fecha) : 'Sin control',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcularEdad(fechaNac) {
  if (!fechaNac) return null
  const hoy   = new Date()
  const nac   = new Date(fechaNac)
  const meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth())
  if (meses < 0) return null
  return { años: Math.floor(meses / 12), meses: meses % 12, totalMeses: meses }
}

function edadTexto(e) {
  if (!e) return ''
  return `${e.años}a ${e.meses}m`
}

function StatusBadge({ estado }) {
  const s = statusConfig[estado] ?? statusConfig.risk
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

// ─── Sección del formulario ───────────────────────────────────────────────────

function SeccionTitle({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(79,180,210,0.12)' }}>
        <Icon className="w-3.5 h-3.5" style={{ color: '#4FB4D2' }} />
      </div>
      <p className="text-xs font-bold text-neutral-text uppercase tracking-wide">{label}</p>
    </div>
  )
}

// ─── Drawer Nuevo Paciente ────────────────────────────────────────────────────

function NuevoPacienteDrawer({ onClose, onCreated }) {
  const [step,      setStep]      = useState(1) // 1: personal, 2: ubicación, 3: control
  const [submitted, setSubmitted] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [apiError,  setApiError]  = useState('')

  const [form, setForm] = useState({
    // Datos personales
    nombre: '', apellidos: '', dni: '',
    fechaNac: '', sexo: '', etnia: '',
    // Antecedentes neonatales
    pesoNacer: '', tallaNacer: '', edadGestacional: '',
    lactancia: '', edadComplem: '', vacunasAlDia: '',
    crec_dllo: '', carne_vac: '', gp_pobicbf: '',
    // Procedencia
    dptoProcedencia: '', municipioProcedencia: '',
    // Residencia
    tipoZona: '', dptoResidencia: '', municipioResidencia: '',
    establecimiento: '',
    // Social
    estrato: '', educacionMadre: '', menoresHogar: '',
    factores: [],
    // Primer control (opcional)
    peso: '', talla: '',
    observaciones: '',
  })

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const edad    = calcularEdad(form.fechaNac)
  const menorDe5 = edad ? edad.totalMeses <= 60 : true
  const imc     = form.peso && form.talla
    ? (parseFloat(form.peso) / Math.pow(parseFloat(form.talla) / 100, 2)).toFixed(1)
    : null

  function toggleFactor(f) {
    setForm(p => ({
      ...p,
      factores: p.factores.includes(f) ? p.factores.filter(x => x !== f) : [...p.factores, f],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    // Guardia: solo enviar en el paso 3
    if (step < 3) {
      setStep(s => s + 1)
      return
    }
    setSaving(true)
    setApiError('')
    try {
      await api.post('/pacientes', {
        nombre:           form.nombre,
        apellidos:        form.apellidos,
        dni:              form.dni || undefined,
        fecha_nac:        form.fechaNac,
        sexo:             form.sexo,
        per_etn_:         etniaToInt(form.etnia),
        peso_nac:         form.pesoNacer      ? parseFloat(form.pesoNacer)      : undefined,
        edad_ges:         form.edadGestacional? parseFloat(form.edadGestacional): undefined,
        t_lechem:         form.lactancia      ? parseFloat(form.lactancia)      : undefined,
        e_complem:        form.edadComplem    ? parseFloat(form.edadComplem)    : undefined,
        esq_vac:          vacunasToInt(form.vacunasAlDia),
        carne_vac:        siNoToInt(form.carne_vac),
        crec_dllo:        siNoToInt(form.crec_dllo),
        gp_pobicbf:       siNoToInt(form.gp_pobicbf),
        cod_dpto_o:       form.dptoProcedencia   || undefined,
        municipio_proc:   form.municipioProcedencia || undefined,
        area_:            zonaToInt(form.tipoZona),
        dpto_residencia:  form.dptoResidencia   || undefined,
        municipio_res:    form.municipioResidencia || undefined,
        zona:             form.municipioResidencia || form.municipioProcedencia || undefined,
        establecimiento:  form.establecimiento,
        estrato_:         estratoToInt(form.estrato),
        niv_educat:       educToInt(form.educacionMadre),
        menores:          form.menoresHogar   ? parseFloat(form.menoresHogar)   : undefined,
        factores_sociales: form.factores,
        peso_act:         form.peso  ? parseFloat(form.peso)  : undefined,
        talla_act:        form.talla ? parseFloat(form.talla) : undefined,
        observaciones:    form.observaciones  || undefined,
      })
      setSubmitted(true)
      onCreated?.()
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Error al registrar paciente. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    { label: 'Personal',   num: 1 },
    { label: 'Ubicación',  num: 2 },
    { label: 'Control',    num: 3 },
  ]

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/25 z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed right-0 top-0 h-screen w-full max-w-lg bg-white z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-neutral-text">Nuevo paciente</h2>
            <p className="text-xs text-neutral-sub mt-0.5">Registro de paciente menor de 5 años</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-bg transition-colors text-neutral-sub">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          /* ── Éxito ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(82,196,26,0.12)' }}>
              <CheckCircle className="w-8 h-8" style={{ color: '#52C41A' }} />
            </div>
            <div className="text-center">
              <p className="font-bold text-neutral-text mb-1">Paciente registrado</p>
              <p className="text-xs text-neutral-sub max-w-xs">
                {form.nombre} {form.apellidos} ha sido registrado exitosamente en el sistema.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={onClose}
                className="clay-btn-outline px-5 py-2.5 text-sm font-medium text-neutral-sub border border-neutral-border rounded-xl">
                Cerrar
              </button>
              <button onClick={() => { setSubmitted(false); setStep(1); setForm({ nombre: '', apellidos: '', dni: '', fechaNac: '', sexo: '', etnia: '', pesoNacer: '', tallaNacer: '', edadGestacional: '', lactancia: '', edadComplem: '', vacunasAlDia: '', crec_dllo: '', carne_vac: '', gp_pobicbf: '', dptoProcedencia: '', municipioProcedencia: '', tipoZona: '', dptoResidencia: '', municipioResidencia: '', establecimiento: '', estrato: '', educacionMadre: '', menoresHogar: '', factores: [], peso: '', talla: '', observaciones: '' }) }}
                className="clay-btn text-white font-semibold px-5 py-2.5 text-sm">
                Registrar otro
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Steps indicator */}
            <div className="flex items-center gap-0 px-6 py-3 border-b border-neutral-border flex-shrink-0">
              {steps.map(({ label, num }, i) => (
                <div key={num} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => num < step && setStep(num)}
                    className="flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                      style={
                        step === num
                          ? { background: '#4FB4D2', color: '#fff' }
                          : num < step
                          ? { background: 'rgba(82,196,26,0.15)', color: '#52C41A' }
                          : { background: '#F1F5F9', color: '#94A3B8' }
                      }>
                      {num < step ? '✓' : num}
                    </div>
                    <span className="text-xs font-medium hidden sm:block"
                      style={{ color: step === num ? '#4FB4D2' : num < step ? '#52C41A' : '#94A3B8' }}>
                      {label}
                    </span>
                  </button>
                  {i < steps.length - 1 && (
                    <div className="w-8 h-px mx-2" style={{ background: '#D9EEF5' }} />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

              {/* ── Paso 1: Datos personales ── */}
              {step === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-4">
                  <SeccionTitle icon={User} label="Datos personales" />

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Nombre(s)</label>
                      <input type="text" placeholder="Ej. Carlos" required
                        value={form.nombre} onChange={e => set('nombre', e.target.value)}
                        className="input-clinical" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Apellidos</label>
                      <input type="text" placeholder="Ej. Mendoza Ramos" required
                        value={form.apellidos} onChange={e => set('apellidos', e.target.value)}
                        className="input-clinical" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-sub mb-1.5">DNI / Código</label>
                    <input type="text" placeholder="Opcional"
                      value={form.dni} onChange={e => set('dni', e.target.value)}
                      className="input-clinical" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Fecha de nacimiento</label>
                    <input type="date" required
                      max={new Date().toISOString().split('T')[0]}
                      value={form.fechaNac} onChange={e => set('fechaNac', e.target.value)}
                      className="input-clinical" />
                    {edad && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={menorDe5
                            ? { background: 'rgba(79,180,210,0.10)', color: '#4FB4D2' }
                            : { background: 'rgba(229,57,53,0.10)', color: '#E53935' }
                          }>
                          {edadTexto(edad)}
                        </span>
                        {!menorDe5 && (
                          <span className="text-xs text-status-moderate">
                            El sistema atiende menores de 5 años
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-sub mb-2">Sexo</label>
                    <div className="flex gap-3">
                      {[{ val: 'M', label: 'Masculino' }, { val: 'F', label: 'Femenino' }].map(({ val, label }) => (
                        <button key={val} type="button"
                          onClick={() => set('sexo', val)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
                          style={form.sexo === val
                            ? { background: '#4FB4D2', color: '#fff', borderColor: '#4FB4D2' }
                            : { background: 'white', color: '#64748B', borderColor: '#D9EEF5' }
                          }>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Etnia</label>
                    <select value={form.etnia} onChange={e => set('etnia', e.target.value)} className="input-clinical">
                      <option value="">Seleccionar...</option>
                      {['Mestizo','Indígena','Afroperuano','Blanco','Otro'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>

                  <p className="text-xs font-bold text-neutral-text uppercase tracking-wide pt-1">Antecedentes neonatales</p>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Peso al nacer (kg)</label>
                      <input type="number" step="0.01" min="0.5" max="6" placeholder="3.2"
                        value={form.pesoNacer} onChange={e => set('pesoNacer', e.target.value)}
                        className="input-clinical" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Talla al nacer (cm)</label>
                      <input type="number" step="0.1" min="30" max="60" placeholder="50"
                        value={form.tallaNacer} onChange={e => set('tallaNacer', e.target.value)}
                        className="input-clinical" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Edad gestacional (sem)</label>
                      <input type="number" min="22" max="44" placeholder="39"
                        value={form.edadGestacional} onChange={e => set('edadGestacional', e.target.value)}
                        className="input-clinical" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Duración lactancia (meses)</label>
                      <input type="number" min="0" max="24" placeholder="6"
                        value={form.lactancia} onChange={e => set('lactancia', e.target.value)}
                        className="input-clinical" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Inicio alim. complementaria (meses)</label>
                      <input type="number" min="0" max="12" placeholder="6"
                        value={form.edadComplem} onChange={e => set('edadComplem', e.target.value)}
                        className="input-clinical" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-border">
                    <span className="text-xs text-neutral-sub">Esquema de vacunación completo</span>
                    <div className="flex gap-2">
                      {['Sí', 'No', 'Parcial'].map(v => (
                        <button key={v} type="button" onClick={() => set('vacunasAlDia', v)}
                          className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                          style={form.vacunasAlDia === v
                            ? { background: '#4FB4D2', color: '#fff' }
                            : { background: '#F1F5F9', color: '#64748B' }
                          }>{v}</button>
                      ))}
                    </div>
                  </div>

                  {[
                    { key: 'carne_vac',  label: 'Tiene carné de vacunación' },
                    { key: 'crec_dllo',  label: 'Asiste a control de crecimiento y desarrollo' },
                    { key: 'gp_pobicbf', label: 'Pertenece a programa de apoyo nutricional (ICBF/social)' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl border border-neutral-border">
                      <span className="text-xs text-neutral-sub">{label}</span>
                      <div className="flex gap-2">
                        {['Sí', 'No'].map(v => (
                          <button key={v} type="button" onClick={() => set(key, v)}
                            className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                            style={form[key] === v
                              ? { background: '#4FB4D2', color: '#fff' }
                              : { background: '#F1F5F9', color: '#64748B' }
                            }>{v}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* ── Paso 2: Ubicación ── */}
              {step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-4">

                  {/* — Procedencia — */}
                  <SeccionTitle icon={MapPin} label="Lugar de procedencia" />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Departamento</label>
                      <select value={form.dptoProcedencia}
                        onChange={e => { set('dptoProcedencia', e.target.value); set('municipioProcedencia', '') }}
                        className="input-clinical">
                        <option value="">Seleccionar...</option>
                        {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Municipio</label>
                      <select value={form.municipioProcedencia}
                        onChange={e => set('municipioProcedencia', e.target.value)}
                        className="input-clinical"
                        disabled={!form.dptoProcedencia}>
                        <option value="">{form.dptoProcedencia ? 'Seleccionar...' : '— elige depto —'}</option>
                        {(municipiosPorDepartamento[form.dptoProcedencia] || []).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* — Residencia — */}
                  <div className="border-t border-neutral-border pt-4">
                    <SeccionTitle icon={MapPin} label="Lugar de residencia actual" />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-sub mb-2">Área</label>
                    <div className="flex gap-3">
                      {['Urbana', 'Rural'].map(v => (
                        <button key={v} type="button" onClick={() => set('tipoZona', v)}
                          className="flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all"
                          style={form.tipoZona === v
                            ? { background: '#4FB4D2', color: '#fff', borderColor: '#4FB4D2' }
                            : { background: 'white', color: '#64748B', borderColor: '#D9EEF5' }
                          }>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Departamento</label>
                      <select required value={form.dptoResidencia}
                        onChange={e => { set('dptoResidencia', e.target.value); set('municipioResidencia', '') }}
                        className="input-clinical">
                        <option value="">Seleccionar...</option>
                        {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Municipio</label>
                      <select required value={form.municipioResidencia}
                        onChange={e => set('municipioResidencia', e.target.value)}
                        className="input-clinical"
                        disabled={!form.dptoResidencia}>
                        <option value="">{form.dptoResidencia ? 'Seleccionar...' : '— elige depto —'}</option>
                        {(municipiosPorDepartamento[form.dptoResidencia] || []).map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Establecimiento de salud</label>
                    <select required value={form.establecimiento} onChange={e => set('establecimiento', e.target.value)}
                      className="input-clinical">
                      <option value="">Seleccionar establecimiento...</option>
                      {establecimientos.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Estrato socioeconómico</label>
                      <select value={form.estrato} onChange={e => set('estrato', e.target.value)} className="input-clinical">
                        <option value="">Seleccionar...</option>
                        {['1 - Muy bajo','2 - Bajo','3 - Medio','4 - Alto'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Menores en el hogar</label>
                      <input type="number" min="0" max="20" placeholder="0"
                        value={form.menoresHogar} onChange={e => set('menoresHogar', e.target.value)}
                        className="input-clinical" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Nivel educativo de la madre</label>
                    <select value={form.educacionMadre} onChange={e => set('educacionMadre', e.target.value)}
                      className="input-clinical">
                      <option value="">Seleccionar...</option>
                      {['Sin educación','Primaria incompleta','Primaria completa','Secundaria incompleta','Secundaria completa','Superior'].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-sub mb-3">Factores sociales detectados</label>
                    <div className="flex flex-col gap-2.5">
                      {factoresSociales.map(f => (
                        <label key={f} className="flex items-center gap-3 cursor-pointer group">
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all"
                            style={form.factores.includes(f)
                              ? { background: '#4FB4D2', borderColor: '#4FB4D2' }
                              : { borderColor: '#D9EEF5' }
                            }
                            onClick={() => toggleFactor(f)}
                          >
                            {form.factores.includes(f) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span className="text-xs text-neutral-sub group-hover:text-neutral-text transition-colors">{f}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Paso 3: Primer control ── */}
              {step === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col gap-4">
                  <SeccionTitle icon={Scale} label="Primer control antropométrico" />

                  <p className="text-xs text-neutral-sub -mt-2">
                    Opcional. Puedes registrarlo ahora o desde el detalle del paciente.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Peso (kg)</label>
                      <input type="number" step="0.1" min="0" placeholder="10.2"
                        value={form.peso} onChange={e => set('peso', e.target.value)}
                        className="input-clinical" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Talla (cm)</label>
                      <input type="number" step="0.1" min="0" placeholder="84"
                        value={form.talla} onChange={e => set('talla', e.target.value)}
                        className="input-clinical" />
                    </div>
                  </div>

                  {imc && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(79,180,210,0.08)' }}>
                      <span className="text-xs text-neutral-sub">IMC calculado</span>
                      <span className="text-base font-bold" style={{ color: '#4FB4D2' }}>{imc}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-neutral-sub mb-1.5">Observaciones</label>
                    <textarea rows={4} placeholder="Notas clínicas del primer control..."
                      value={form.observaciones} onChange={e => set('observaciones', e.target.value)}
                      className="input-clinical resize-none" />
                  </div>
                </motion.div>
              )}

              {/* Navegación entre pasos */}
              {apiError && (
                <p className="text-xs px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(229,57,53,0.08)', color: '#E53935' }}>
                  {apiError}
                </p>
              )}
              <div className="flex gap-3 mt-auto pt-2">
                {step > 1 && (
                  <button type="button" onClick={() => setStep(s => s - 1)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-neutral-border text-neutral-sub hover:bg-neutral-bg transition-colors">
                    Atrás
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 clay-btn text-white font-semibold py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {step < 3
                    ? 'Siguiente'
                    : saving
                      ? 'Guardando...'
                      : <><CheckCircle className="w-4 h-4" />Registrar paciente</>
                  }
                </button>
              </div>

            </form>
          </>
        )}
      </motion.div>
    </>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function PacientesCLI() {
  const navigate = useNavigate()
  const [query,        setQuery]        = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [showDrawer,   setShowDrawer]   = useState(false)
  const [pacientes,    setPacientes]    = useState([])
  const [loadingList,  setLoadingList]  = useState(true)

  function fetchPacientes() {
    setLoadingList(true)
    api.get('/pacientes')
      .then(({ data }) => setPacientes(data.map(mapPacienteRow)))
      .catch((err) => {
        console.error('[Pacientes] Error cargando:', err.response?.status, err.response?.data?.detail)
      })
      .finally(() => setLoadingList(false))
  }

  useEffect(() => { fetchPacientes() }, [])

  const filtered = pacientes.filter(p => {
    const matchNombre = p.nombre.toLowerCase().includes(query.toLowerCase())
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado
    return matchNombre && matchEstado
  })

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp}
        className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-text">Pacientes</h1>
          <p className="text-sm text-neutral-sub mt-1">{loadingList ? 'Cargando...' : `${pacientes.length} pacientes registrados`}</p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="clay-btn flex items-center gap-2 text-white font-semibold px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" />
          Nuevo paciente
        </button>
      </motion.div>

      {/* Búsqueda y filtros */}
      <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp}
        className="clay-card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-sub" />
          <input type="text" placeholder="Buscar por nombre..."
            value={query} onChange={e => setQuery(e.target.value)}
            className="input-clinical pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(filterLabels).map(f => (
            <button key={f} onClick={() => setFiltroEstado(f)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={filtroEstado === f
                ? { background: '#4FB4D2', color: '#fff' }
                : { background: 'rgba(79,180,210,0.08)', color: '#64748B' }
              }>
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tabla */}
      <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp}
        className="clay-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-border">
              <th className="text-left text-xs font-semibold text-neutral-sub px-6 py-3.5">Paciente</th>
              <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3.5 hidden sm:table-cell">Edad</th>
              <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3.5 hidden md:table-cell">Peso</th>
              <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3.5 hidden md:table-cell">Talla</th>
              <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3.5">Estado</th>
              <th className="text-left text-xs font-semibold text-neutral-sub px-4 py-3.5 hidden lg:table-cell">Último control</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(({ id, nombre, sexo, edad, peso, talla, estado, control }) => (
              <tr key={id} onClick={() => navigate(`/cli/pacientes/${id}`)}
                className="border-b border-neutral-border last:border-0 hover:bg-neutral-bg transition-colors cursor-pointer">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #4FB4D2, #6EC6E0)' }}>
                      {nombre.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-text">{nombre}</p>
                      <p className="text-xs text-neutral-sub">{sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-neutral-sub hidden sm:table-cell">{edad}</td>
                <td className="px-4 py-3.5 text-sm text-neutral-sub hidden md:table-cell">{peso}</td>
                <td className="px-4 py-3.5 text-sm text-neutral-sub hidden md:table-cell">{talla}</td>
                <td className="px-4 py-3.5"><StatusBadge estado={estado} /></td>
                <td className="px-4 py-3.5 text-xs text-neutral-sub hidden lg:table-cell">{control}</td>
                <td className="px-4 py-3.5">
                  <ChevronRight className="w-4 h-4 text-neutral-sub" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-neutral-sub">
            No se encontraron pacientes.
          </div>
        )}
      </motion.div>

      {/* Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <NuevoPacienteDrawer
            onClose={() => setShowDrawer(false)}
            onCreated={fetchPacientes}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
