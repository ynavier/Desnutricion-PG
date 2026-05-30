import { useState, useEffect } from 'react'
import {
  UserPlus, Search, ToggleLeft, ToggleRight,
  X, Eye, EyeOff, ShieldCheck, CheckCircle,
  AlertCircle, ChevronDown, Pencil,
} from 'lucide-react'
import api from '../../services/api'

const CARD = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: 20,
  boxShadow: 'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.07), 0 4px 18px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.04)',
  padding: '20px 24px',
}

const ROL_CONFIG = {
  CLI: { label: 'Clínico',        color: '#2A7A9A', bg: 'rgba(79,180,210,0.1)'  },
  ANL: { label: 'Analítico',      color: '#27AE60', bg: 'rgba(39,174,96,0.1)'   },
  ADM: { label: 'Administrador',  color: '#7D3C98', bg: 'rgba(155,89,182,0.1)'  },
}

const emptyForm = {
  nombre: '', apellidos: '', email: '',
  establecimiento: '', password: '', confirm: '', rol: 'CLI',
}

function Toast({ msg, type }) {
  if (!msg) return null
  const ok = type === 'ok'
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
      style={{ background: ok ? 'rgba(111,207,151,0.15)' : 'rgba(229,57,53,0.1)', border: `1px solid ${ok ? 'rgba(111,207,151,0.4)' : 'rgba(229,57,53,0.3)'}`, color: ok ? '#1A6B3C' : '#B71C1C' }}>
      {ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#3DAB6B' }} />
           : <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#E53935' }} />}
      {msg}
    </div>
  )
}

function RolBadge({ rol }) {
  const cfg = ROL_CONFIG[rol] || { label: rol, color: '#64748B', bg: '#F1F5F9' }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function RolSelect({ value, onChange, disabled }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="appearance-none pl-3 pr-7 py-1.5 text-xs rounded-xl border outline-none cursor-pointer disabled:opacity-50"
        style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}>
        {Object.entries(ROL_CONFIG).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-sub pointer-events-none" />
    </div>
  )
}

