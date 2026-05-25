import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'framer-motion'
import {
  Activity,
  Bell,
  BarChart3,
  Users,
  ShieldCheck,
  FileText,
  ChevronRight,
  Menu,
  X,
  Brain,
  AlertTriangle,
  Clock,
  Leaf,
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07 },
  }),
}

const features = [
  {
    icon: Activity,
    title: 'Evaluación antropométrica',
    description:
      'Registro de peso, talla e IMC para calcular índices P/E, T/E y P/T según estándares OMS en menores de 5 años.',
  },
  {
    icon: ShieldCheck,
    title: 'Clasificación del estado nutricional',
    description:
      'Clasificación automática en: adecuado, riesgo, desnutrición leve, moderada o severa basada en puntajes Z.',
  },
  {
    icon: Bell,
    title: 'Alertas de riesgo nutricional',
    description:
      'Notificaciones cuando un niño presenta tendencia negativa de peso, talla estancada o caída de curva de crecimiento.',
  },
  {
    icon: BarChart3,
    title: 'Vigilancia epidemiológica',
    description:
      'Distribución de casos por zona geográfica, grupo etario y tipo de desnutrición para identificar poblaciones vulnerables.',
  },
  {
    icon: Users,
    title: 'Historial nutricional',
    description:
      'Seguimiento longitudinal de la evolución de cada niño con controles anteriores, diagnósticos y recomendaciones.',
  },
  {
    icon: FileText,
    title: 'Reportes de salud pública',
    description:
      'Generación de informes de prevalencia, tendencias e incidencia de desnutrición para organismos de salud.',
  },
]

// ─── Secciones ────────────────────────────────────────────────────────────────

const navLinks = [
  { label: 'Introducción',    href: '#intro' },
  { label: 'Desnutrición',    href: '#desnutricion' },
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Plataforma',      href: '#roles' },
]

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white border-b border-neutral-border shadow-sm transition-all duration-300">
      <div className="relative w-full px-3 sm:px-4 flex items-center justify-between" style={{ height: '60px' }}>
        {/* Logo — izquierda */}
        <div className="flex items-center gap-2">
          <img src="/Logo.png" alt="Logo" className="w-12 h-12 object-contain" />
          <span className="text-lg font-bold tracking-wide">
            <span style={{ color: '#1A1F2B' }}>NI</span>
            <span style={{ color: '#4FB4D2' }}>VI</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map(({ label, href }) => (
              <a key={href} href={href} className="text-sm text-neutral-sub hover:text-neutral-text transition-colors">
                {label}
              </a>
            ))}
          </nav>

          <Link
            to="/login"
            className="hidden md:flex items-center gap-1 text-sm font-medium text-clinical-blue-md hover:text-clinical-blue transition-colors"
          >
            Ingresar
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          <button
            className="md:hidden w-9 h-9 flex items-center justify-center text-neutral-sub hover:text-neutral-text transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menú móvil — alineado a la derecha */}
      {open && (
        <div className="md:hidden absolute right-4 top-[60px] bg-white border border-neutral-border rounded-xl shadow-lg py-3 px-5 flex flex-col gap-3 min-w-[180px]">
          {navLinks.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="text-sm text-neutral-sub hover:text-neutral-text transition-colors"
              onClick={() => setOpen(false)}
            >
              {label}
            </a>
          ))}
          <div className="border-t border-neutral-border pt-3 mt-1">
            <Link
              to="/login"
              className="flex items-center gap-1 text-sm font-medium text-clinical-blue-md hover:text-clinical-blue transition-colors"
              onClick={() => setOpen(false)}
            >
              Ingresar
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

const bubbles = [
  { size: 560, x: '-12%', y: '-18%', color: '#4FB4D2', opacity: 0.28, blur: 60, duration: 10, delay: 0    },
  { size: 420, x: '62%',  y: '45%',  color: '#6FCF97', opacity: 0.24, blur: 55, duration: 13, delay: 1.5  },
  { size: 340, x: '78%',  y: '-22%', color: '#81D4EA', opacity: 0.22, blur: 50, duration: 9,  delay: 0.8  },
  { size: 300, x: '18%',  y: '60%',  color: '#4FB4D2', opacity: 0.24, blur: 50, duration: 11, delay: 2.5  },
  { size: 240, x: '42%',  y: '25%',  color: '#6EC6E0', opacity: 0.20, blur: 45, duration: 8,  delay: 0.3  },
]

