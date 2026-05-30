import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, Mic, Square } from 'lucide-react'
import Spline from '@splinetool/react-spline'
import api from '../../services/api'

const SPLINE_URL = 'https://prod.spline.design/QW6LFiXdNzkyAuVB/scene.splinecode'

// ── Avatar NIVI con parpadeo ──────────────────────────────────────────────────
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
              timerRef.current = setTimeout(() => { setParpadeando(false); programarParpadeo() }, 110)
            }, 200)
          } else { programarParpadeo() }
        }, 120)
      }, espera)
    }
    programarParpadeo()
    return () => clearTimeout(timerRef.current)
  }, [])
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0, borderRadius: '50%', overflow: 'hidden' }}>
      <img src="/NIVI 1.png" alt="NIVI" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: parpadeando ? 0 : 1, transition: 'opacity 55ms ease' }} />
      <img src="/NIVI 2.png" alt=""   style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: parpadeando ? 1 : 0, transition: 'opacity 55ms ease' }} />
    </div>
  )
}

// ── Markdown liviano ──────────────────────────────────────────────────────────
function MensajeMarkdown({ texto }) {
  const partes = texto.split('\n').map((linea, i) => {
    const bold = linea.split(/\*\*(.*?)\*\*/g).map((s, j) => j % 2 === 1 ? <strong key={j}>{s}</strong> : s)
    const esBullet = linea.trimStart().startsWith('- ') || linea.trimStart().startsWith('• ')
    if (esBullet) return <li key={i} className="ml-4 list-disc leading-relaxed">{bold}</li>
    if (linea.trim() === '') return <br key={i} />
    return <p key={i} className="leading-relaxed">{bold}</p>
  })
  return <div className="flex flex-col gap-0.5 text-base">{partes}</div>
}

// ── Formatea datos del dashboard ──────────────────────────────────────────────
function formatearContexto(stats, detalle, dpto, municipio) {
  const zona  = [dpto, municipio].filter(Boolean).join(' › ') || 'Colombia'
  const lines = [
    `Analiza los siguientes datos epidemiológicos del dashboard de vigilancia nutricional infantil en ${zona}:`,
    ``,
    `ESTADÍSTICAS GENERALES:`,
    `- Total casos: ${stats?.total?.toLocaleString() ?? 'N/D'} (BD: ${stats?.total_bd ?? 0}, histórico: ${stats?.total_historico ?? 0})`,
    `- Tasa de desnutrición (moderada+severa): ${stats?.tasa_desnutricion ?? 'N/D'}%`,
    `- Casos en riesgo: ${stats?.en_riesgo ?? 'N/D'}`,
  ]
  if (stats?.distribucion_estado?.length) {
    lines.push(``, `DISTRIBUCIÓN NUTRICIONAL:`)
    stats.distribucion_estado.forEach(e => {
      const pct = stats.total ? ((e.cantidad / stats.total) * 100).toFixed(1) : 0
      lines.push(`- ${e.estado}: ${e.cantidad} (${pct}%)`)
    })
  }
  if (detalle?.tasa_hospitalizacion != null) lines.push(``, `Hospitalización: ${detalle.tasa_hospitalizacion}%`)
  if (detalle?.crec_dllo) {
    const { tasa_sin } = detalle.crec_dllo
    lines.push(`Sin seguimiento C&D: ${tasa_sin}%${tasa_sin > 30 ? ' ⚠ crítico' : ''}`)
  }
  if (detalle?.por_sexo?.length) {
    lines.push(``, `POR SEXO:`)
    detalle.por_sexo.forEach(s => {
      const tasa = s.total ? (((s.severo + s.moderado) / s.total) * 100).toFixed(1) : 0
      lines.push(`- ${s.label}: ${s.total} casos, desnut. ${tasa}%`)
    })
  }
  if (detalle?.por_grupo_etario?.length) {
    lines.push(``, `POR GRUPO ETARIO:`)
    detalle.por_grupo_etario.forEach(g => lines.push(`- ${g.grupo}: ${g.total} casos, desnut. ${g.tasa}%`))
  }
  lines.push(``, `Dame un análisis interpretativo: alertas críticas, tendencias y acciones prioritarias.`)
  return lines.join('\n')
}

