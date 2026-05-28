import { Routes, Route } from 'react-router-dom'
import SidebarANL from '../../components/anl/SidebarANL'
import HomeANL from './HomeANL'
import DatasetsANL from './DatasetsANL'
import EntrenamientoANL from './EntrenamientoANL'
import ModelosANL from './ModelosANL'
import UsuariosANL from './UsuariosANL'
import ReportesANL from './ReportesANL'
import DashboardsPBI from './DashboardsPBI'

export default function DashboardANL() {
  return (
    <div className="flex min-h-screen bg-neutral-bg">
      <SidebarANL />
      <main className="flex-1 ml-60 min-h-screen">
        <Routes>
          <Route index element={<HomeANL />} />
          <Route path="datasets" element={<DatasetsANL />} />
          <Route path="entrenamiento" element={<EntrenamientoANL />} />
          <Route path="modelos" element={<ModelosANL />} />
          <Route path="usuarios" element={<UsuariosANL />} />
          <Route path="reportes" element={<ReportesANL />} />
          <Route path="dashboards" element={<DashboardsPBI />} />
        </Routes>
      </main>
    </div>
  )
}
