import { Routes, Route } from 'react-router-dom'
import SidebarADM from '../../components/adm/SidebarADM'
import HomeADM from './HomeADM'
// Reutiliza las páginas de gestión que antes estaban en ANL
import UsuariosANL      from '../anl/UsuariosANL'
import DatasetsANL      from '../anl/DatasetsANL'
import EntrenamientoANL from '../anl/EntrenamientoANL'
import ModelosANL       from '../anl/ModelosANL'
import ReportesADM      from './ReportesADM'

export default function DashboardADM() {
  return (
    <div className="flex min-h-screen bg-neutral-bg">
      <SidebarADM />
      <main className="flex-1 ml-60 min-h-screen">
        <Routes>
          <Route index                element={<HomeADM />} />
          <Route path="usuarios"      element={<UsuariosANL />} />
          <Route path="datasets"      element={<DatasetsANL />} />
          <Route path="entrenamiento" element={<EntrenamientoANL />} />
          <Route path="modelos"       element={<ModelosANL />} />
          <Route path="reportes"      element={<ReportesADM />} />
        </Routes>
      </main>
    </div>
  )
}
