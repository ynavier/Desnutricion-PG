import { useState, useEffect, useCallback } from 'react'
import { FileText, BarChart2, Filter, Download, Mail, Sparkles, Loader2, X, Send, Copy, Check, Link, MessageCircle } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, LineChart, Line,
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import api from '../../services/api'

// ── Reutiliza estilos del sistema de reportes ─────────────────────────────────
const CARD = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  borderRadius: 20,
  boxShadow: 'inset 0 3px 12px rgba(255,255,255,0.90), inset 0 -4px 8px rgba(0,0,0,0.07), 0 4px 18px rgba(0,0,0,0.07), 0 1px 5px rgba(0,0,0,0.04)',
  padding: '20px 24px',
}

function SectionHeader({ number, title }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, paddingBottom:10, marginBottom:16, borderBottom:'2px solid #0D47A1' }}>
      <span style={{ background:'#0D47A1', color:'#fff', width:26, height:26, borderRadius:5, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>{number}</span>
      <h2 style={{ color:'#0D47A1', fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', margin:0 }}>{title}</h2>
    </div>
  )
}

function ReportSection({ number, title, children }) {
  return (
    <div style={{ marginBottom:40 }}>
      <SectionHeader number={number} title={title} />
      <div style={{ paddingLeft:4 }}>{children}</div>
    </div>
  )
}

function ReportSubsection({ number, title, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:14, marginBottom:10 }}>
        <span style={{ color:'#9CA3AF', fontSize:11, fontFamily:'monospace', fontWeight:600 }}>{number}</span>
        <h3 style={{ color:'#1565C0', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>{title}</h3>
        <div style={{ flex:1, height:1, background:'#E3F2FD', marginLeft:4 }} />
      </div>
      <div style={{ paddingLeft:20, fontSize:13, color:'#374151', lineHeight:'1.75' }}>{children}</div>
    </div>
  )
}

function KpiTable({ kpis }) {
  const entries = Object.entries(kpis).filter(([,v]) => v !== null && v !== undefined)
  if (!entries.length) return null
  return (
    <div style={{ borderRadius:8, overflow:'hidden', border:'1px solid #BBDEFB' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
        <thead>
          <tr style={{ background:'#0D47A1' }}>
            <th style={{ padding:'9px 16px', textAlign:'left', color:'#fff', fontWeight:600, fontSize:11, width:'65%' }}>Indicador</th>
            <th style={{ padding:'9px 16px', textAlign:'right', color:'#fff', fontWeight:600, fontSize:11 }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k,v], i) => (
            <tr key={k} style={{ background: i%2===0?'#F7F9FC':'#fff', borderBottom:'1px solid #E3F2FD' }}>
              <td style={{ padding:'8px 16px', color:'#374151', fontWeight:500 }}>{k.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</td>
              <td style={{ padding:'8px 16px', textAlign:'right', color:'#0D47A1', fontWeight:700 }}>{String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BulletList({ items=[], color='#0D47A1' }) {
  return (
    <ul style={{ margin:0, padding:0, listStyle:'none' }}>
      {items.map((item,i) => (
        <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:9 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:color, flexShrink:0, marginTop:7 }}/>
          <span style={{ fontSize:13, color:'#374151', lineHeight:'1.65' }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function RecList({ items=[] }) {
  return (
    <ol style={{ margin:0, padding:0, listStyle:'none' }}>
      {items.map((item,i) => (
        <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:11 }}>
          <span style={{ width:22, height:22, borderRadius:4, background:'#E3F2FD', color:'#1565C0', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{i+1}</span>
          <span style={{ fontSize:13, color:'#374151', lineHeight:'1.65' }}>{item}</span>
        </li>
      ))}
    </ol>
  )
}

function ChartCaption({ text }) {
  return <p style={{ fontSize:11, color:'#546E7A', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', paddingLeft:10, borderLeft:'3px solid #4FB4D2', marginBottom:14 }}>{text}</p>
}

function metricColor(v) {
  return v >= 85 ? '#2E7D32' : v >= 75 ? '#1565C0' : v >= 60 ? '#E65100' : '#C62828'
}

// ── Sección de gráficas del modelo ML ────────────────────────────────────────
function SectionsModelo({ charts }) {
  const {
    radar_metricas     = [],
    modelo_ab          = [],
    evolucion_accuracy = [],
    scatter_datos      = [],
    comparativa_tipos  = [],
  } = charts

  const noData = (arr) => <p style={{ color:'#9CA3AF', fontSize:13, fontStyle:'italic' }}>Sin datos disponibles.</p>

  return (
    <>
      {/* ── Sección 2: Métricas del modelo activo ── */}
      <ReportSection number="2" title="Métricas del Modelo Activo">

        <ReportSubsection number="2.1" title="Radar de métricas — Modelo A (con IMC)">
          {radar_metricas.some(r => r.value > 0) ? (
            <>
              <ChartCaption text="Perfil de rendimiento del submodelo principal (Accuracy, F1 Weighted, F1 Macro, CV Accuracy)" />
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radar_metricas} margin={{ top:10, right:40, bottom:10, left:40 }}>
                  <PolarGrid stroke="#BBDEFB"/>
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize:11, fill:'#374151' }}/>
                  <Radar name="Modelo activo" dataKey="value" stroke="#0D47A1" fill="#0D47A1" fillOpacity={0.2} strokeWidth={2}/>
                  <Tooltip contentStyle={{ borderRadius:8, border:'1px solid #E0E6ED', fontSize:12 }} formatter={v=>[`${v}%`,'Valor']}/>
                </RadarChart>
              </ResponsiveContainer>
            </>
          ) : noData()}
        </ReportSubsection>

        <ReportSubsection number="2.2" title="Tabla de métricas con interpretación técnica">
          {radar_metricas.some(r => r.value > 0) ? (
            <div style={{ borderRadius:8, overflow:'hidden', border:'1px solid #BBDEFB' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#0D47A1' }}>
                    {['Métrica','Valor','Umbral óptimo','Interpretación'].map((h,i)=>(
                      <th key={h} style={{ padding:'9px 14px', textAlign:i===0?'left':'right', color:'#fff', fontWeight:600, fontSize:11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {radar_metricas.map((row,i)=>{
                    const v = row.value
                    const [interp,ic] = v>=90?['Excelente','#2E7D32']:v>=80?['Bueno','#1565C0']:v>=70?['Aceptable','#E65100']:['Requiere mejora','#C62828']
                    return (
                      <tr key={i} style={{ background:i%2===0?'#F7F9FC':'#fff', borderBottom:'1px solid #E3F2FD' }}>
                        <td style={{ padding:'8px 14px', color:'#374151', fontWeight:500 }}>{row.metric}</td>
                        <td style={{ padding:'8px 14px', textAlign:'right', fontWeight:700, color:'#0D47A1' }}>{v}%</td>
                        <td style={{ padding:'8px 14px', textAlign:'right', color:'#546E7A' }}>≥ 80%</td>
                        <td style={{ padding:'8px 14px', textAlign:'right', fontWeight:600, fontSize:11, color:ic }}>{interp}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : noData()}
        </ReportSubsection>
      </ReportSection>

      {/* ── Sección 3: Modelo A vs Modelo B ── */}
      <ReportSection number="3" title="Comparativa Modelo A vs Modelo B">
        <ReportSubsection number="3.1" title="Modelo A (con IMC) vs Modelo B (sin IMC — fallback rural)">
          {modelo_ab.some(r => r['Modelo A (con IMC)'] > 0 || r['Modelo B (sin IMC)'] > 0) ? (
            <>
              <ChartCaption text="Comparación de métricas entre el submodelo principal y el submodelo de fallback" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={modelo_ab} margin={{ top:5, right:10, left:-15, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7"/>
                  <XAxis dataKey="metrica" tick={{ fontSize:10, fill:'#546E7A' }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} unit="%" tick={{ fontSize:10, fill:'#546E7A' }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ borderRadius:8, border:'1px solid #E0E6ED', fontSize:12 }} formatter={v=>[`${v}%`,'']}/>
                  <Legend wrapperStyle={{ fontSize:11 }}/>
                  <ReferenceLine y={80} stroke="#E53935" strokeDasharray="4 2" label={{ value:'80%', fontSize:9, fill:'#E53935', position:'right' }}/>
                  <Bar dataKey="Modelo A (con IMC)" fill="#0D47A1" radius={[4,4,0,0]}/>
                  <Bar dataKey="Modelo B (sin IMC)" fill="#4FB4D2" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
              <p style={{ fontSize:11, color:'#546E7A', marginTop:8, fontStyle:'italic' }}>
                Línea roja punteada = umbral óptimo (80%). El Modelo B se usa como fallback cuando no hay dato de IMC.
              </p>
            </>
          ) : noData()}
        </ReportSubsection>
      </ReportSection>

      {/* ── Sección 4: Evolución histórica ── */}
      <ReportSection number="4" title="Evolución Histórica del Rendimiento">
        <ReportSubsection number="4.1" title="Accuracy y F1 Weighted por versión entrenada">
          {evolucion_accuracy.length > 0 ? (
            <>
              <ChartCaption text="Evolución del rendimiento a través de todas las versiones del modelo predictivo" />
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={evolucion_accuracy} margin={{ top:5, right:10, left:-20, bottom:5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7"/>
                  <XAxis dataKey="fecha" tick={{ fontSize:8, fill:'#546E7A' }} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} unit="%" tick={{ fontSize:10, fill:'#546E7A' }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ borderRadius:8, border:'1px solid #E0E6ED', fontSize:12 }} formatter={v=>[`${v}%`,'']}/>
                  <Legend wrapperStyle={{ fontSize:11 }}/>
                  <ReferenceLine y={80} stroke="#E53935" strokeDasharray="4 2"/>
                  <Line type="monotone" dataKey="accuracy"    stroke="#0D47A1" strokeWidth={2.5} dot={{ r:3, fill:'#0D47A1' }} name="Accuracy"/>
                  <Line type="monotone" dataKey="f1_weighted" stroke="#6FCF97" strokeWidth={2.5} dot={{ r:3, fill:'#6FCF97' }} name="F1 Weighted"/>
                  <Line type="monotone" dataKey="cv_accuracy" stroke="#FBC02D" strokeWidth={1.5} dot={{ r:2, fill:'#FBC02D' }} strokeDasharray="4 2" name="CV Accuracy"/>
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : noData()}
        </ReportSubsection>

        {comparativa_tipos.length > 1 && (
          <ReportSubsection number="4.2" title="F1 Weighted promedio por tipo de algoritmo">
            <ChartCaption text="Comparativa del rendimiento promedio entre los distintos algoritmos entrenados" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={comparativa_tipos} margin={{ top:5, right:10, left:-15, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7"/>
                <XAxis dataKey="tipo" tick={{ fontSize:10, fill:'#546E7A' }} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} unit="%" tick={{ fontSize:10, fill:'#546E7A' }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ borderRadius:8, border:'1px solid #E0E6ED', fontSize:12 }} formatter={v=>[`${v}%`,'']}/>
                <ReferenceLine y={80} stroke="#E53935" strokeDasharray="4 2"/>
                <Bar dataKey="f1_promedio" name="F1 Promedio" radius={[4,4,0,0]}>
                  {comparativa_tipos.map((entry, i) => (
                    <Cell key={i} fill={['#0D47A1','#4FB4D2','#6FCF97','#FBC02D'][i % 4]}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ReportSubsection>
        )}
      </ReportSection>

      {/* ── Sección 5: Volumen vs rendimiento ── */}
      {scatter_datos.length > 1 && (
        <ReportSection number="5" title="Volumen de Datos vs Rendimiento">
          <ReportSubsection number="5.1" title="Relación entre tamaño del dataset y F1 Weighted">
            <ChartCaption text="Cada punto es una versión del modelo. Muestra si más datos implica mejor rendimiento." />
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top:5, right:10, left:-10, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7"/>
                <XAxis dataKey="n_muestras" name="Muestras" type="number" tick={{ fontSize:10, fill:'#546E7A' }} axisLine={false} tickLine={false} label={{ value:'Muestras de entrenamiento', position:'insideBottom', offset:-3, fontSize:10, fill:'#546E7A' }}/>
                <YAxis dataKey="f1_weighted" name="F1 Weighted" unit="%" domain={[0,100]} tick={{ fontSize:10, fill:'#546E7A' }} axisLine={false} tickLine={false}/>
                <ZAxis range={[40,40]}/>
                <Tooltip contentStyle={{ borderRadius:8, border:'1px solid #E0E6ED', fontSize:12 }}
                  formatter={(v,n) => [`${v}${n==='F1 Weighted'?'%':''}`, n]}/>
                <Scatter data={scatter_datos} name="Modelos">
                  {scatter_datos.map((entry, i) => (
                    <Cell key={i} fill={entry.activo ? '#27AE60' : '#0D47A1'} fillOpacity={0.7}/>
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <p style={{ fontSize:11, color:'#546E7A', marginTop:8, fontStyle:'italic' }}>
              Punto verde = modelo activo actualmente en producción.
            </p>
          </ReportSubsection>
        </ReportSection>
      )}
    </>
  )
}

// ── Modal compartir ───────────────────────────────────────────────────────────
function generarHtmlInforme(elementId) {
  const el = document.getElementById(elementId)
  if (!el) throw new Error('Elemento no encontrado')
  const clon = el.cloneNode(true)
  clon.querySelectorAll('[class*="print:hidden"], .print\\:hidden, button, [data-no-pdf]').forEach(e=>e.remove())
  const estilos = Array.from(document.styleSheets).flatMap(ss=>{try{return Array.from(ss.cssRules).map(r=>r.cssText)}catch{return[]}}).join('\n')
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Informe ML — NutriVigilancia</title><style>${estilos}body{margin:0;background:#f5f7fa;font-family:system-ui,sans-serif}.report-print-doc{max-width:900px;margin:0 auto}@media print{body{background:white}@page{margin:15mm}}</style></head><body>${clon.outerHTML}<div style="text-align:center;padding:24px;color:#9CA3AF;font-size:11px">Para guardar como PDF: Archivo → Imprimir → Guardar como PDF</div></body></html>`
  const bytes=new TextEncoder().encode(html)
  let binary=''; const chunk=8192
  for(let i=0;i<bytes.length;i+=chunk) binary+=String.fromCharCode(...bytes.subarray(i,i+chunk))
  return btoa(binary)
}

function ModalCompartir({ reportData, onClose }) {
  const [step,setStep]=useState('idle'); const [link,setLink]=useState(''); const [copiado,setCopiado]=useState(false); const [err,setErr]=useState('')
  const fileRef = { current: null }
  const nombre = `informe_modelo_ml_${new Date().toISOString().slice(0,10)}.pdf`
  const asunto = encodeURIComponent(`Informe Modelo ML: ${reportData?.titulo||'NutriVigilancia'}`)
  const cuerpo = encodeURIComponent(`Accede al informe aquí:\n${link}\n\n(Válido 7 días — ábrelo en el navegador y usa Ctrl+P para guardarlo como PDF)\n\n— NutriVigilancia`)

  async function subirArchivo(file) {
    if (!file||file.type!=='application/pdf'){setErr('Selecciona un archivo PDF.');return}
    setStep('generando'); setErr('')
    try {
      const reader=new FileReader()
      const base64=await new Promise((res,rej)=>{reader.onload=e=>res(e.target.result.split(',')[1]);reader.onerror=rej;reader.readAsDataURL(file)})
      const {default:api}=await import('../../services/api')
      const {data}=await api.post('/compartir/subir-pdf',{pdf_base64:base64,nombre_archivo:file.name||nombre,titulo:reportData?.titulo||'Informe ML'})
      setLink(data.url); setStep('listo')
    } catch(e){setErr(e.response?.data?.detail||'Error al subir.'); setStep('error')}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:'rgba(0,0,0,0.35)',backdropFilter:'blur(3px)'}} onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-neutral-text">Compartir informe</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-bg"><X className="w-4 h-4 text-neutral-sub"/></button>
        </div>
        {step==='idle'&&(<>
          <div className="flex items-start gap-3 mb-4">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{background:'#0D47A1'}}>1</span>
            <div className="flex-1"><p className="text-xs font-semibold text-neutral-text mb-1">Descarga el PDF</p>
              <button onClick={()=>{onClose();setTimeout(()=>window.print(),100)}} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-neutral-border hover:bg-neutral-bg"><Download className="w-3.5 h-3.5"/>Exportar PDF ahora</button></div>
          </div>
          <div className="border-t border-neutral-border my-3"/>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white" style={{background:'#0D47A1'}}>2</span>
            <div className="flex-1"><p className="text-xs font-semibold text-neutral-text mb-1">Sube el PDF y obtén el link</p>
              <input type="file" accept="application/pdf" className="hidden" ref={fileRef} onChange={e=>subirArchivo(e.target.files?.[0])}/>
              <button onClick={()=>fileRef.current?.click()} className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2" style={{background:'linear-gradient(135deg,#0D47A1,#1976D2)',color:'#fff'}}>
                <Link className="w-4 h-4"/>Seleccionar PDF y generar link</button></div>
          </div>
        </>)}
        {step==='generando'&&<div className="flex flex-col items-center py-6 gap-3 text-neutral-sub"><Loader2 className="w-7 h-7 animate-spin" style={{color:'#0D47A1'}}/><p className="text-sm">Subiendo…</p></div>}
        {step==='error'&&<><div className="px-4 py-3 rounded-xl text-xs mb-4" style={{background:'#FEF2F2',color:'#B91C1C'}}>{err}</div><button onClick={()=>setStep('idle')} className="w-full py-2 rounded-xl text-sm font-medium text-neutral-sub border border-neutral-border hover:bg-neutral-bg">Reintentar</button></>}
        {step==='listo'&&<div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{background:'#F0FDF4',border:'1px solid #BBF7D0'}}>
            <Link className="w-3.5 h-3.5" style={{color:'#15803D'}}/><p className="text-xs flex-1 truncate font-medium" style={{color:'#15803D'}}>Link generado</p></div>
          <button onClick={()=>{navigator.clipboard.writeText(link);setCopiado(true);setTimeout(()=>setCopiado(false),2000)}}
            className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={copiado?{background:'#F0FDF4',color:'#15803D',border:'1px solid #BBF7D0'}:{background:'#F8FAFC',color:'#374151',border:'1px solid #E2E8F0'}}>
            {copiado?<><Check className="w-4 h-4"/>¡Copiado!</>:<><Copy className="w-4 h-4"/>Copiar link</>}
          </button>
          <p className="text-[10px] text-center font-semibold text-neutral-sub uppercase tracking-wide">Compartir por</p>
          <div className="grid grid-cols-3 gap-2">
            <a href={`mailto:?subject=${asunto}&body=${cuerpo}`} className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold hover:bg-neutral-bg" style={{border:'1px solid #E2E8F0',color:'#374151',textDecoration:'none'}}><Mail className="w-5 h-5" style={{color:'#6366F1'}}/>Correo</a>
            <a href={`https://outlook.live.com/mail/0/deeplink/compose?to=&subject=${asunto}&body=${cuerpo}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold hover:bg-neutral-bg" style={{border:'1px solid #E2E8F0',color:'#374151',textDecoration:'none'}}><img src="https://img.icons8.com/color/28/microsoft-outlook-2019.png" alt="Outlook" className="w-5 h-5"/>Outlook</a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`*Informe ML — NutriVigilancia*\n\n${link}\n_(válido 7 días)_`)}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold hover:bg-neutral-bg" style={{border:'1px solid #E2E8F0',color:'#374151',textDecoration:'none'}}><MessageCircle className="w-5 h-5" style={{color:'#25D366'}}/>WhatsApp</a>
          </div>
        </div>}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ReportesADM() {
  const [dateFrom,   setDateFrom]   = useState(()=>{ const d=new Date(); d.setMonth(d.getMonth()-6); return d.toISOString().slice(0,10) })
  const [dateTo,     setDateTo]     = useState(()=>new Date().toISOString().slice(0,10))
  const [generating, setGenerating] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [historial,  setHistorial]  = useState([])
  const [error,      setError]      = useState(null)
  const [modalComp,  setModalComp]  = useState(false)

  useEffect(() => {
    api.get('/reportes/historial').then(({data})=>setHistorial(Array.isArray(data)?data.filter(h=>h.tipo==='modelo'):[])).catch(()=>{})
  }, [])

  const handleGenerate = useCallback(async () => {
    setGenerating(true); setError(null)
    try {
      const { data } = await api.post('/reportes/generar', { tipo:'modelo', fecha_desde:dateFrom||null, fecha_hasta:dateTo||null })
      setReportData(data)
      api.get('/reportes/historial').then(({data:h})=>setHistorial(Array.isArray(h)?h.filter(x=>x.tipo==='modelo'):[])).catch(()=>{})
    } catch(e) {
      setError(e.response?.data?.detail||e.message||'Error al generar el informe')
    } finally { setGenerating(false) }
  }, [dateFrom, dateTo])

  const { titulo, filtros={}, generado, kpis={}, charts={}, analisis } = reportData || {}

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 bg-neutral-bg min-h-screen print:p-0 print:bg-white">
      {modalComp && <ModalCompartir reportData={reportData} onClose={()=>setModalComp(false)}/>}

      <div className="print:hidden">
        <h1 className="text-xl font-bold" style={{color:'#1A1F2B'}}>Informe del Modelo ML</h1>
        <p className="text-sm mt-0.5" style={{color:'#54606E'}}>Desempeño del modelo predictivo activo — exportación PDF</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start print:block">

        {/* Vista previa o configuración */}
        {reportData ? (
          <div className="lg:col-span-2 print:col-span-3">
            <div id="report-print-doc" className="report-print-doc" style={{background:'#fff',borderRadius:16,boxShadow:'0 2px 28px rgba(0,0,0,0.09)',overflow:'hidden'}}>

              {/* Header */}
              <div className="report-print-header" style={{background:'linear-gradient(135deg,#0A3880 0%,#0D47A1 55%,#1565C0 100%)',padding:'28px 40px'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:20}}>
                  <div style={{flex:1,minWidth:0}}>
                    <p className="report-print-institution" style={{color:'rgba(255,255,255,0.6)',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',fontWeight:600,marginBottom:8}}>
                      Sistema de Vigilancia Nutricional Infantil
                    </p>
                    <h1 className="report-print-title" style={{color:'#fff',fontSize:19,fontWeight:800,lineHeight:1.3,marginBottom:12}}>
                      Informe de Desempeño del Modelo Predictivo de Machine Learning
                    </h1>
                    <div className="report-print-meta" style={{display:'flex',flexWrap:'wrap',gap:'6px 24px'}}>
                      <span style={{color:'rgba(255,255,255,0.75)',fontSize:11}}>Período: <strong style={{color:'#fff'}}>{filtros.fecha_desde||'N/A'}</strong> → <strong style={{color:'#fff'}}>{filtros.fecha_hasta||'N/A'}</strong></span>
                      <span style={{color:'rgba(255,255,255,0.75)',fontSize:11}}>Generado: <strong style={{color:'#fff'}}>{generado?.replace('T',' ')||'—'}</strong></span>
                    </div>
                  </div>
                  <div className="print:hidden" style={{flexShrink:0,display:'flex',gap:8}}>
                    <button onClick={()=>setModalComp(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,cursor:'pointer',background:'rgba(255,255,255,0.12)',color:'#fff',border:'1px solid rgba(255,255,255,0.25)',fontSize:12,fontWeight:600}}><Mail size={13}/>Compartir</button>
                    <button onClick={()=>window.print()} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:8,cursor:'pointer',background:'rgba(255,255,255,0.22)',color:'#fff',border:'1px solid rgba(255,255,255,0.35)',fontSize:12,fontWeight:600}}><Download size={13}/>Exportar PDF</button>
                  </div>
                </div>
                <div className="report-print-conf-strip" style={{marginTop:16,paddingTop:14,borderTop:'1px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                  <span style={{background:analisis?.fuente==='ia'?'rgba(129,199,132,0.22)':'rgba(255,255,255,0.1)',color:analisis?.fuente==='ia'?'#A5D6A7':'rgba(255,255,255,0.65)',border:`1px solid ${analisis?.fuente==='ia'?'rgba(129,199,132,0.4)':'rgba(255,255,255,0.2)'}`,padding:'3px 12px',borderRadius:20,fontSize:10,fontWeight:600}}>
                    {analisis?.fuente==='ia'?`Análisis IA · ${analisis.modelo_usado||'Gemini'}`:'Análisis basado en datos del sistema'}
                  </span>
                  <span style={{color:'rgba(255,255,255,0.4)',fontSize:10}}>Documento confidencial — uso exclusivo del sistema</span>
                </div>
              </div>

              {/* Cuerpo */}
              <div className="report-print-body" style={{padding:'40px 44px'}}>

                {/* Sección 1: KPIs */}
                <ReportSection number="1" title="Indicadores Clave del Modelo">
                  <ReportSubsection number="1.1" title="Métricas del modelo activo">
                    <KpiTable kpis={kpis}/>
                  </ReportSubsection>
                  {analisis?.resumen && (
                    <ReportSubsection number="1.2" title="Síntesis">
                      <p style={{margin:0}}>{analisis.resumen}</p>
                    </ReportSubsection>
                  )}
                  {analisis?.hallazgos?.length>0 && (
                    <ReportSubsection number="1.3" title="Hallazgos principales">
                      <BulletList items={analisis.hallazgos}/>
                    </ReportSubsection>
                  )}
                </ReportSection>

                {/* Secciones 2-3: Gráficas */}
                <SectionsModelo charts={charts}/>

                {/* Sección 6: Análisis */}
                {analisis?.discusion && (
                  <ReportSection number="6" title="Análisis y Discusión">
                    <ReportSubsection number="6.1" title="Interpretación">
                      <p style={{margin:0}}>{analisis.discusion}</p>
                    </ReportSubsection>
                  </ReportSection>
                )}

                {/* Sección 7: Conclusiones */}
                <ReportSection number="7" title="Conclusiones y Recomendaciones">
                  {analisis?.conclusiones?.length>0 && (
                    <ReportSubsection number="7.1" title="Conclusiones">
                      <BulletList items={analisis.conclusiones}/>
                    </ReportSubsection>
                  )}
                  {analisis?.recomendaciones?.length>0 && (
                    <ReportSubsection number="7.2" title="Recomendaciones técnicas">
                      <RecList items={analisis.recomendaciones}/>
                    </ReportSubsection>
                  )}
                </ReportSection>

                {/* Footer */}
                <div className="report-print-footer" style={{marginTop:32,paddingTop:16,borderTop:'1px solid #E3F2FD',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                  <p style={{fontSize:10,color:'#9CA3AF',margin:0}}>NutriVigilancia — Informe ML · {generado?.replace('T',' ')}</p>
                  <p style={{fontSize:10,color:'#9CA3AF',margin:0}}>{analisis?.fuente==='ia'?`IA: ${analisis.modelo_usado}`:'Análisis estático'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 space-y-4">
            <div style={CARD}>
              <p className="text-sm font-semibold mb-4" style={{color:'#1A1F2B'}}>Período de evaluación</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[['Fecha desde','date',dateFrom,setDateFrom],['Fecha hasta','date',dateTo,setDateTo]].map(([label,type,val,setter])=>(
                  <div key={label}>
                    <label className="text-xs font-medium block mb-1" style={{color:'#54606E'}}>{label}</label>
                    <input type={type} value={val} onChange={e=>setter(e.target.value)} className="w-full text-sm rounded-xl px-3 py-2.5 outline-none" style={{border:'1px solid #E0E6ED',background:'#F7F9FC',color:'#1A1F2B'}}/>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center" style={{border:'2px dashed #BBDEFB',background:'rgba(227,242,253,0.3)'}}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background:'rgba(156,39,176,0.1)'}}>
                <BarChart2 className="w-7 h-7" style={{color:'#9C27B0'}}/>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{color:'#1A1F2B'}}>Informe de Desempeño del Modelo Predictivo</p>
                <p className="text-xs mt-1.5" style={{color:'#54606E'}}>Genera el informe para ver métricas, radar comparativo y evolución del accuracy.</p>
              </div>
            </div>
          </div>
        )}

        {/* Panel derecho */}
        <div className="print:hidden space-y-4">
          <div style={CARD}>
            <p className="text-sm font-semibold mb-4" style={{color:'#1A1F2B'}}>Configuración</p>
            <div className="space-y-2 py-3" style={{borderTop:'1px solid #F0F0F0',borderBottom:'1px solid #F0F0F0'}}>
              <div className="flex justify-between"><span className="text-xs" style={{color:'#54606E'}}>Tipo</span><span className="text-xs font-semibold" style={{color:'#1A1F2B'}}>Modelo ML</span></div>
              <div className="flex justify-between"><span className="text-xs" style={{color:'#54606E'}}>Período</span><span className="text-xs font-semibold" style={{color:'#1A1F2B'}}>{dateFrom} → {dateTo}</span></div>
            </div>
            {error && <div className="mt-3 px-3 py-2 rounded-xl text-xs" style={{background:'rgba(229,57,53,0.07)',color:'#C62828'}}>⚠ {error}</div>}
            <button onClick={handleGenerate} disabled={generating} className="w-full mt-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={generating?{background:'#F3F4F6',color:'#9CA3AF',cursor:'not-allowed'}:{background:'linear-gradient(135deg,#0D47A1,#1976D2)',color:'#fff',boxShadow:'inset 0 3px 8px rgba(255,255,255,0.20),0 6px 20px rgba(13,71,161,0.30)'}}>
              {generating?<><div className="w-4 h-4 border-2 border-white/50 border-t-transparent rounded-full animate-spin"/>Generando...</>:<><FileText className="w-4 h-4"/>Generar informe</>}
            </button>
          </div>

          <div className="rounded-xl p-4" style={{background:'rgba(13,71,161,0.05)',border:'1px solid rgba(13,71,161,0.15)'}}>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{color:'#1565C0'}}/>
              <p className="text-[11px]" style={{color:'#1565C0'}}>Incluye análisis IA del modelo activo y comparativa con versiones históricas.</p>
            </div>
          </div>

          {historial.length>0 && (
            <div style={CARD}>
              <p className="text-sm font-semibold mb-3" style={{color:'#1A1F2B'}}>Informes anteriores</p>
              <div className="space-y-1.5">
                {historial.slice(0,6).map(h=>(
                  <div key={h.id} onClick={async()=>{try{const{data}=await api.get(`/reportes/${h.id}`);setReportData(data)}catch{}}} className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer hover:bg-black/[0.03]">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'rgba(156,39,176,0.08)'}}>
                      <BarChart2 className="w-3.5 h-3.5" style={{color:'#9C27B0'}}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate" style={{color:'#1A1F2B'}}>{h.titulo}</p>
                      <p className="text-[10px]" style={{color:'#9CA3AF'}}>{h.generado?.slice(0,16).replace('T',' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {reportData && (
        <div className="print:hidden">
          <button onClick={()=>setReportData(null)} className="text-sm font-medium px-4 py-2 rounded-xl hover:bg-black/[0.04]" style={{color:'#54606E',border:'1px solid #E0E6ED'}}>
            ← Nuevo informe
          </button>
        </div>
      )}
    </div>
  )
}