// ── Handle de redimensionado ──────────────────────────────────────────────────
function ResizeHandle({ onMouseDown }) {
  return (
    <div onMouseDown={onMouseDown} title="Arrastrar para redimensionar"
      style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, cursor: 'nwse-resize', zIndex: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 5 }}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M9 1L1 9" stroke="#CBD5E1" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M9 5L5 9" stroke="#CBD5E1" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ChatDashboard({
  stats, detalle, dpto, municipio,
  mensajes, setMensajes,
  analizado, setAnalizado,
  onClose,
}) {
  const [input,        setInput]       = useState('')
  const [cargando,     setCargando]    = useState(false)
  const [grabando,     setGrabando]    = useState(false)
  const [transcribiendo, setTranscrib] = useState(false)
  const [splineReady,  setSplineReady] = useState(false)
  const [size, setSize] = useState(() => ({
    w: Math.max(480, (typeof window !== 'undefined' ? window.innerWidth  : 900) - 40),
    h: Math.max(360, (typeof window !== 'undefined' ? window.innerHeight : 700) - 110),
  }))
  const resizeDrag = useRef(null)

  function onResizeStart(e) {
    e.preventDefault()
    resizeDrag.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h }
    function onMove(ev) {
      if (!resizeDrag.current) return
      setSize({ w: Math.max(420, resizeDrag.current.startW + ev.clientX - resizeDrag.current.startX), h: Math.max(320, resizeDrag.current.startH + ev.clientY - resizeDrag.current.startY) })
    }
    function onUp() { resizeDrag.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
  }

  const endRef     = useRef(null)
  const inputRef   = useRef(null)
  const recorderRef  = useRef(null)
  const chunksRef    = useRef([])
  const streamRef    = useRef(null)
  const analyserRef  = useRef(null)
  const audioCtxRef  = useRef(null)
  const animFrameRef = useRef(null)
  const smoothRef    = useRef(0)
  const splineAppRef = useRef(null)
  const splineObjs   = useRef([])

  const zona = [dpto, municipio].filter(Boolean).join(' › ') || 'Colombia'

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes, cargando])

  // Análisis inicial automático
  useEffect(() => {
    if (analizado) { setTimeout(() => inputRef.current?.focus(), 150); return }
    async function analisisInicial() {
      setCargando(true)
      try {
        const { data } = await api.post('/chat', { mensaje: formatearContexto(stats, detalle, dpto, municipio), historial: [] })
        setMensajes([{ role: 'assistant', content: data.respuesta }])
        setAnalizado(true)
      } catch {
        setMensajes([{ role: 'assistant', content: 'No pude generar el análisis. Puedes preguntarme directamente sobre los datos del dashboard.' }])
        setAnalizado(true)
      } finally { setCargando(false); setTimeout(() => inputRef.current?.focus(), 100) }
    }
    analisisInicial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Spline reactivo al audio
  useEffect(() => {
    if (grabando && splineReady) { smoothRef.current = 0; animarSpline() }
    return () => cancelAnimationFrame(animFrameRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grabando, splineReady])

  function onSplineLoad(app) {
    splineAppRef.current = app
    splineObjs.current = app.getAllObjects().map(obj => ({ obj, orig: { x: obj.scale.x, y: obj.scale.y, z: obj.scale.z } }))
    setSplineReady(true)
  }

  function animarSpline() {
    if (!analyserRef.current) { animFrameRef.current = requestAnimationFrame(animarSpline); return }
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    let sum = 0; const vr = Math.floor(data.length * 0.5)
    for (let i = 0; i < vr; i++) sum += data[i]
    const raw = sum / vr / 255
    const a = raw > smoothRef.current ? 0.18 : 0.06
    smoothRef.current += (raw - smoothRef.current) * a
    const mult = 1 + smoothRef.current * 0.40
    splineObjs.current.forEach(({ obj, orig }) => { obj.scale.x = orig.x * mult; obj.scale.y = orig.y * mult; obj.scale.z = orig.z * mult })
    animFrameRef.current = requestAnimationFrame(animarSpline)
  }

  function resetScales() { splineObjs.current.forEach(({ obj, orig }) => { obj.scale.x = orig.x; obj.scale.y = orig.y; obj.scale.z = orig.z }) }

  // Grabación de voz
  async function iniciarGrabacion() {
    if (cargando || transcribiendo) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream; chunksRef.current = []
      const AC = window.AudioContext ?? window['webkitAudioContext']
      const ctx = new AC(); const analyser = ctx.createAnalyser()
      analyser.fftSize = 256; analyser.smoothingTimeConstant = 0.6
      ctx.createMediaStreamSource(stream).connect(analyser)
      analyserRef.current = analyser; audioCtxRef.current = ctx
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = () => procesarAudio()
      rec.start(200); recorderRef.current = rec; setGrabando(true)
    } catch { alert('No se pudo acceder al micrófono. Verifica los permisos.') }
  }

  function detenerGrabacion() {
    cancelAnimationFrame(animFrameRef.current); resetScales()
    recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close().catch(() => {})
    analyserRef.current = null; setGrabando(false)
  }

  async function procesarAudio() {
    if (!chunksRef.current.length) return
    setTranscrib(true)
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const form = new FormData(); form.append('audio', blob, 'audio.webm')
      const { data } = await api.post('/chat/transcribir', form, { headers: { 'Content-Type': undefined } })
      if (data.texto) { setInput(data.texto); setTimeout(() => inputRef.current?.focus(), 50) }
    } catch (err) {
      setInput(`[Error: ${err.response?.data?.detail || 'No se pudo transcribir'}]`)
    } finally { setTranscrib(false) }
  }

  async function enviar() {
    const msg = input.trim()
    if (!msg || cargando) return
    setInput('')
    const hist = mensajes.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role, content: m.content }))
    setMensajes(prev => [...prev, { role: 'user', content: msg }])
    setCargando(true)
    try {
      const { data } = await api.post('/chat', { mensaje: msg, historial: hist.slice(-16) })
      setMensajes(prev => [...prev, { role: 'assistant', content: data.respuesta }])
    } catch {
      setMensajes(prev => [...prev, { role: 'assistant', content: 'Error al conectar. Intenta de nuevo.' }])
    } finally { setCargando(false) }
  }

  return (
    <>
      {/* Ventana flotante — mismo estilo que CLI */}
      <motion.div
        initial={{ opacity: 0, scale: 0, borderRadius: 28 }}
        animate={{ opacity: 1, scale: 1, borderRadius: 24 }}
        exit={{ opacity: 0, scale: 0, borderRadius: 28,
          transition: { type: 'spring', damping: 30, stiffness: 280, opacity: { duration: 0.15 } } }}
        transition={{ type: 'spring', damping: 26, stiffness: 180, opacity: { duration: 0.22 } }}
        className="fixed z-40 flex flex-col"
        style={{
          top: 20, left: 20,
          width: size.w, height: size.h,
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(79,180,210,0.14)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.07)',
          overflow: 'hidden',
          transformOrigin: `${window.innerWidth - 72}px ${window.innerHeight - 72}px`,
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-border flex items-center gap-3 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.9)' }}>
          <NiviAvatar size={46} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-neutral-text leading-none">NIVI</p>
            <p className="text-xs mt-1 font-medium" style={{ color: '#52C41A' }}>● Análisis epidemiológico · {zona}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-bg transition-colors text-neutral-sub">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 relative" style={{ minHeight: 0 }}>
          <div className="absolute inset-0 overflow-y-auto px-6 py-5 flex flex-col gap-3">

            {/* Carga inicial */}
            {cargando && mensajes.length === 0 && (
              <div className="flex gap-3 justify-start items-end">
                <NiviAvatar size={42} />
                <div className="px-5 py-4 rounded-2xl flex items-center gap-2"
                  style={{ background: '#F1F8FB', borderRadius: '4px 18px 18px 18px' }}>
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#4FB4D2' }} />
                  <span className="text-sm text-neutral-sub">NIVI está analizando el dashboard…</span>
                </div>
              </div>
            )}

            {/* Mensajes */}
            {mensajes.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && <div className="mt-0.5 flex-shrink-0"><NiviAvatar size={42} /></div>}
                <div className="px-5 py-4 rounded-2xl text-base"
                  style={m.role === 'user'
                    ? { background: 'linear-gradient(135deg,#4FB4D2,#3DA0BC)', color: '#fff', borderRadius: '18px 18px 4px 18px', maxWidth: '65%' }
                    : { background: '#F1F8FB', color: '#374151', borderRadius: '4px 18px 18px 18px', maxWidth: '80%' }
                  }>
                  {m.role === 'assistant' ? <MensajeMarkdown texto={m.content} /> : <p className="leading-relaxed">{m.content}</p>}
                </div>
              </div>
            ))}

            {/* Pensando */}
            {cargando && mensajes.length > 0 && (
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

          {/* Overlay Spline durante grabación */}
          <AnimatePresence>
            {grabando && (
              <motion.div
                key="spline"
                initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: '0%' }}
                exit={{ opacity: 0, y: '100%', transition: { duration: 0.3 } }}
                transition={{ type: 'spring', damping: 32, stiffness: 260 }}
                className="absolute inset-0"
                style={{ background: 'rgba(246,250,254,0.99)' }}>
                {!splineReady && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
                    <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#CBD5E1' }} />
                  </div>
                )}
                <motion.div style={{ width: '100%', height: '100%' }} animate={{ opacity: splineReady ? 1 : 0 }} transition={{ duration: 0.5 }}>
                  <Spline scene={SPLINE_URL} onLoad={onSplineLoad} style={{ width: '100%', height: '100%' }} />
                </motion.div>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom,rgba(246,250,254,1) 0%,rgba(246,250,254,0) 100%)', pointerEvents: 'none', zIndex: 5 }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to top,rgba(246,250,254,1) 0%,rgba(246,250,254,0) 100%)', pointerEvents: 'none', zIndex: 5 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input — idéntico al CLI */}
        <div className="px-6 py-4 border-t border-neutral-border flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.92)' }}>
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef} rows={1}
              value={transcribiendo ? '' : input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              placeholder={transcribiendo ? 'Transcribiendo audio…' : grabando ? 'Grabando…' : 'Pregunta sobre el dashboard… (Enter para enviar)'}
              disabled={cargando || grabando || transcribiendo}
              className="flex-1 input-clinical text-base resize-none overflow-hidden"
              style={{ minHeight: 40, maxHeight: 96, lineHeight: '1.5' }}
            />
            {/* Botón mic / stop */}
            <button
              onClick={grabando ? detenerGrabacion : iniciarGrabacion}
              disabled={cargando || transcribiendo}
              title={grabando ? 'Detener grabación' : 'Grabar mensaje de voz'}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={grabando
                ? { background: '#E53935', boxShadow: '0 0 14px rgba(229,57,53,0.4)' }
                : { background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
              {transcribiendo
                ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#4FB4D2' }} />
                : grabando
                  ? <Square className="w-4 h-4 text-white" fill="white" />
                  : <Mic className="w-4 h-4" style={{ color: '#64748B' }} />
              }
            </button>
            {/* Botón enviar */}
            <button onClick={enviar} disabled={!input.trim() || cargando || grabando || transcribiendo}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#4FB4D2,#3DA0BC)' }}>
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-neutral-sub mt-2 text-center">
            NIVI analiza datos epidemiológicos · Puedes hablar o escribir
          </p>
        </div>

        <ResizeHandle onMouseDown={onResizeStart} />
      </motion.div>
    </>
  )
}
