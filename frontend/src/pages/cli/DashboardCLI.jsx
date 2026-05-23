import { Routes, Route } from 'react-router-dom'
import SidebarCLI from '../../components/cli/SidebarCLI'
import HomeCLI from './HomeCLI'
import PacientesCLI from './PacientesCLI'
import DetallePaciente from './DetallePaciente'
import AlertasCLI from './AlertasCLI'

export default function DashboardCLI() {
  return (
    <div className="flex min-h-screen bg-neutral-bg">
      <SidebarCLI />
      <main className="flex-1 ml-60 min-h-screen">
        <Routes>
          <Route index element={<HomeCLI />} />
          <Route path="pacientes" element={<PacientesCLI />} />
          <Route path="pacientes/:id" element={<DetallePaciente />} />
          <Route path="alertas" element={<AlertasCLI />} />
        </Routes>
      </main>
    </div>
  )
}
