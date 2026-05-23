import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const bubbles = [
  { size: 520, x: '-14%', y: '-22%', color: '#4FB4D2', opacity: 0.28, blur: 60, duration: 11, delay: 0   },
  { size: 400, x: '60%',  y: '48%',  color: '#6FCF97', opacity: 0.24, blur: 55, duration: 14, delay: 1.5 },
  { size: 320, x: '72%',  y: '-20%', color: '#81D4EA', opacity: 0.22, blur: 50, duration: 9,  delay: 0.8 },
  { size: 280, x: '16%',  y: '62%',  color: '#4FB4D2', opacity: 0.24, blur: 50, duration: 12, delay: 2.2 },
  { size: 200, x: '40%',  y: '20%',  color: '#6EC6E0', opacity: 0.20, blur: 45, duration: 8,  delay: 0.4 },
]

const glassCard = {
  background: 'rgba(255, 255, 255, 0.22)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255, 255, 255, 0.45)',
  boxShadow: '0 8px 40px rgba(79, 180, 210, 0.18), inset 0 1px 0 rgba(255,255,255,0.55)',
  borderRadius: '24px',
}

const glassInput = {
  background: 'rgba(255, 255, 255, 0.55)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(255, 255, 255, 0.7)',
  borderRadius: '12px',
  outline: 'none',
  width: '100%',
  padding: '10px 14px',
  fontSize: '14px',
  color: '#1E293B',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [focused,  setFocused]  = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const demoUsers = {
    'cli@demo.pe':  { role: 'CLI', nombre: 'Dra. Ana Torres',    email: 'cli@demo.pe'  },
    'anl@demo.pe':  { role: 'ANL', nombre: 'Lic. Carlos Ramos',  email: 'anl@demo.pe'  },
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Acceso demo sin backend
    const demoUser = demoUsers[email.toLowerCase()]
    if (demoUser && password === 'demo1234') {
      login(demoUser, 'demo-token')
      navigate(demoUser.role === 'ANL' ? '/anl' : '/cli', { replace: true })
      return
    }

    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.user, data.token)
      navigate(data.user.role === 'ANL' ? '/anl' : '/cli', { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Credenciales incorrectas. Intenta de nuevo.'
      )
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (name) => ({
    ...glassInput,
    ...(focused === name
      ? { borderColor: 'rgba(79,180,210,0.8)', boxShadow: '0 0 0 3px rgba(79,180,210,0.18)' }
      : {}),
  })

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #EAF6FB, #F5FAFC)' }}
    >
      {/* Burbujas */}
      {bubbles.map(({ size, x, y, color, opacity, blur, duration, delay }, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{ width: size, height: size, left: x, top: y, background: color, opacity, filter: `blur(${blur}px)` }}
          animate={{ x: [0, 70, -50, 40, -30, 0], y: [0, -60, 45, -35, 30, 0], scale: [1, 1.08, 0.95, 1.06, 0.97, 1] }}
          transition={{ duration, delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm mx-4 px-8 py-10"
        style={glassCard}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/Logo.png" alt="Logo" className="w-12 h-12 object-contain mb-3" />
          <h1 className="text-xl font-bold text-neutral-text">Iniciar sesión</h1>
          <p className="text-xs text-neutral-sub mt-1 text-center">
            Accede con tus credenciales institucionales
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-neutral-sub mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused('')}
              placeholder="usuario@institución.pe"
              required
              style={inputStyle('email')}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-semibold text-neutral-sub mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
                placeholder="••••••••"
                required
                style={{ ...inputStyle('password'), paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-sub hover:text-neutral-text transition-colors"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-xs rounded-xl px-3 py-2"
              style={{
                background: 'rgba(229,57,53,0.10)',
                border: '1px solid rgba(229,57,53,0.25)',
                color: '#E53935',
              }}
            >
              {error}
            </p>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="clay-btn mt-1 flex items-center justify-center gap-2 text-white font-semibold py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Verificando...' : (
              <>
                Ingresar
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Volver */}
        <div className="mt-6 flex justify-center">
          <Link
            to="/"
            className="flex items-center gap-1 text-xs text-neutral-sub hover:text-neutral-text transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Volver al inicio
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
