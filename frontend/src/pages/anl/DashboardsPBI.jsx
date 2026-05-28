const PBI_URL =
  'https://app.powerbi.com/reportEmbed?reportId=79f0993e-ad9d-45c2-850e-ecdf40731485&autoAuth=true&ctid=e2bf1c48-1dae-47ba-9808-67da61e2588d'

export default function DashboardsPBI() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#F7F9FC' }}>

      {/* Encabezado compacto */}
      <div style={{
        padding: '10px 24px',
        flexShrink: 0,
        background: '#fff',
        borderBottom: '1px solid #E0E6ED',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#1A1F2B', margin: 0 }}>
            Dashboards Power BI
          </h1>
          <p style={{ fontSize: 11, color: '#54606E', marginTop: 1, marginBottom: 0 }}>
            Desnutrición Infantil — Visualización interactiva
          </p>
        </div>
        <a
          href={PBI_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            color: '#3DAB6B',
            textDecoration: 'none',
            border: '1px solid #6FCF97',
            borderRadius: 8,
            padding: '4px 12px',
            fontWeight: 600,
          }}
        >
          Abrir en Power BI ↗
        </a>
      </div>

      {/* iframe ocupa todo el alto restante */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <iframe
          title="Desnutricion"
          src={PBI_URL}
          frameBorder="0"
          allowFullScreen
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
        />
      </div>

    </div>
  )
}
