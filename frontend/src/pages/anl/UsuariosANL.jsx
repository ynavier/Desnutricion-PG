import { useState } from 'react'
import { UserPlus, Search, ToggleLeft, ToggleRight, X, Eye, EyeOff, ShieldCheck } from 'lucide-react'

const CARD = { background: '#fff', borderRadius: 16, border: '1px solid #E0E6ED', padding: '20px 24px' }

const mockUsers = [
  { id: 1, nombre: 'Dra. Ana Torres', email: 'ana.torres@nutrivigila.pe', establecimiento: 'C.S. Ventanilla', habilitado: true, lastAccess: '2025-05-22' },
  { id: 2, nombre: 'Lic. Carmen Ríos', email: 'carmen.rios@nutrivigila.pe', establecimiento: 'C.S. Callao', habilitado: true, lastAccess: '2025-05-21' },
  { id: 3, nombre: 'Enf. Luis Mendoza', email: 'luis.mendoza@nutrivigila.pe', establecimiento: 'P.S. Villa El Salvador', habilitado: false, lastAccess: '2025-04-15' },
  { id: 4, nombre: 'Dr. Jorge Salas', email: 'jorge.salas@nutrivigila.pe', establecimiento: 'C.S. Ate', habilitado: true, lastAccess: '2025-05-20' },
  { id: 5, nombre: 'Lic. María Flores', email: 'maria.flores@nutrivigila.pe', establecimiento: 'C.S. SJL', habilitado: true, lastAccess: '2025-05-19' },
]

const establecimientos = [
  'C.S. Ventanilla', 'C.S. Callao', 'C.S. Ate', 'C.S. SJL',
  'P.S. Villa El Salvador', 'C.S. Miraflores', 'C.S. Los Olivos',
]

const emptyForm = { nombre: '', apellidos: '', email: '', establecimiento: '', password: '', confirm: '' }

