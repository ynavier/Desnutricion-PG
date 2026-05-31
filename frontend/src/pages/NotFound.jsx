import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-neutral-bg">
      <span className="text-4xl sm:text-6xl font-bold text-clinical-blue opacity-20">404</span>
      <p className="text-neutral-sub">Página no encontrada</p>
      <Link to="/" className="btn-primary text-sm">Volver al inicio</Link>
    </div>
  )
}
