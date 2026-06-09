import { useState, useRef, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SidebarANL    from '../../components/anl/SidebarANL'
import HomeANL       from './HomeANL'
import ReportesANL   from './ReportesANL'
import ChatDashboard from '../../components/anl/ChatDashboard'

function NiviAvatarFloat({ size = 36 }) {
  const [parpadeando, setParpadeando] = useState(false)
  const timerRef = useRef(null)
  useEffect(() => {
    function tick() {
      timerRef.current = setTimeout(() => {
        setParpadeando(true)
        timerRef.current = setTimeout(() => { setParpadeando(false); tick() }, 120)
      }, 2000 + Math.random() * 3000)
    }
    tick()
    return () => clearTimeout(timerRef.current)
  }, [])
  return (
    <div style={{ width: size, height: size, position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
      <img src="/NIVI 1.png" alt="NIVI" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: parpadeando ? 0 : 1, transition: 'opacity 55ms ease' }} />
      <img src="/NIVI 2.png" alt=""    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: parpadeando ? 1 : 0, transition: 'opacity 55ms ease' }} />
    </div>
  )
}

export default function DashboardANL() {
  const [niviAbierto,   setNiviAbierto]   = useState(false)
  const [niviMensajes,  setNiviMensajes]  = useState([])
  const [niviAnalizado, setNiviAnalizado] = useState(false)

  return (
    <div className="flex min-h-screen bg-neutral-bg">
      <SidebarANL />
      <main className="flex-1 md:ml-60 min-h-screen pt-14 md:pt-0">
        <Routes>
          <Route index           element={<HomeANL />} />
          <Route path="reportes" element={<ReportesANL />} />
        </Routes>
      </main>

      {/* ── Botón flotante NIVI ─────────────────────────────── */}
      <motion.button
        onClick={() => setNiviAbierto(v => !v)}
        animate={niviAbierto ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
        whileHover={!niviAbierto ? { scale: 1.08 } : {}}
        whileTap={!niviAbierto  ? { scale: 0.92 } : {}}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
        style={{ background: 'white', border: '2px solid rgba(79,180,210,0.25)' }}
        title="Asistente NIVI"
      >
        <NiviAvatarFloat size={48} />
      </motion.button>

      {/* ── Panel NIVI ──────────────────────────────────────── */}
      <AnimatePresence>
        {niviAbierto && (
          <ChatDashboard
            stats={null} detalle={null} dpto="" municipio=""
            mensajes={niviMensajes}   setMensajes={setNiviMensajes}
            analizado={niviAnalizado} setAnalizado={setNiviAnalizado}
            onClose={() => setNiviAbierto(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