export default function UsuariosANL() {
  const [users, setUsers] = useState(mockUsers)
  const [query, setQuery] = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  const filtered = users.filter(u =>
    u.nombre.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase()) ||
    u.establecimiento.toLowerCase().includes(query.toLowerCase())
  )

  function toggleUser(id) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, habilitado: !u.habilitado } : u))
  }

  function setField(key, val) {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.apellidos.trim()) e.apellidos = 'Requerido'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Email inválido'
    if (!form.establecimiento) e.establecimiento = 'Selecciona un establecimiento'
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirm) e.confirm = 'Las contraseñas no coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const nuevo = {
      id: Date.now(),
      nombre: `${form.nombre} ${form.apellidos}`,
      email: form.email,
      establecimiento: form.establecimiento,
      habilitado: true,
      lastAccess: '—',
    }
    setUsers(prev => [nuevo, ...prev])
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      setShowDrawer(false)
      setForm(emptyForm)
    }, 1500)
  }

  function closeDrawer() {
    setShowDrawer(false)
    setForm(emptyForm)
    setErrors({})
  }

  return (
    <div className="p-6 space-y-6" style={{ background: '#FAFCFF', minHeight: '100vh' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Gestión de Usuarios CLI</h1>
          <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>Administra el acceso del personal clínico a la plataforma</p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff' }}
        >
          <UserPlus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Usuarios totales', value: users.length, color: '#4FB4D2', bg: 'rgba(79,180,210,0.1)' },
          { label: 'Habilitados', value: users.filter(u => u.habilitado).length, color: '#3DAB6B', bg: 'rgba(111,207,151,0.1)' },
          { label: 'Inhabilitados', value: users.filter(u => !u.habilitado).length, color: '#E53935', bg: 'rgba(229,57,53,0.08)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={CARD}>
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: '#54606E' }}>{label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <ShieldCheck className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <p className="text-3xl font-bold mt-1" style={{ color: '#1A1F2B' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={CARD}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
            <input
              type="text" placeholder="Buscar por nombre, email o establecimiento..."
              value={query} onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl outline-none"
              style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
              {['Nombre', 'Email', 'Establecimiento', 'Último acceso', 'Estado', 'Acción'].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold" style={{ color: '#54606E' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #F7F9FC' }}>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: u.habilitado ? 'linear-gradient(135deg, #4FB4D2, #6FCF97)' : '#D1D5DB' }}
                    >
                      {u.nombre.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>{u.nombre}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-xs" style={{ color: '#54606E' }}>{u.email}</td>
                <td className="py-3 px-3 text-xs" style={{ color: '#54606E' }}>{u.establecimiento}</td>
                <td className="py-3 px-3 text-xs" style={{ color: '#54606E' }}>{u.lastAccess}</td>
                <td className="py-3 px-3">
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={u.habilitado
                      ? { background: 'rgba(111,207,151,0.15)', color: '#3DAB6B' }
                      : { background: '#F3F4F6', color: '#9CA3AF' }
                    }
                  >
                    {u.habilitado ? 'Habilitado' : 'Inhabilitado'}
                  </span>
                </td>
                <td className="py-3 px-3">
                  <button
                    onClick={() => toggleUser(u.id)}
                    className="flex items-center gap-1.5 text-xs font-medium transition-all"
                    style={{ color: u.habilitado ? '#E53935' : '#3DAB6B' }}
                  >
                    {u.habilitado
                      ? <><ToggleRight className="w-4 h-4" /> Inhabilitar</>
                      : <><ToggleLeft className="w-4 h-4" /> Habilitar</>
                    }
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-10">
            <p className="text-sm" style={{ color: '#9CA3AF' }}>No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Drawer overlay */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/20" onClick={closeDrawer} />
          <div
            className="w-full max-w-md h-full overflow-y-auto flex flex-col"
            style={{ background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)' }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E0E6ED' }}>
              <div>
                <p className="text-base font-bold" style={{ color: '#1A1F2B' }}>Nuevo usuario CLI</p>
                <p className="text-xs mt-0.5" style={{ color: '#54606E' }}>Registra acceso para personal clínico</p>
              </div>
              <button onClick={closeDrawer} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100">
                <X className="w-4 h-4" style={{ color: '#54606E' }} />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'nombre', label: 'Nombre(s)' },
                  { key: 'apellidos', label: 'Apellidos' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>{label}</label>
                    <input
                      type="text" value={form[key]} onChange={e => setField(key, e.target.value)}
                      className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                      style={{ border: `1px solid ${errors[key] ? '#E53935' : '#E0E6ED'}`, background: '#F7F9FC', color: '#1A1F2B' }}
                    />
                    {errors[key] && <p className="text-[10px] mt-0.5" style={{ color: '#E53935' }}>{errors[key]}</p>}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Correo institucional</label>
                <input
                  type="email" value={form.email} onChange={e => setField('email', e.target.value)}
                  placeholder="usuario@nutrivigila.pe"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: `1px solid ${errors.email ? '#E53935' : '#E0E6ED'}`, background: '#F7F9FC', color: '#1A1F2B' }}
                />
                {errors.email && <p className="text-[10px] mt-0.5" style={{ color: '#E53935' }}>{errors.email}</p>}
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>Establecimiento de salud</label>
                <select
                  value={form.establecimiento} onChange={e => setField('establecimiento', e.target.value)}
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: `1px solid ${errors.establecimiento ? '#E53935' : '#E0E6ED'}`, background: '#F7F9FC', color: '#1A1F2B' }}
                >
                  <option value="">Seleccionar...</option>
                  {establecimientos.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                {errors.establecimiento && <p className="text-[10px] mt-0.5" style={{ color: '#E53935' }}>{errors.establecimiento}</p>}
              </div>

              <div style={{ borderTop: '1px solid #F0F0F0', paddingTop: 12 }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#1A1F2B' }}>Contraseña inicial</p>
                <div className="space-y-3">
                  {[
                    { key: 'password', label: 'Contraseña', placeholder: 'Mínimo 8 caracteres' },
                    { key: 'confirm', label: 'Confirmar contraseña', placeholder: 'Repite la contraseña' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>{label}</label>
                      <div className="relative">
                        <input
                          type={showPass ? 'text' : 'password'} value={form[key]}
                          onChange={e => setField(key, e.target.value)} placeholder={placeholder}
                          className="w-full text-sm rounded-xl px-3 py-2.5 pr-10 outline-none"
                          style={{ border: `1px solid ${errors[key] ? '#E53935' : '#E0E6ED'}`, background: '#F7F9FC', color: '#1A1F2B' }}
                        />
                        <button
                          type="button" onClick={() => setShowPass(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" style={{ color: '#9CA3AF' }} /> : <Eye className="w-4 h-4" style={{ color: '#9CA3AF' }} />}
                        </button>
                      </div>
                      {errors[key] && <p className="text-[10px] mt-0.5" style={{ color: '#E53935' }}>{errors[key]}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-3" style={{ background: 'rgba(79,180,210,0.08)', border: '1px solid rgba(79,180,210,0.2)' }}>
                <p className="text-[11px]" style={{ color: '#1976D2' }}>
                  El usuario tendrá acceso de tipo <strong>CLI</strong>. Solo el rol ANL puede registrar y gestionar usuarios.
                </p>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid #E0E6ED' }}>
              <button onClick={closeDrawer} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ border: '1px solid #E0E6ED', color: '#54606E' }}>
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={saved
                  ? { background: '#6FCF97', color: '#fff' }
                  : { background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff' }
                }
              >
                {saved ? '¡Usuario registrado!' : 'Registrar usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