export default function UsuariosANL() {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [query,      setQuery]      = useState('')
  const [rolFiltro,  setRolFiltro]  = useState('TODOS')
  const [showDrawer, setShowDrawer] = useState(false)
  const [form,       setForm]       = useState(emptyForm)
  const [showPass,   setShowPass]   = useState(false)
  const [errors,     setErrors]     = useState({})
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState({ msg: '', type: '' })
  const [toggling,   setToggling]   = useState(null)
  const [editingRol, setEditingRol] = useState(null)   // id del usuario cuyo rol se está editando

  function showToast(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3000)
  }

  async function loadUsers() {
    setLoading(true)
    try {
      const { data } = await api.get('/usuarios')
      setUsers(data)
    } catch {
      showToast('No se pudieron cargar los usuarios', 'err')
    } finally { setLoading(false) }
  }

  useEffect(() => { loadUsers() }, [])

  const filtered = users.filter(u => {
    const matchQuery = (
      u.nombre?.toLowerCase().includes(query.toLowerCase()) ||
      u.email?.toLowerCase().includes(query.toLowerCase()) ||
      (u.establecimiento || '').toLowerCase().includes(query.toLowerCase())
    )
    const matchRol = rolFiltro === 'TODOS' || u.rol === rolFiltro
    return matchQuery && matchRol
  })

  async function toggleUser(id, current) {
    setToggling(id)
    try {
      await api.patch(`/usuarios/${id}/habilitar`, null, { params: { habilitado: !current } })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, habilitado: !current } : u))
      showToast(`Usuario ${!current ? 'habilitado' : 'inhabilitado'}`)
    } catch {
      showToast('No se pudo cambiar el estado', 'err')
    } finally { setToggling(null) }
  }

  async function cambiarRol(id, nuevoRol) {
    try {
      await api.patch(`/usuarios/${id}/rol`, { rol: nuevoRol })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, rol: nuevoRol } : u))
      setEditingRol(null)
      showToast(`Rol actualizado a ${ROL_CONFIG[nuevoRol]?.label}`)
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al cambiar rol', 'err')
      setEditingRol(null)
    }
  }

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.nombre.trim())    e.nombre    = 'Requerido'
    if (!form.apellidos.trim()) e.apellidos = 'Requerido'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Email inválido'
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirm) e.confirm = 'No coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('/usuarios', {
        nombre: form.nombre, apellidos: form.apellidos,
        email: form.email, password: form.password,
        rol: form.rol, establecimiento: form.establecimiento || null,
      })
      showToast(`Usuario ${ROL_CONFIG[form.rol]?.label} registrado`)
      closeDrawer()
      loadUsers()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al registrar', 'err')
    } finally { setSaving(false) }
  }

  function closeDrawer() {
    setShowDrawer(false)
    setForm(emptyForm)
    setErrors({})
    setShowPass(false)
  }

  const byRol = (r) => users.filter(u => u.rol === r).length

  return (
    <div className="p-6 space-y-5 bg-neutral-bg min-h-screen">
      <Toast msg={toast.msg} type={toast.type} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Gestión de Usuarios</h1>
          <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>Administra todos los usuarios del sistema y sus roles</p>
        </div>
        <button onClick={() => setShowDrawer(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff', boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.45), inset 0 -3px 6px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.15)' }}>
          <UserPlus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {/* KPIs por rol */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total usuarios', value: users.length,        color: '#4FB4D2' },
          { label: 'Clínicos (CLI)', value: byRol('CLI'),        color: '#2A7A9A' },
          { label: 'Analíticos (ANL)', value: byRol('ANL'),      color: '#27AE60' },
          { label: 'Administradores', value: byRol('ADM'),       color: '#7D3C98' },
        ].map(({ label, value, color }) => (
          <div key={label} style={CARD}>
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: '#54606E' }}>{label}</p>
              <ShieldCheck className="w-4 h-4" style={{ color }} />
            </div>
            {loading
              ? <div className="h-8 w-12 rounded mt-1 animate-pulse" style={{ background: '#F0F0F0' }} />
              : <p className="text-3xl font-bold mt-1" style={{ color: '#1A1F2B' }}>{value}</p>
            }
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={CARD}>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex-1 relative min-w-48">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <input type="text" placeholder="Buscar por nombre, email o establecimiento..."
              value={query} onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl outline-none"
              style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }} />
          </div>
          {/* Filtro por rol — estilo sidebar */}
          <div className="flex items-center gap-1">
            {[
              { key: 'TODOS', label: 'Todos',         color: '#54606E', bg: 'rgba(0,0,0,0.05)' },
              { key: 'CLI',   label: 'Clínicos',      color: ROL_CONFIG.CLI.color, bg: 'rgba(79,180,210,0.1)'   },
              { key: 'ANL',   label: 'Analíticos',    color: ROL_CONFIG.ANL.color, bg: 'rgba(39,174,96,0.1)'    },
              { key: 'ADM',   label: 'Administradores', color: ROL_CONFIG.ADM.color, bg: 'rgba(155,89,182,0.1)' },
            ].map(({ key, label, color, bg }) => (
              <button key={key} onClick={() => setRolFiltro(key)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={rolFiltro === key
                  ? { background: bg, color, boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.92), inset 0 -2px 4px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.07)' }
                  : { color: '#94A3B8' }
                }>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-2">
            {[1,2,3].map(n => <div key={n} className="h-12 rounded-xl animate-pulse" style={{ background: '#F7F9FC' }} />)}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
                  {['Usuario', 'Email', 'Rol', 'Establecimiento', 'Registrado', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold" style={{ color: '#54606E' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F7F9FC' }}>
                    {/* Usuario */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: u.habilitado ? (ROL_CONFIG[u.rol]?.color || '#4FB4D2') : '#D1D5DB' }}>
                          {(u.nombre || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>{u.nombre}</span>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="py-3 px-3 text-xs" style={{ color: '#54606E' }}>{u.email}</td>
                    {/* Rol — editable */}
                    <td className="py-3 px-3">
                      {editingRol === u.id ? (
                        <RolSelect value={u.rol}
                          onChange={nuevoRol => cambiarRol(u.id, nuevoRol)}
                        />
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <RolBadge rol={u.rol} />
                          <button onClick={() => setEditingRol(u.id)}
                            className="p-0.5 rounded opacity-40 hover:opacity-100 transition-all"
                            title="Cambiar rol">
                            <Pencil className="w-3 h-3" style={{ color: '#64748B' }} />
                          </button>
                        </div>
                      )}
                    </td>
                    {/* Establecimiento */}
                    <td className="py-3 px-3 text-xs" style={{ color: '#54606E' }}>{u.establecimiento || '—'}</td>
                    {/* Fecha */}
                    <td className="py-3 px-3 text-xs" style={{ color: '#54606E' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('es-CO') : '—'}
                    </td>
                    {/* Estado */}
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-semibold"
                        style={{ color: u.habilitado ? '#3DAB6B' : '#9CA3AF' }}>
                        {u.habilitado ? 'Habilitado' : 'Inhabilitado'}
                      </span>
                    </td>
                    {/* Acciones */}
                    <td className="py-3 px-3">
                      <button onClick={() => toggleUser(u.id, u.habilitado)}
                        disabled={toggling === u.id}
                        className="flex items-center gap-1 text-xs font-medium transition-all"
                        style={{ color: u.habilitado ? '#E53935' : '#3DAB6B', opacity: toggling === u.id ? 0.5 : 1 }}>
                        {toggling === u.id
                          ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : u.habilitado
                            ? <><ToggleRight className="w-4 h-4" />Inhabilitar</>
                            : <><ToggleLeft  className="w-4 h-4" />Habilitar</>
                        }
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  {users.length === 0 ? 'No hay usuarios registrados' : 'Sin resultados para la búsqueda'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer nuevo usuario */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-slate-900/30 backdrop-blur-[2px]" onClick={closeDrawer} />
          <div className="w-full max-w-md h-full overflow-y-auto flex flex-col"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: '-4px 0 32px rgba(0,0,0,0.12)' }}>
            {/* Header drawer */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E0E6ED' }}>
              <div>
                <p className="text-base font-bold" style={{ color: '#1A1F2B' }}>Nuevo usuario</p>
                <p className="text-xs mt-0.5" style={{ color: '#54606E' }}>Registra acceso con el rol adecuado</p>
              </div>
              <button onClick={closeDrawer} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100">
                <X className="w-4 h-4" style={{ color: '#54606E' }} />
              </button>
            </div>

            {/* Formulario */}
            <div className="flex-1 px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[{ key:'nombre', label:'Nombre(s)' }, { key:'apellidos', label:'Apellidos' }].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>{label}</label>
                    <input type="text" value={form[key]} onChange={e => setField(key, e.target.value)}
                      className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                      style={{ border: `1px solid ${errors[key] ? '#E53935' : '#E0E6ED'}`, background: '#F7F9FC' }} />
                    {errors[key] && <p className="text-[10px] mt-0.5" style={{ color: '#E53935' }}>{errors[key]}</p>}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Correo institucional</label>
                <input type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                  placeholder="usuario@salud.gov.co"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: `1px solid ${errors.email ? '#E53935' : '#E0E6ED'}`, background: '#F7F9FC' }} />
                {errors.email && <p className="text-[10px] mt-0.5" style={{ color: '#E53935' }}>{errors.email}</p>}
              </div>

              {/* Selector de rol */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: '#54606E' }}>Rol del usuario</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(ROL_CONFIG).map(([r, cfg]) => (
                    <button key={r} type="button" onClick={() => setField('rol', r)}
                      className="py-2.5 rounded-xl text-xs font-semibold transition-all border"
                      style={form.rol === r
                        ? { background: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.color}` }
                        : { background: '#F7F9FC', color: '#54606E', border: '1px solid #E0E6ED' }}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] mt-2" style={{ color: '#9CA3AF' }}>
                  {form.rol === 'CLI' && 'Acceso al panel clínico: pacientes, controles y alertas.'}
                  {form.rol === 'ANL' && 'Acceso al panel analítico: dashboards, proyecciones e informes.'}
                  {form.rol === 'ADM' && 'Acceso completo: configuración del sistema, modelos y usuarios.'}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>
                  Establecimiento <span style={{ color: '#9CA3AF' }}>(opcional)</span>
                </label>
                <input type="text" value={form.establecimiento} onChange={e => setField('establecimiento', e.target.value)}
                  placeholder="Ej: E.S.E. Hospital San José"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC' }} />
              </div>

              <div style={{ borderTop: '1px solid #F0F0F0', paddingTop: 12 }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#1A1F2B' }}>Contraseña inicial</p>
                <div className="space-y-3">
                  {[
                    { key: 'password', label: 'Contraseña',         placeholder: 'Mínimo 8 caracteres' },
                    { key: 'confirm',  label: 'Confirmar contraseña', placeholder: 'Repite la contraseña' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>{label}</label>
                      <div className="relative">
                        <input type={showPass ? 'text' : 'password'} value={form[key]}
                          onChange={e => setField(key, e.target.value)} placeholder={placeholder}
                          className="w-full text-sm rounded-xl px-3 py-2.5 pr-10 outline-none"
                          style={{ border: `1px solid ${errors[key] ? '#E53935' : '#E0E6ED'}`, background: '#F7F9FC' }} />
                        <button type="button" onClick={() => setShowPass(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPass
                            ? <EyeOff className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                            : <Eye    className="w-4 h-4" style={{ color: '#9CA3AF' }} />}
                        </button>
                      </div>
                      {errors[key] && <p className="text-[10px] mt-0.5" style={{ color: '#E53935' }}>{errors[key]}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer drawer */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid #E0E6ED' }}>
              <button onClick={closeDrawer} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: '#F7F9FC', border: '1px solid #E0E6ED', color: '#54606E' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={saving
                  ? { background: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }
                  : { background: 'linear-gradient(135deg,#6FCF97,#4FB4D2)', color: '#fff', boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.45), 0 6px 20px rgba(0,0,0,0.15)' }}>
                {saving
                  ? <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Registrando...</>
                  : 'Registrar usuario'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
