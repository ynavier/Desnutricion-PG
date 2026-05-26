import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, Mic, Square, UserCheck, UserX } from 'lucide-react'
import Spline from '@splinetool/react-spline'
import api from '../../services/api'

// ── Avatar de NIVI con parpadeo ──────────────────────────────────────────────
function NiviAvatar({ size = 36 }) {
  const [parpadeando, setParpadeando] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    function programarParpadeo() {
      const espera = 2000 + Math.random() * 3000
      timerRef.current = setTimeout(() => {
        setParpadeando(true)
        timerRef.current = setTimeout(() => {
          setParpadeando(false)
          if (Math.random() < 0.3) {
            timerRef.current = setTimeout(() => {
              setParpadeando(true)
              timerRef.current = setTimeout(() => {
                setParpadeando(false)
                programarParpadeo()
              }, 110)
            }, 200)
          } else {
            programarParpadeo()
          }
        }, 120)
      }, espera)
    }
    programarParpadeo()
    return () => clearTimeout(timerRef.current)
  }, [])

  return (
    <div style={{
      width: size, height: size,
      position: 'relative', flexShrink: 0,
      borderRadius: '50%', overflow: 'hidden',
    }}>
      <img
        src="/NIVI 1.png" alt="NIVI"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: parpadeando ? 0 : 1,
          transition: 'opacity 55ms ease',
        }}
      />
      <img
        src="/NIVI 2.png" alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: parpadeando ? 1 : 0,
          transition: 'opacity 55ms ease',
        }}
      />
    </div>
  )
}

// ── Markdown liviano ─────────────────────────────────────────────────────────
function MensajeMarkdown({ texto }) {
  const partes = texto.split('\n').map((linea, i) => {
    const conNegrita = linea.split(/\*\*(.*?)\*\*/g).map((seg, j) =>
      j % 2 === 1 ? <strong key={j}>{seg}</strong> : seg
    )
    const esBullet = linea.trimStart().startsWith('- ') || linea.trimStart().startsWith('• ')
    if (esBullet) return <li key={i} className="ml-4 list-disc leading-relaxed">{conNegrita}</li>
    if (linea.trim() === '') return <br key={i} />
    return <p key={i} className="leading-relaxed">{conNegrita}</p>
  })
  return <div className="flex flex-col gap-0.5 text-base">{partes}</div>
}