function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-start overflow-hidden pt-[60px] bg-gradient-to-b from-clinical-blue-lt to-neutral-bg">
      {/* Burbujas animadas */}
      <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden" style={{ zIndex: 0 }}>
        <img
          src="/1.jpeg"
          alt="Fondo"
          className="h-full w-full object-cover"
          style={{
            borderTopLeftRadius: '240px',
            borderBottomLeftRadius: '240px',
            maskImage: 'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,1) 38%)',
            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,0), rgba(0,0,0,1) 38%)',
          }}
        />
      </div>
      {bubbles.map(({ size, x, y, color, opacity, blur, duration, delay }, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size,
            height: size,
            left: x,
            top: y,
            background: color,
            opacity,
            filter: `blur(${blur}px)`,
          }}
          animate={{
            x: [0, 90, -60, 50, -40, 0],
            y: [0, -75, 55, -45, 35, 0],
            scale: [1, 1.1, 0.94, 1.08, 0.96, 1],
          }}
          transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      <div className="relative z-10 w-7/12 pl-16 md:pl-24 lg:pl-40 pr-6 text-left">
        <motion.h1
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#1E293B] leading-[1.1] tracking-tight mb-6"
        >
          Detección temprana
          <br />
          <span className="bg-gradient-to-r from-[#4FB4D2] to-[#6EC6E0] bg-clip-text text-transparent">
            de desnutrición infantil
          </span>
        </motion.h1>

        <motion.p
          custom={1}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-neutral-sub text-base leading-relaxed mb-10 max-w-xl"
        >
          Sistema de apoyo clínico para identificar, clasificar y prevenir la desnutrición
          en niños menores de 5 años mediante análisis predictivo basado en indicadores antropométricos.
        </motion.p>

        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <Link
            to="/login"
            className="clay-btn inline-flex items-center gap-3 text-white font-semibold px-8 py-4 transition-colors duration-200 text-base"
          >
            Acceder
            <ChevronRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>

      {/* Fade hacia la siguiente sección */}
      <div className="absolute bottom-0 inset-x-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #F5FAFC)' }}
      />
    </section>
  )
}

