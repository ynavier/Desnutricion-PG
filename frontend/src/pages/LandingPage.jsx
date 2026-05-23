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
  { label: 'Funcionalidades', href: '#funcionalidades' },
  { label: 'Roles',           href: '#roles' },
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
        <div className="flex items-center">
          <img src="/Logo.png" alt="Logo" className="w-12 h-12 object-contain" />
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
    <section id="intro" className="py-32 bg-neutral-bg">
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
    </section>
  )
}

function Features() {
  return (
    <section id="funcionalidades" className="py-32 bg-neutral-bg">
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
    </section>
  )
}

function Roles() {
  return (
    <section id="roles" className="py-32 bg-white border-t border-neutral-border">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center mb-14"
        >
          <h2 className="text-4xl font-bold text-neutral-text mb-4">
            Dos perfiles, un mismo objetivo
          </h2>
          <p className="text-neutral-sub text-base max-w-lg mx-auto">
            Accesos diferenciados para el personal clínico y el equipo de análisis nutricional.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              name: 'Clínico',
              sub: 'Médicos y nutricionistas',
              description:
                'Registra controles, evalúa el estado nutricional de cada niño y recibe alertas cuando un paciente entra en zona de riesgo.',
              items: [
                'Registrar datos antropométricos',
                'Consultar diagnóstico nutricional',
                'Ver alertas de riesgo de desnutrición',
                'Seguimiento de curva de crecimiento',
              ],
              coverBg: 'linear-gradient(135deg, #EAF6FB, #C8EAF4)',
              textColor: '#1A7A9E',
            },
            {
              name: 'Analítico',
              sub: 'Epidemiólogos y salud pública',
              description:
                'Analiza la prevalencia de desnutrición, compara modelos predictivos y gestiona la información poblacional.',
              items: [
                'Analizar prevalencia por zona geográfica',
                'Entrenar modelos de predicción nutricional',
                'Generar reportes de salud pública',
                'Identificar grupos de alta vulnerabilidad',
              ],
              coverBg: 'linear-gradient(135deg, #DDF5EC, #B8E8CE)',
              textColor: '#1A7A5E',
            },
          ].map(({ name, sub, description, items, coverBg, textColor }, i) => (
            <motion.div
              key={name}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="book-card"
              style={{ height: '300px' }}
            >
              {/* Interior — visible cuando la portada se abre */}
              <div className="w-full h-full pl-14 pr-8 py-8 flex flex-col justify-center">
                <p className="text-neutral-sub text-sm leading-relaxed mb-5">{description}</p>
                <ul className="space-y-2.5">
                  {items.map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-neutral-text">
                      <span className="w-1.5 h-1.5 rounded-full bg-clinical-blue-md flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Portada — rota al hacer hover */}
              <div className="book-cover" style={{ background: coverBg }}>
                <span className="text-xs font-medium uppercase tracking-widest" style={{ color: textColor, opacity: 0.6 }}>{sub}</span>
                <span className="text-2xl font-bold" style={{ color: textColor }}>{name}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  return (
    <section className="py-32 bg-neutral-bg border-t border-neutral-border">
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
        <Features />
        <Roles />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
