import { Routes, Route } from 'react-router-dom'
import SidebarANL   from '../../components/anl/SidebarANL'
import HomeANL      from './HomeANL'
import ReportesANL  from './ReportesANL'

export default function DashboardANL() {
  return (
    <div className="flex min-h-screen bg-neutral-bg">
      <SidebarANL />
      <main className="flex-1 ml-60 min-h-screen">
        <Routes>
          <Route index          element={<HomeANL />} />
          <Route path="reportes" element={<ReportesANL />} />
        </Routes>
      </main>
    </div>
  )
}
