import { createContext, useContext, useState } from 'react'

const AnlDashboardContext = createContext({ data: null, setData: () => {} })

// Comparte los datos del dashboard ANL (stats, detalle, proyecciones, filtros)
// entre HomeANL (productor) y el chat NIVI global de DashboardANL (consumidor).
export function AnlDashboardProvider({ children }) {
  const [data, setData] = useState(null)
  return (
    <AnlDashboardContext.Provider value={{ data, setData }}>
      {children}
    </AnlDashboardContext.Provider>
  )
}

export function useAnlDashboard() {
  return useContext(AnlDashboardContext)
}
