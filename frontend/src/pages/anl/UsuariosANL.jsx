import { useState, useEffect } from 'react'
import { UserPlus, Search, ToggleLeft, ToggleRight, X, Eye, EyeOff, ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../../services/api'

const CARD = {
  background: 'rgba(255, 255, 255, 0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: 20,
  boxShadow: 'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.07), 0 4px 18px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.04)',
  padding: '20px 24px',
}

const emptyForm = { nombre: '', apellidos: '', email: '', establecimiento: '', password: '', confirm: '' }

function Toast({ msg, type }) {
  if (!msg) return null
  const ok = type === 'ok'
  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
      style={{
        background: ok ? 'rgba(111,207,151,0.15)' : 'rgba(229,57,53,0.1)',
        border: `1px solid ${ok ? 'rgba(111,207,151,0.4)' : 'rgba(229,57,53,0.3)'}`,
        color: ok ? '#1A6B3C' : '#B71C1C',
      }}
    >
      {ok
        ? <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#3DAB6B' }} />
        : <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#E53935' }} />
      }
      {msg}
    </div>
  )
}

export default function UsuariosANL() {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [query,      setQuery]      = useState('')
  const [showDrawer, setShowDrawer] = useState(false)
  const [form,       setForm]       = useState(emptyForm)
  const [showPass,   setShowPass]   = useState(false)
  const [errors,     setErrors]     = useState({})
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState({ msg: '', type: '' })
  const [toggling,   setToggling]   = useState(null) // id being toggled

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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const filtered = users.filter(u =>
    u.nombre?.toLowerCase().includes(query.toLowerCase()) ||
    u.email?.toLowerCase().includes(query.toLowerCase()) ||
    (u.establecimiento || '').toLowerCase().includes(query.toLowerCase())
  )

  async function toggleUser(id, current) {
    setToggling(id)
    try {
      await api.patch(`/usuarios/${id}/habilitar`, null, {
        params: { habilitado: !current },
      })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, habilitado: !current } : u))
      showToast(`Usuario ${!current ? 'habilitado' : 'inhabilitado'} correctamente`)
    } catch {
      showToast('No se pudo cambiar el estado del usuario', 'err')
    } finally {
      setToggling(null)
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
    if (form.password.length < 8)              e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirm)        e.confirm  = 'Las contraseñas no coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('/usuarios', {
        nombre:         form.nombre,
        apellidos:      form.apellidos,
        email:          form.email,
        password:       form.password,
        establecimiento: form.establecimiento || null,
      })
      showToast('Usuario CLI registrado exitosamente')
      closeDrawer()
      loadUsers()
    } catch (err) {
      const detail = err.response?.data?.detail || 'Error al registrar usuario'
      showToast(detail, 'err')
    } finally {
      setSaving(false)
    }
  }

  function closeDrawer() {
    setShowDrawer(false)
    setForm(emptyForm)
    setErrors({})
    setShowPass(false)
  }

  return (
    <div className="p-6 space-y-6 bg-neutral-bg min-h-screen">

      <Toast msg={toast.msg} type={toast.type} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1A1F2B' }}>Gestión de Usuarios CLI</h1>
          <p className="text-sm mt-0.5" style={{ color: '#54606E' }}>Administra el acceso del personal clínico a la plataforma</p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff', boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.45), inset 0 -3px 6px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)' }}
        >
          <UserPlus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Usuarios totales',  value: users.length,                         color: '#4FB4D2', bg: 'rgba(79,180,210,0.1)' },
          { label: 'Habilitados',       value: users.filter(u => u.habilitado).length, color: '#3DAB6B', bg: 'rgba(111,207,151,0.1)' },
          { label: 'Inhabilitados',     value: users.filter(u => !u.habilitado).length, color: '#E53935', bg: 'rgba(229,57,53,0.08)' },
        ].map(({ label, value, color, bg }) => (
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

        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-12 rounded-xl animate-pulse" style={{ background: '#F7F9FC' }} />
            ))}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
                  {['Nombre', 'Email', 'Establecimiento', 'Registrado', 'Estado', 'Acción'].map(h => (
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
                          {(u.nombre || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-semibold" style={{ color: '#1A1F2B' }}>{u.nombre}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-xs" style={{ color: '#54606E' }}>{u.email}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: '#54606E' }}>{u.establecimiento || '—'}</td>
                    <td className="py-3 px-3 text-xs" style={{ color: '#54606E' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('es-CO') : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="text-[11px] font-semibold"
                        style={u.habilitado
                          ? { color: '#3DAB6B' }
                          : { color: '#9CA3AF' }
                        }
                      >
                        {u.habilitado ? 'Habilitado' : 'Inhabilitado'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => toggleUser(u.id, u.habilitado)}
                        disabled={toggling === u.id}
                        className="flex items-center gap-1.5 text-xs font-medium transition-all"
                        style={{ color: u.habilitado ? '#E53935' : '#3DAB6B', opacity: toggling === u.id ? 0.5 : 1 }}
                      >
                        {toggling === u.id ? (
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : u.habilitado ? (
                          <><ToggleRight className="w-4 h-4" /> Inhabilitar</>
                        ) : (
                          <><ToggleLeft className="w-4 h-4" /> Habilitar</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="text-center py-10">
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  {users.length === 0 ? 'No hay usuarios CLI registrados aún' : 'No se encontraron usuarios'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-slate-900/30 backdrop-blur-[2px]" onClick={closeDrawer} />
          <div
            className="w-full max-w-md h-full overflow-y-auto flex flex-col"
            style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', boxShadow: '-4px 0 32px rgba(0,0,0,0.12), -2px 0 12px rgba(255,255,255,0.7)' }}
          >
            {/* Header */}
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
                {[{ key: 'nombre', label: 'Nombre(s)' }, { key: 'apellidos', label: 'Apellidos' }].map(({ key, label }) => (
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
                  placeholder="usuario@salud.gov.co"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: `1px solid ${errors.email ? '#E53935' : '#E0E6ED'}`, background: '#F7F9FC', color: '#1A1F2B' }}
                />
                {errors.email && <p className="text-[10px] mt-0.5" style={{ color: '#E53935' }}>{errors.email}</p>}
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#54606E' }}>
                  Establecimiento de salud <span style={{ color: '#9CA3AF' }}>(opcional)</span>
                </label>
                <input
                  type="text" value={form.establecimiento} onChange={e => setField('establecimiento', e.target.value)}
                  placeholder="Ej: E.S.E. Hospital San José"
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                  style={{ border: '1px solid #E0E6ED', background: '#F7F9FC', color: '#1A1F2B' }}
                />
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
                          {showPass
                            ? <EyeOff className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                            : <Eye    className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                          }
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

            {/* Footer */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid #E0E6ED' }}>
              <button
                onClick={closeDrawer}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.68)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.08)', color: '#54606E', boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.88), inset 0 -3px 5px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.05)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={saving
                  ? { background: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' }
                  : { background: 'linear-gradient(135deg, #6FCF97, #4FB4D2)', color: '#fff', boxShadow: 'inset 0 3px 8px rgba(255,255,255,0.45), inset 0 -3px 6px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08)' }
                }
              >
                {saving
                  ? <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Registrando...</>
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