function PhotoFrame() {
  return (
    <div className="relative flex items-center justify-center py-10" style={{ overflow: 'visible' }}>

      {/* Manchas — tamaños en % del contenedor para ser responsive */}
      <div className="absolute pointer-events-none" style={{
        width: '90%', height: '90%',
        top: '-8%', left: '-6%',
        background: '#4FB4D2', opacity: 0.15,
        borderRadius: '62% 38% 46% 54% / 60% 44% 56% 40%',
        filter: 'blur(3px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        width: '70%', height: '68%',
        bottom: '-6%', right: '-4%',
        background: '#6FCF97', opacity: 0.18,
        borderRadius: '40% 60% 55% 45% / 50% 62% 38% 50%',
        filter: 'blur(3px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        width: '52%', height: '50%',
        top: '-4%', right: '-2%',
        background: '#81D4EA', opacity: 0.12,
        borderRadius: '55% 45% 38% 62% / 48% 58% 42% 52%',
        filter: 'blur(2px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        width: '44%', height: '42%',
        bottom: '4%', left: '-3%',
        background: '#6FCF97', opacity: 0.14,
        borderRadius: '70% 30% 60% 40% / 40% 65% 35% 60%',
        filter: 'blur(2px)',
      }} />
      <div className="absolute pointer-events-none" style={{
        width: '34%', height: '32%',
        top: '36%', right: '-4%',
        background: '#4FB4D2', opacity: 0.11,
        borderRadius: '45% 55% 70% 30% / 55% 40% 60% 45%',
        filter: 'blur(2px)',
      }} />

      {/* Foto — responsive con max-width */}
      <div className="relative z-10 w-full max-w-sm mx-auto" style={{ borderRadius: '30%', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', aspectRatio: '1' }}>
        <img
          src="/NinoComiendo.jpg"
          alt="Niño comiendo"
          className="w-full h-full object-cover"
        />
      </div>

    </div>
  )
}

function Intro() {
  return (
    <section id="intro" className="relative py-32 bg-neutral-bg">
      <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-20 items-center">

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2 className="text-4xl font-bold text-neutral-text leading-snug mb-6">
            Un sistema diseñado para actuar antes de que sea tarde
          </h2>
          <p className="text-neutral-sub text-base leading-relaxed mb-5">
            La desnutrición infantil en menores de 5 años no siempre es visible a simple vista.
            Se manifiesta gradualmente a través de indicadores como el peso, la talla y la edad,
            y sus consecuencias —retraso cognitivo, vulnerabilidad inmunológica, mortalidad— son
            irreversibles si no se detectan a tiempo.
          </p>
          <p className="text-neutral-sub text-base leading-relaxed mb-10">
            NutriVigilancia Infantil cruza los datos clínicos de cada niño con modelos predictivos
            entrenados sobre patrones reales de desnutrición, permitiendo al personal de salud
            identificar casos de riesgo antes de que el deterioro nutricional sea severo.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/login"
              className="clay-btn inline-flex items-center gap-2 text-white font-medium px-6 py-3 transition-colors duration-200 text-base"
            >
              Acceder al sistema
              <ChevronRight className="w-4 h-4" />
            </Link>
            <a
              href="#funcionalidades"
              className="clay-btn-outline inline-flex items-center gap-2 text-base font-medium text-neutral-sub hover:text-neutral-text bg-white px-6 py-3 transition-colors"
            >
              Ver funcionalidades
            </a>
          </div>
        </motion.div>

        <motion.div
          custom={1}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <PhotoFrame />
        </motion.div>

      </div>
      <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #ffffff)' }} />
    </section>
  )
}

// ─── Sección 1: Sobre la desnutrición ────────────────────────────────────────

function SobreDesnutricion() {
  return (
    <section id="desnutricion" className="relative py-28 bg-white">
      <div className="max-w-7xl mx-auto px-8">

        <div className="grid md:grid-cols-2 gap-20 items-center">

          {/* Texto */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <h2 className="text-4xl font-bold text-neutral-text leading-snug mb-6">
              Cuidar la nutrición infantil es proteger el desarrollo y el futuro
            </h2>
            <p className="text-neutral-sub text-base leading-relaxed mb-5">
              La desnutrición infantil es una condición que afecta a millones de niños menores de 5 años
              y representa uno de los principales desafíos de salud pública. Durante los primeros años
              de vida, el cuerpo y el cerebro atraviesan etapas fundamentales de crecimiento, por lo que
              una alimentación inadecuada puede generar consecuencias físicas y cognitivas que impactan
              el desarrollo integral del niño.
            </p>
            <p className="text-neutral-sub text-base leading-relaxed">
              La falta de nutrientes esenciales no solo afecta el peso y la talla, sino también la
              capacidad del organismo para defenderse de enfermedades. Los niños con desnutrición
              suelen presentar mayor vulnerabilidad a infecciones, retrasos en el crecimiento y
              dificultades en el aprendizaje.
            </p>
          </motion.div>

          {/* Tarjeta destacada: 1 000 días */}
          <motion.div
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="flex flex-col gap-6"
          >
            <div className="clay-card p-8">
              <Clock className="w-6 h-6 mb-5" style={{ color: '#4FB4D2' }} />
              <h3 className="text-2xl font-bold text-neutral-text mb-3">Los primeros 1 000 días</h3>
              <p className="text-neutral-sub text-sm leading-relaxed">
                Desde el embarazo hasta los 2 años, esta etapa es crítica para el crecimiento
                y el desarrollo cerebral. Una nutrición adecuada en este período fortalece el
                sistema inmunológico y sienta las bases del bienestar a largo plazo.
              </p>
            </div>

            <div className="clay-card p-6">
              <p className="text-sm text-neutral-sub leading-relaxed">
                La atención temprana puede mejorar significativamente la calidad de vida y
                favorecer un desarrollo saludable durante toda la infancia.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #F5FAFC)' }} />
    </section>
  )
}

// ─── Sección 2: Detección temprana ───────────────────────────────────────────

const signos = [
  'Bajo peso para la edad',
  'Retraso en el crecimiento',
  'Fatiga o debilidad frecuente',
  'Pérdida de apetito',
  'Enfermedades recurrentes',
]

function DeteccionTemprana() {
  return (
    <section className="relative py-28"
      style={{ background: 'linear-gradient(to bottom, #F5FAFC, #EAF6FB)' }}>
      <div className="max-w-7xl mx-auto px-8">

        <div className="grid md:grid-cols-2 gap-20 items-center">

          {/* Signos visuales */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="order-2 md:order-1"
          >
            <div className="clay-card p-8">
              <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#E53935' }}>
                Signos de alerta
              </p>
              <ul className="flex flex-col gap-0">
                {signos.map((s, i) => (
                  <li key={s}
                    className={`flex items-center gap-4 py-4 text-sm font-medium text-neutral-text ${i < signos.length - 1 ? 'border-b border-neutral-border' : ''}`}>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                      style={{ background: `rgba(229,57,53,${0.55 + i * 0.10})` }}>
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Texto */}
          <motion.div
            custom={1}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="order-1 md:order-2"
          >
            <h2 className="text-4xl font-bold text-neutral-text leading-snug mb-6">
              La importancia de la detección temprana
            </h2>
            <p className="text-neutral-sub text-base leading-relaxed mb-5">
              Identificar los signos de riesgo a tiempo permite actuar de manera oportuna
              y reducir complicaciones futuras. En muchos casos, los síntomas pueden pasar
              desapercibidos durante las primeras etapas, por lo que el seguimiento constante
              del crecimiento infantil es fundamental.
            </p>
            <p className="text-neutral-sub text-base leading-relaxed">
              La atención temprana puede mejorar significativamente la calidad de vida
              y favorecer un desarrollo saludable durante la infancia.
            </p>
          </motion.div>

        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #F5FAFC)' }} />
    </section>
  )
}

// ─── Sección 3: Factores, Consecuencias, Prevención ──────────────────────────

const bloquesInfo = [
  {
    icon: AlertTriangle,
    title: 'Factores que influyen en la desnutrición',
    color: '#FB8C00',
    bg: 'rgba(251,140,0,0.08)',
    border: 'rgba(251,140,0,0.18)',
    body: [
      'Las dificultades de acceso a alimentos nutritivos, las enfermedades frecuentes y la falta de seguimiento médico son algunas de las principales causas.',
      'También influyen la inseguridad alimentaria, el acceso limitado a servicios de salud y la falta de educación nutricional en el entorno familiar.',
      'La prevención requiere un enfoque integral que involucre el cuidado médico, el acompañamiento social y la orientación nutricional.',
    ],
  },
  {
    icon: Brain,
    title: 'Consecuencias en el desarrollo infantil',
    color: '#E53935',
    bg: 'rgba(229,57,53,0.07)',
    border: 'rgba(229,57,53,0.15)',
    body: [
      'Cuando no se trata adecuadamente, la desnutrición puede afectar el desarrollo físico, cognitivo y emocional del niño.',
      'Sus efectos pueden extenderse hasta la adolescencia y la adultez, impactando el rendimiento escolar y la capacidad de aprendizaje.',
      'Los primeros 1 000 días de vida representan la ventana más crítica: el daño en esta etapa puede ser difícil de revertir.',
    ],
  },
  {
    icon: Leaf,
    title: 'La prevención puede marcar la diferencia',
    color: '#3DAB6B',
    bg: 'rgba(111,207,151,0.09)',
    border: 'rgba(111,207,151,0.22)',
    body: [
      'La lactancia materna, una alimentación balanceada y los controles médicos periódicos cumplen un papel clave en la protección de la salud infantil.',
      'La promoción de hábitos saludables y el seguimiento oportuno del crecimiento son fundamentales para reducir el riesgo.',
      'Garantizar una nutrición adecuada en la infancia contribuye al bienestar de toda la comunidad.',
    ],
  },
]

function FactoresConsPrev() {
  return (
    <section className="relative py-28 bg-neutral-bg">
      <div className="max-w-7xl mx-auto px-8">

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center mb-14"
        >
          <h2 className="text-4xl font-bold text-neutral-text mb-4">
            Factores, consecuencias y prevención
          </h2>
          <p className="text-neutral-sub text-base max-w-xl mx-auto">
            Comprender las causas y el impacto de la desnutrición es el primer paso
            para actuar a tiempo y de manera efectiva.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {bloquesInfo.map(({ icon: Icon, title, color, body }, i) => (
            <motion.div
              key={title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="clay-card p-7 flex flex-col gap-5"
            >
              <Icon className="w-6 h-6" style={{ color }} />
              <h3 className="font-semibold text-neutral-text text-base leading-snug">{title}</h3>
              <ul className="flex flex-col gap-3">
                {body.map((line, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-neutral-sub leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    {line}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

      </div>
      <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #F5FAFC)' }} />
    </section>
  )
}

function Features() {
  return (
    <section id="funcionalidades" className="relative py-32 bg-neutral-bg">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center mb-14"
        >
          <h2 className="text-4xl font-bold text-neutral-text mb-4">
            Herramientas para la vigilancia nutricional
          </h2>
          <p className="text-neutral-sub text-base max-w-xl mx-auto">
            Desde la evaluación antropométrica individual hasta el análisis de tendencias poblacionales.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="clay-card p-7"
            >
              <Icon className="w-7 h-7 mb-4" style={{ color: '#4FB4D2' }} />
              <h3 className="font-semibold text-neutral-text text-base mb-2">{title}</h3>
              <p className="text-neutral-sub text-sm leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #ffffff)' }} />
    </section>
  )
}

const plataformaItems = [
  { icon: Activity,    label: 'Seguimiento antropométrico' },
  { icon: ShieldCheck, label: 'Evaluación nutricional infantil' },
  { icon: Bell,        label: 'Alertas de riesgo' },
  { icon: BarChart3,   label: 'Análisis epidemiológico' },
  { icon: FileText,    label: 'Reportes e indicadores de salud' },
]

function Plataforma() {
  return (
    <section id="roles" className="relative py-32 bg-white">
      <style>{`
        @keyframes marquee-loop {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-loop 18s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>

      {/* Texto centrado */}
      <div className="max-w-4xl mx-auto px-8 text-center mb-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-text leading-tight mb-8">
            Una solución enfocada en prevención
            <br />y seguimiento nutricional
          </h2>
          <div className="w-14 h-px mx-auto mb-8" style={{ background: 'rgba(79,180,210,0.30)' }} />
          <p className="text-neutral-sub text-base leading-relaxed max-w-2xl mx-auto">
            Diseñada para facilitar el monitoreo del crecimiento infantil, apoyar la detección
            temprana de desnutrición y fortalecer el análisis de información nutricional en
            contextos clínicos y poblacionales.
          </p>
        </motion.div>
      </div>

      {/* Looping tag carousel — alineado con el título, bordes difuminados */}
      <div className="max-w-4xl mx-auto overflow-hidden py-5 mb-12"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        <div className="marquee-track">
          {[...plataformaItems, ...plataformaItems].map(({ icon: Icon, label }, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 flex-shrink-0 mx-3 px-5 py-2.5 rounded-full text-sm font-medium"
              style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#64748B' }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Botón */}
      <div className="text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
        >
          <Link
            to="/login"
            className="clay-btn inline-flex items-center gap-2 text-white font-medium px-8 py-4 text-base"
          >
            Acceder al sistema
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
      <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #F5FAFC)' }} />
    </section>
  )
}

function CTA() {
  return (
    <section className="relative py-32 bg-neutral-bg">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        className="max-w-lg mx-auto px-6 text-center"
      >
        <h2 className="text-4xl font-bold text-neutral-text mb-4">
          ¿Todo listo?
        </h2>
        <p className="text-neutral-sub text-base mb-10">
          Accede con tus credenciales institucionales. Si no tienes cuenta,
          comunícate con el administrador de tu establecimiento de salud.
        </p>
        <Link
          to="/login"
          className="clay-btn inline-flex items-center gap-2 text-white font-medium px-8 py-4 transition-colors duration-200 text-base"
        >
          Ingresar al sistema
          <ChevronRight className="w-4 h-4" />
        </Link>
      </motion.div>
      <div className="absolute bottom-0 inset-x-0 h-28 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #ffffff)' }} />
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-neutral-border py-6 bg-white">
      <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-sub">
        <span className="font-medium text-neutral-text">NutriVigilancia Infantil</span>
        <span>Vigilancia y predicción de desnutrición en menores de 5 años</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 })

  return (
    <motion.div
      style={{ scaleX, transformOrigin: 'left' }}
      className="fixed top-0 left-0 right-0 h-0.5 bg-clinical-blue-md z-[60]"
    />
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <Intro />
        <SobreDesnutricion />
        <DeteccionTemprana />
        <FactoresConsPrev />
        <Features />
        <Plataforma />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