// ── Handle de redimensionado ─────────────────────────────────────────────────
function ResizeHandle({ onMouseDown }) {
  return (
    <div
      onMouseDown={onMouseDown}
      title="Arrastrar para redimensionar"
      style={{
        position: 'absolute', bottom: 0, right: 0,
        width: 22, height: 22,
        cursor: 'nwse-resize', zIndex: 20,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 5,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M9 1L1 9" stroke="#CBD5E1" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M9 5L5 9" stroke="#CBD5E1" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// ── Tarjetas de desambiguación ───────────────────────────────────────────────
function ESTADO_COLOR(estado) {
  if (!estado) return { bg: '#F1F5F9', text: '#64748B', dot: '#94A3B8' }
  const e = estado.toLowerCase()
  if (e.includes('severa'))   return { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' }
  if (e.includes('moderada')) return { bg: '#FFF7ED', text: '#C2410C', dot: '#FB923C' }
  if (e.includes('riesgo'))   return { bg: '#FFFBEB', text: '#B45309', dot: '#F59E0B' }
  if (e.includes('normal') || e.includes('adecuado')) return { bg: '#F0FDF4', text: '#15803D', dot: '#22C55E' }
  return { bg: '#F1F5F9', text: '#64748B', dot: '#94A3B8' }
}

function DisambiguacionCards({ pacientes, preguntaOriginal, onSeleccionar }) {
  return (
    <div className="flex gap-3 justify-start">
      <div className="mt-0.5 flex-shrink-0">
        <NiviAvatar size={42} />
      </div>
      <div style={{ maxWidth: '80%' }}>
        <div
          className="rounded-2xl px-5 py-4 text-base"
          style={{ background: '#F1F8FB', color: '#374151', borderRadius: '4px 18px 18px 18px' }}
        >
          <p className="font-semibold mb-3" style={{ color: '#1E3A5F' }}>
            Encontré varios pacientes con ese nombre. ¿Con cuál estás trabajando?
          </p>
          <div className="flex flex-col gap-2">
            {pacientes.map((p) => {
              const nombre = `${p.nombre} ${p.apellidos}`.trim()
              const edad   = p.edad_meses != null
                ? `${Math.floor(p.edad_meses / 12)}a ${p.edad_meses % 12}m`
                : '—'
              const col    = ESTADO_COLOR(p.estado_nutricional)
              return (
                <motion.button
                  key={p.id}
                  whileHover={{ scale: 1.015, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSeleccionar(p, preguntaOriginal)}
                  className="text-left w-full transition-all"
                  style={{
                    background:    'white',
                    border:        '1px solid rgba(79,180,210,0.20)',
                    borderRadius:  14,
                    padding:       '12px 14px',
                    boxShadow:     '0 2px 8px rgba(0,0,0,0.05)',
                    cursor:        'pointer',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: '#1E3A5F' }}>
                        {nombre}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                        {p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Femenino' : '—'} · {edad}
                        {p.municipio ? ` · ${p.municipio}` : ''}
                      </p>
                    </div>
                    {/* Chip estado nutricional */}
                    <div style={{
                      background:   col.bg,
                      color:        col.text,
                      borderRadius: 20,
                      padding:      '3px 10px',
                      fontSize:     11,
                      fontWeight:   600,
                      whiteSpace:   'nowrap',
                      flexShrink:   0,
                      display:      'flex',
                      alignItems:   'center',
                      gap:          5,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: col.dot, display: 'inline-block' }} />
                      {p.estado_nutricional || 'Sin control'}
                    </div>
                  </div>
                  {/* Métricas rápidas */}
                  {(p.peso || p.talla || p.zscore != null) && (
                    <div className="flex gap-4 mt-2" style={{ fontSize: 11, color: '#94A3B8' }}>
                      {p.peso  && <span>Peso: <strong style={{ color: '#475569' }}>{p.peso} kg</strong></span>}
                      {p.talla && <span>Talla: <strong style={{ color: '#475569' }}>{p.talla} cm</strong></span>}
                      {p.zscore != null && <span>Z-score: <strong style={{ color: '#475569' }}>{p.zscore}</strong></span>}
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
          <p className="text-xs mt-3" style={{ color: '#94A3B8' }}>
            Selecciona un paciente para continuar con tu consulta
          </p>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
const SUGERENCIAS = [
  'Paciente de 3 años con desnutrición severa y escasos recursos. ¿Qué manejo nutricional inicio?',
  '¿Cuáles son los criterios de hospitalización por desnutrición aguda severa según el MSPS?',
  '¿Cómo interpretar un z-score P/E de -3 en un niño de 18 meses?',
  '¿Qué suplementos micronutrientes indica el protocolo ICBF para desnutrición moderada?',
]

const SPLINE_URL = 'https://prod.spline.design/QW6LFiXdNzkyAuVB/scene.splinecode'

// ────────────────────────────────────────────────────────────────────────────
export default function ChatAsistente() {
  const [abierto, setAbierto]          = useState(false)
  const [mensajes, setMensajes]        = useState([])
  const [input, setInput]              = useState('')
  const [cargando, setCargando]        = useState(false)
  const [grabando, setGrabando]        = useState(false)
  const [transcribiendo, setTranscrib] = useState(false)
  const [splineReady, setSplineReady]  = useState(false)
  const [mostrarBurbuja, setMostrarBurbuja] = useState(false)
  // Paciente activo (contexto inyectado en cada mensaje)
  const [pacienteActivo, setPacienteActivo] = useState(null)

  const [size, setSize] = useState(() => ({
    w: Math.max(480, (typeof window !== 'undefined' ? window.innerWidth  : 900) - 40),
    h: Math.max(360, (typeof window !== 'undefined' ? window.innerHeight : 700) - 110),
  }))

  // ── Refs de UI ────────────────────────────────────────────────────────────
  const endRef        = useRef(null)
  const inputRef      = useRef(null)
  const resizeDrag    = useRef(null)
  const burbujaTimer  = useRef(null)

  // ── Refs de grabación ─────────────────────────────────────────────────────
  const recorderRef = useRef(null)
  const chunksRef   = useRef([])
  const streamRef   = useRef(null)

  // ── Refs de Web Audio ─────────────────────────────────────────────────────
  const analyserRef    = useRef(null)
  const audioCtxRef    = useRef(null)
  const animFrameRef   = useRef(null)
  const smoothLevelRef = useRef(0)

  // ── Refs de Spline ────────────────────────────────────────────────────────
  const splineAppRef     = useRef(null)
  const splineObjectsRef = useRef([])

  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  useEffect(() => {
    if (abierto) setTimeout(() => inputRef.current?.focus(), 150)
  }, [abierto])

  useEffect(() => {
    burbujaTimer.current = setTimeout(() => setMostrarBurbuja(true), 2500)
    return () => clearTimeout(burbujaTimer.current)
  }, [])

  useEffect(() => {
    if (abierto) setMostrarBurbuja(false)
  }, [abierto])

  useEffect(() => {
    if (grabando && splineReady) {
      smoothLevelRef.current = 0
      animarSpline()
    }
    return () => cancelAnimationFrame(animFrameRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grabando, splineReady])

  // ── Spline ────────────────────────────────────────────────────────────────
  function onSplineLoad(app) {
    splineAppRef.current = app
    const objs = app.getAllObjects()
    splineObjectsRef.current = objs.map(obj => ({
      obj,
      origScale: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z },
    }))
    setSplineReady(true)
  }

  function animarSpline() {
    if (!analyserRef.current) {
      animFrameRef.current = requestAnimationFrame(animarSpline)
      return
    }
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    let sum = 0
    const voiceRange = Math.floor(data.length * 0.5)
    for (let i = 0; i < voiceRange; i++) sum += data[i]
    const rawLevel = sum / voiceRange / 255
    const alpha = rawLevel > smoothLevelRef.current ? 0.18 : 0.06
    smoothLevelRef.current += (rawLevel - smoothLevelRef.current) * alpha
    const mult = 1 + smoothLevelRef.current * 0.40
    splineObjectsRef.current.forEach(({ obj, origScale }) => {
      obj.scale.x = origScale.x * mult
      obj.scale.y = origScale.y * mult
      obj.scale.z = origScale.z * mult
    })
    animFrameRef.current = requestAnimationFrame(animarSpline)
  }

  function resetScales() {
    splineObjectsRef.current.forEach(({ obj, origScale }) => {
      obj.scale.x = origScale.x
      obj.scale.y = origScale.y
      obj.scale.z = origScale.z
    })
  }

  // ── Redimensionado ────────────────────────────────────────────────────────
  function onResizeStart(e) {
    e.preventDefault()
    resizeDrag.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h }
    function onMove(ev) {
      if (!resizeDrag.current) return
      setSize({
        w: Math.max(420, resizeDrag.current.startW + ev.clientX - resizeDrag.current.startX),
        h: Math.max(320, resizeDrag.current.startH + ev.clientY - resizeDrag.current.startY),
      })
    }
    function onUp() {
      resizeDrag.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Grabación ─────────────────────────────────────────────────────────────
  async function iniciarGrabacion() {
    if (cargando || transcribiendo) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const AudioCtxClass = window.AudioContext ?? window['webkitAudioContext']
      const audioCtx = new AudioCtxClass()
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize               = 256
      analyser.smoothingTimeConstant = 0.6
      audioCtx.createMediaStreamSource(stream).connect(analyser)
      analyserRef.current = analyser
      audioCtxRef.current = audioCtx

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => procesarAudio()
      recorder.start(200)
      recorderRef.current = recorder

      setGrabando(true)
    } catch {
      alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.')
    }
  }

  function detenerGrabacion() {
    cancelAnimationFrame(animFrameRef.current)
    resetScales()
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close().catch(() => {})
    analyserRef.current = null
    setGrabando(false)
  }

  async function procesarAudio() {
    if (!chunksRef.current.length) return
    setTranscrib(true)
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const form = new FormData()
      form.append('audio', blob, 'audio.webm')
      const { data } = await api.post('/chat/transcribir', form, {
        headers: { 'Content-Type': undefined },
      })
      if (data.texto) {
        setInput(data.texto)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'No se pudo transcribir el audio.'
      setInput(`[Error: ${msg}]`)
    } finally {
      setTranscrib(false)
    }
  }

  // ── Selección de paciente desde tarjetas de desambiguación ────────────────
  function seleccionarPaciente(paciente, preguntaOriginal) {
    const ctx = {
      nombre:            `${paciente.nombre} ${paciente.apellidos}`.trim(),
      edad_meses:        paciente.edad_meses,
      sexo:              paciente.sexo,
      estado_nutricional: paciente.estado_nutricional,
      peso:              paciente.peso,
      talla:             paciente.talla,
      imc:               paciente.imc,
      zscore:            paciente.zscore,
    }
    setPacienteActivo(ctx)
    // Reenviar la pregunta original con el contexto ya establecido
    enviarConContexto(preguntaOriginal, ctx)
  }

  // ── Envío de mensaje ──────────────────────────────────────────────────────
  async function enviarConContexto(texto, ctx) {
    if (!texto || cargando) return
    const historialPrevio = mensajes
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))
    setMensajes(prev => [...prev, { role: 'user', content: texto }])
    setCargando(true)
    try {
      const { data } = await api.post('/chat', {
        mensaje:           texto,
        historial:         historialPrevio.slice(-18),
        contexto_paciente: ctx ?? null,
      })

      if (data.tipo === 'disambiguacion') {
        setMensajes(prev => [...prev, {
          role:             'disambiguation',
          pacientes:        data.pacientes,
          preguntaOriginal: data.pregunta_original,
        }])
      } else {
        setMensajes(prev => [...prev, { role: 'assistant', content: data.respuesta }])
      }
    } catch {
      setMensajes(prev => [...prev, {
        role:    'assistant',
        content: 'No pude conectar con el asistente en este momento. Por favor intenta de nuevo.',
      }])
    } finally {
      setCargando(false)
    }
  }

  async function enviar(textoDirecto) {
    const msg = (textoDirecto ?? input).trim()
    if (!msg || cargando) return
    setInput('')
    await enviarConContexto(msg, pacienteActivo)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Burbuja de pensamiento ─────────────────────────────────── */}
      <AnimatePresence>
        {!abierto && mostrarBurbuja && (
          <motion.div
            initial={{ opacity: 0, scale: 0.75, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.75, y: 12 }}
            transition={{ type: 'spring', damping: 18, stiffness: 200 }}
            className="fixed z-50 cursor-pointer select-none"
            style={{ bottom: 92, right: 24 }}
            onClick={() => { setMostrarBurbuja(false); setAbierto(true) }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div style={{
                background:    'white',
                borderRadius:  20,
                padding:       '11px 18px',
                boxShadow:     '0 8px 28px rgba(0,0,0,0.11), 0 2px 8px rgba(79,180,210,0.14)',
                border:        '1px solid rgba(79,180,210,0.20)',
                fontSize:      14,
                fontWeight:    500,
                color:         '#374151',
                whiteSpace:    'nowrap',
                lineHeight:    1.4,
              }}>
                ¿Puedo ayudarte en algo?
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 4, marginTop: 5, paddingRight: 14 }}>
                {[8, 5, 3].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.12 + i * 0.08, type: 'spring', damping: 14 }}
                    style={{
                      width: s, height: s,
                      borderRadius: '50%',
                      background:   'white',
                      boxShadow:    '0 2px 6px rgba(0,0,0,0.10)',
                      border:       '1px solid rgba(79,180,210,0.22)',
                      flexShrink:   0,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Botón flotante ─────────────────────────────────────────── */}
      <motion.button
        onClick={() => setAbierto(v => !v)}
        whileHover={!abierto ? { scale: 1.08 } : {}}
        whileTap={!abierto ? { scale: 0.92 } : {}}
        animate={abierto ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
        style={{ background: 'white', border: '2px solid rgba(79,180,210,0.25)' }}
        title="Asistente NIVI"
      >
        <NiviAvatar size={48} />
      </motion.button>

      {/* ── Panel de chat ──────────────────────────────────────────── */}
      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ opacity: 0, scale: 0, borderRadius: 28 }}
            animate={{ opacity: 1, scale: 1, borderRadius: 24 }}
            exit={{    opacity: 0, scale: 0, borderRadius: 28,
              transition: {
                type: 'spring', damping: 30, stiffness: 280,
                opacity: { duration: 0.15, ease: 'easeIn' },
                borderRadius: { duration: 0.18 },
              },
            }}
            transition={{
              type: 'spring', damping: 26, stiffness: 180,
              opacity: { duration: 0.22, ease: 'easeOut' },
              borderRadius: { duration: 0.25 },
            }}
            className="fixed z-40 flex flex-col"
            style={{
              top: 20, left: 20,
              width: size.w, height: size.h,
              background:     'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(20px)',
              border:         '1px solid rgba(79,180,210,0.14)',
              boxShadow:      '0 32px 80px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.07)',
              overflow:       'hidden',
              transformOrigin: `${window.innerWidth - 72}px ${window.innerHeight - 72}px`,
            }}
          >
            {/* ── Header ──────────────────────────────────────────── */}
            <div
              className="px-6 py-4 border-b border-neutral-border flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.9)' }}
            >
              <div className="flex items-center gap-3">
                <NiviAvatar size={46} />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-neutral-text leading-none">NIVI</p>
                  <p className="text-xs mt-1 font-medium" style={{ color: '#52C41A' }}>
                    ● Asistente clínica en línea
                  </p>
                </div>
                <button onClick={() => setAbierto(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-bg transition-colors text-neutral-sub">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contexto de paciente activo */}
              <AnimatePresence>
                {pacienteActivo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                    exit={{    opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: 'rgba(79,180,210,0.08)', border: '1px solid rgba(79,180,210,0.20)' }}>
                      <UserCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#4FB4D2' }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold truncate block" style={{ color: '#1E3A5F' }}>
                          {pacienteActivo.nombre}
                        </span>
                        <span className="text-[10px]" style={{ color: '#64748B' }}>
                          {pacienteActivo.edad_meses != null
                            ? `${Math.floor(pacienteActivo.edad_meses / 12)}a ${pacienteActivo.edad_meses % 12}m`
                            : ''}
                          {pacienteActivo.estado_nutricional ? ` · ${pacienteActivo.estado_nutricional}` : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => setPacienteActivo(null)}
                        title="Quitar paciente del contexto"
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-colors hover:bg-red-50"
                        style={{ color: '#94A3B8' }}
                      >
                        <UserX className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Área de mensajes + overlay Spline ───────────────── */}
            <div className="flex-1 relative" style={{ minHeight: 0 }}>
              <div className="absolute inset-0 overflow-y-auto px-6 py-5 flex flex-col gap-3">

                {/* Saludo inicial */}
                {mensajes.length === 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <NiviAvatar size={42} />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm px-5 py-4 text-base text-neutral-sub leading-relaxed"
                        style={{ background: '#F1F8FB', maxWidth: '72%' }}>
                        Hola. Soy <strong className="text-neutral-text">NIVI</strong>, tu asistente
                        clínica de nutrición infantil. Puedo orientarte sobre manejo nutricional, criterios
                        diagnósticos, protocolos ICBF/MSPS y más. ¿Con qué paciente necesitas apoyo?
                      </div>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-neutral-sub mt-2">
                      Preguntas frecuentes
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {SUGERENCIAS.map(s => (
                        <button key={s} onClick={() => enviar(s)}
                          className="text-left text-sm px-4 py-3 rounded-xl transition-all hover:shadow-sm"
                          style={{ background: 'rgba(79,180,210,0.06)', border: '1px solid rgba(79,180,210,0.16)', color: '#2A7A9A' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensajes del chat */}
                {mensajes.map((m, i) => {
                  if (m.role === 'disambiguation') {
                    return (
                      <DisambiguacionCards
                        key={i}
                        pacientes={m.pacientes}
                        preguntaOriginal={m.preguntaOriginal}
                        onSeleccionar={seleccionarPaciente}
                      />
                    )
                  }
                  return (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'assistant' && (
                        <div className="mt-0.5 flex-shrink-0">
                          <NiviAvatar size={42} />
                        </div>
                      )}
                      <div className="px-5 py-4 rounded-2xl text-base"
                        style={m.role === 'user'
                          ? { background: 'linear-gradient(135deg, #4FB4D2, #3DA0BC)', color: '#fff',    borderRadius: '18px 18px 4px 18px', maxWidth: '65%' }
                          : { background: '#F1F8FB',                                   color: '#374151', borderRadius: '4px 18px 18px 18px', maxWidth: '75%' }
                        }>
                        {m.role === 'assistant'
                          ? <MensajeMarkdown texto={m.content} />
                          : <p className="leading-relaxed">{m.content}</p>
                        }
                      </div>
                    </div>
                  )
                })}

                {/* Indicador de carga */}
                {cargando && (
                  <div className="flex gap-3 justify-start items-end">
                    <NiviAvatar size={42} />
                    <div className="px-5 py-4 rounded-2xl flex items-center gap-2"
                      style={{ background: '#F1F8FB', borderRadius: '4px 18px 18px 18px' }}>
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#4FB4D2' }} />
                      <span className="text-sm text-neutral-sub">NIVI está pensando…</span>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* ── Overlay Spline reactivo ──────────────────────── */}
              <AnimatePresence>
                {grabando && (
                  <motion.div
                    key="spline-overlay"
                    initial={{ opacity: 0, y: '100%' }}
                    animate={{ opacity: 1, y: '0%'   }}
                    exit={{ opacity: 0, y: '100%', transition: { duration: 0.30, ease: [0.4, 0, 0.2, 1] } }}
                    transition={{ type: 'spring', damping: 32, stiffness: 260 }}
                    className="absolute inset-0"
                    style={{ background: 'rgba(246, 250, 254, 0.99)' }}
                  >
                    {!splineReady && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
                        <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#CBD5E1' }} />
                      </div>
                    )}
                    <motion.div
                      style={{ width: '100%', height: '100%' }}
                      animate={{ opacity: splineReady ? 1 : 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Spline
                        scene={SPLINE_URL}
                        onLoad={onSplineLoad}
                        style={{ width: '100%', height: '100%' }}
                      />
                    </motion.div>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 120,
                      background: 'linear-gradient(to bottom, rgba(246,250,254,1) 0%, rgba(246,250,254,0) 100%)',
                      pointerEvents: 'none', zIndex: 5,
                    }} />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
                      background: 'linear-gradient(to top, rgba(246,250,254,1) 0%, rgba(246,250,254,0) 100%)',
                      pointerEvents: 'none', zIndex: 5,
                    }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Input ────────────────────────────────────────────── */}
            <div className="px-6 py-4 border-t border-neutral-border flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.92)' }}>
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={transcribiendo ? '' : input}
                  onChange={e => {
                    setInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
                  placeholder={
                    transcribiendo ? 'Transcribiendo audio…'
                    : grabando     ? 'Grabando…'
                    :                'Pregunta sobre nutrición infantil… (Enter para enviar)'
                  }
                  disabled={cargando || grabando || transcribiendo}
                  className="flex-1 input-clinical text-base resize-none overflow-hidden"
                  style={{ minHeight: 40, maxHeight: 96, lineHeight: '1.5' }}
                />
                <button
                  onClick={grabando ? detenerGrabacion : iniciarGrabacion}
                  disabled={cargando || transcribiendo}
                  title={grabando ? 'Detener grabación' : 'Grabar mensaje de voz'}
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                  style={grabando
                    ? { background: '#E53935', boxShadow: '0 0 14px rgba(229,57,53,0.4)' }
                    : { background: '#F1F5F9', border: '1px solid #E2E8F0' }
                  }>
                  {transcribiendo
                    ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#4FB4D2' }} />
                    : grabando
                      ? <Square className="w-4 h-4 text-white" fill="white" />
                      : <Mic className="w-4 h-4" style={{ color: '#64748B' }} />
                  }
                </button>
                <button
                  onClick={() => enviar()}
                  disabled={!input.trim() || cargando || grabando || transcribiendo}
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #4FB4D2, #3DA0BC)' }}>
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-[10px] text-neutral-sub mt-2 text-center">
                NIVI es una herramienta de apoyo clínico, no reemplaza el criterio médico.
              </p>
            </div>

            <ResizeHandle onMouseDown={onResizeStart} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
