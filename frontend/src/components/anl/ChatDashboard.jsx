import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2 } from 'lucide-react'
import api from '../../services/api'

// ── Avatar NIVI con parpadeo (idéntico al CLI) ────────────────────────────────
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

// ── Markdown liviano (idéntico al CLI) ────────────────────────────────────────
function MensajeMarkdown({ texto }) {
  const partes = texto.split('\n').map((linea, i) => {
    const bold = linea.split(/\*\*(.*?)\*\*/g).map((s, j) =>
      j % 2 === 1 ? <strong key={j}>{s}</strong> : s
    )
    const esBullet = linea.trimStart().startsWith('- ') || linea.trimStart().startsWith('• ')
    if (esBullet) return <li key={i} className="ml-4 list-disc leading-relaxed">{bold}</li>
    if (linea.trim() === '') return <br key={i} />
    return <p key={i} className="leading-relaxed">{bold}</p>
  })
  return <div className="flex flex-col gap-0.5 text-base">{partes}</div>
}

// ── Formatea datos del dashboard como mensaje ─────────────────────────────────
function formatearContexto(stats, detalle, dpto, municipio) {
  const zona  = [dpto, municipio].filter(Boolean).join(' › ') || 'Colombia'
  const lines = [
    `Analiza los siguientes datos epidemiológicos del dashboard de vigilancia nutricional infantil en ${zona}:`,
    ``,
    `ESTADÍSTICAS GENERALES:`,
    `- Total casos: ${stats?.total?.toLocaleString() ?? 'N/D'} (BD actual: ${stats?.total_bd ?? 0}, histórico SIVIGILA: ${stats?.total_historico ?? 0})`,
    `- Tasa de desnutrición (severa + moderada): ${stats?.tasa_desnutricion ?? 'N/D'}%`,
    `- Casos en riesgo nutricional: ${stats?.en_riesgo ?? 'N/D'}`,
  ]
  if (stats?.distribucion_estado?.length) {
    lines.push(``, `DISTRIBUCIÓN NUTRICIONAL:`)
    stats.distribucion_estado.forEach(e => {
      const pct = stats.total ? ((e.cantidad / stats.total) * 100).toFixed(1) : 0
      lines.push(`- ${e.estado}: ${e.cantidad} casos (${pct}%)`)
    })
  }
  if (stats?.distribucion_area?.length) {
    lines.push(``, `ÁREA: ${stats.distribucion_area.map(a => `${a.name} ${a.value}%`).join(', ')}`)
  }
  if (detalle?.tasa_hospitalizacion != null)
    lines.push(``, `INDICADORES: Hospitalización ${detalle.tasa_hospitalizacion}%`)
  if (detalle?.crec_dllo) {
    const { tasa_sin } = detalle.crec_dllo
    lines.push(`- Sin seguimiento crec. y desarrollo: ${tasa_sin}% ${tasa_sin > 30 ? '(⚠ crítico)' : ''}`)
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
    detalle.por_grupo_etario.forEach(g =>
      lines.push(`- ${g.grupo}: ${g.total} casos, desnut. ${g.tasa}%`)
    )
  }
  if (detalle?.por_estrato?.length) {
    lines.push(``, `POR ESTRATO:`)
    detalle.por_estrato.forEach(e =>
      lines.push(`- ${e.label}: ${e.total} casos, desnut. ${e.tasa}%`)
    )
  }
  lines.push(``, `Dame un análisis interpretativo: alertas críticas, tendencias y acciones prioritarias de intervención.`)
  return lines.join('\n')
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ChatDashboard({
  stats, detalle, dpto, municipio,
  mensajes, setMensajes,
  analizado, setAnalizado,
  onClose,
}) {
  const [input,    setInput]    = useState('')
  const [cargando, setCargando] = useState(false)
  const endRef   = useRef(null)
  const inputRef = useRef(null)
  const zona = [dpto, municipio].filter(Boolean).join(' › ') || 'Colombia'

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  useEffect(() => {
    if (analizado) {
      // Conversación existente — solo enfoca el input
      setTimeout(() => inputRef.current?.focus(), 150)
      return
    }
    // Primera apertura — análisis automático
    async function analisisInicial() {
      setCargando(true)
      try {
        const { data } = await api.post('/chat', {
          mensaje:   formatearContexto(stats, detalle, dpto, municipio),
          historial: [],
        })
        setMensajes([{ role: 'assistant', content: data.respuesta }])
        setAnalizado(true)
      } catch {
        setMensajes([{ role: 'assistant', content: 'No pude generar el análisis. Puedes preguntarme directamente sobre los datos del dashboard.' }])
        setAnalizado(true)
      } finally {
        setCargando(false)
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
    analisisInicial()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function enviar() {
    const msg = input.trim()
    if (!msg || cargando) return
    setInput('')
    const historialPrevio = mensajes
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }))
    setMensajes(prev => [...prev, { role: 'user', content: msg }])
    setCargando(true)
    try {
      const { data } = await api.post('/chat', {
        mensaje:   msg,
        historial: historialPrevio.slice(-16),
      })
      setMensajes(prev => [...prev, { role: 'assistant', content: data.respuesta }])
    } catch {
      setMensajes(prev => [...prev, { role: 'assistant', content: 'Error al conectar. Intenta de nuevo.' }])
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel — mismo estilo que el CLI */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 200 }}
        className="fixed right-0 top-0 h-screen z-50 flex flex-col"
        style={{
          width: 'min(540px, 96vw)',
          background:     'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          border:         '1px solid rgba(79,180,210,0.14)',
          boxShadow:      '-8px 0 40px rgba(0,0,0,0.12)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-neutral-border flex items-center gap-3 flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.9)' }}>
          <NiviAvatar size={46} />
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-neutral-text leading-none">NIVI</p>
            <p className="text-xs mt-1 font-medium" style={{ color: '#52C41A' }}>
              ● Análisis epidemiológico · {zona}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-bg transition-colors text-neutral-sub">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Mensajes ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-3" style={{ minHeight: 0 }}>

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
              {m.role === 'assistant' && (
                <div className="mt-0.5 flex-shrink-0"><NiviAvatar size={42} /></div>
              )}
              <div className="px-5 py-4 rounded-2xl text-base"
                style={m.role === 'user'
                  ? { background: 'linear-gradient(135deg,#4FB4D2,#3DA0BC)', color: '#fff', borderRadius: '18px 18px 4px 18px', maxWidth: '65%' }
                  : { background: '#F1F8FB', color: '#374151', borderRadius: '4px 18px 18px 18px', maxWidth: '80%' }
                }>
                {m.role === 'assistant'
                  ? <MensajeMarkdown texto={m.content} />
                  : <p className="leading-relaxed">{m.content}</p>
                }
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

        {/* ── Input ───────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-neutral-border flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.92)' }}>
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              placeholder="Pregunta sobre los datos del dashboard… (Enter para enviar)"
              disabled={cargando}
              className="flex-1 input-clinical text-base resize-none overflow-hidden"
              style={{ minHeight: 40, maxHeight: 96, lineHeight: '1.5' }}
            />
            <button onClick={enviar} disabled={!input.trim() || cargando}
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#4FB4D2,#3DA0BC)' }}>
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-[10px] text-neutral-sub mt-2 text-center">
            NIVI analiza datos epidemiológicos · Pide recomendaciones y planes de acción
          </p>
        </div>
      </motion.div>
    </>
  )
}
