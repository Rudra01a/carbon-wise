import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchVehicle, calculateEmissions, fetchGridIntensity, formatNumber, getFuelColor } from '../lib/api'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

export default function VehicleDetailPage() {
  const { id } = useParams()
  const [vehicle, setVehicle] = useState(null)
  const [states, setStates] = useState([])
  const [form, setForm] = useState({ state: 'Maharashtra', daily_km: 40, years: 6 })
  const [calcResult, setCalcResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchVehicle(id).then(setVehicle),
      fetchGridIntensity().then(d => setStates(d.states || []))
    ]).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (vehicle) handleCalc()
  }, [vehicle])

  const handleCalc = async () => {
    const data = await calculateEmissions({
      vehicle_id: id,
      state: form.state,
      daily_km: form.daily_km,
      years: form.years,
      usage_pattern: 'MIXED'
    })
    setCalcResult(data)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-64 mb-4"></div>
        <div className="skeleton h-64 mb-4"></div>
        <div className="skeleton h-48"></div>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <h2 className="text-xl font-bold mb-2">Vehicle not found</h2>
        <Link to="/compare" className="btn btn-primary mt-4">← Back to Compare</Link>
      </div>
    )
  }

  const pieData = calcResult ? [
    { name: 'Manufacturing', value: calcResult.emissions.manufacturing_kg, color: '#f97316' },
    { name: 'Operational', value: calcResult.emissions.operational_kg, color: '#3b82f6' },
    { name: 'Disposal', value: calcResult.emissions.disposal_kg, color: '#ef4444' },
  ] : []

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#94a3b8] mb-6">
        <Link to="/compare" className="hover:text-white no-underline text-[#94a3b8]">Compare</Link>
        <span>/</span>
        <span className="text-white">{vehicle.make} {vehicle.model}</span>
      </div>

      {/* Carbon Passport Header */}
      <div className="glass-card mb-6" style={{borderTop: `4px solid ${getFuelColor(vehicle.fuel_type)}`}}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{background:'rgba(20,184,166,0.2)', color:'#14b8a6'}}>
            🌿 CARBON PASSPORT
          </span>
          <span className="text-xs text-[#64748b]">ID: {vehicle.id}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">{vehicle.make} {vehicle.model}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`fuel-badge ${vehicle.fuel_type.toLowerCase()}`}>{vehicle.fuel_type}</span>
              <span className="text-sm text-[#94a3b8]">{vehicle.variant}</span>
              <span className="text-sm text-[#94a3b8]">• {vehicle.manufacture_year}</span>
            </div>
            <div className="text-2xl font-bold text-[#14b8a6] mt-3">₹{vehicle.price_lakh} Lakh</div>
          </div>

          {calcResult && (
            <div className="text-center p-5 rounded-2xl" style={{background:'rgba(51,65,85,0.4)', minWidth: 180}}>
              <div className="text-4xl font-bold gradient-text">{formatNumber(calcResult.emissions.total_kg)}</div>
              <div className="text-xs text-[#94a3b8] mt-1">kg CO₂ Lifecycle Total</div>
              <div className="text-[10px] text-[#64748b] mt-0.5">
                {form.daily_km} km/day • {form.years} years • {form.state}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Specs */}
        <div className="glass-card">
          <h3 className="font-bold mb-4">📋 Vehicle Specifications</h3>
          <div className="space-y-2.5">
            {[
              ['Body Type', vehicle.body_type],
              ['Seating', `${vehicle.seating_capacity} seats`],
              ['Kerb Weight', `${vehicle.kerb_weight_kg} kg`],
              ['Engine', vehicle.engine_displacement_cc ? `${vehicle.engine_displacement_cc} cc` : 'N/A (Electric)'],
              ['Battery', vehicle.battery_capacity_kwh ? `${vehicle.battery_capacity_kwh} kWh` : 'N/A'],
              ['BS Norm', vehicle.bs_norm],
              ['MIDC Efficiency', `${vehicle.midc_efficiency} ${vehicle.midc_efficiency_unit}`],
              ['WLTP Efficiency', vehicle.wltp_efficiency ? `${vehicle.wltp_efficiency} ${vehicle.midc_efficiency_unit}` : 'N/A'],
              ['Recycling Program', vehicle.has_recycling_program ? '✅ Yes' : '❌ No'],
              ['Data Source', vehicle.data_source],
              ['Assembly', vehicle.country_of_assembly],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-[rgba(148,163,184,0.08)]">
                <span className="text-xs text-[#94a3b8]">{label}</span>
                <span className="text-xs font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Emission Breakdown Pie */}
        <div className="glass-card">
          <h3 className="font-bold mb-4">🧪 Emission Breakdown</h3>
          
          {/* Calculator controls */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div>
              <label className="block text-[10px] text-[#64748b] mb-1">State</label>
              <select value={form.state} onChange={e => { setForm({...form, state: e.target.value}); }} className="w-full text-xs py-1.5">
                {states.map(s => <option key={s.state_name} value={s.state_name}>{s.state_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-[#64748b] mb-1">km/day</label>
              <input type="number" value={form.daily_km} onChange={e => setForm({...form, daily_km: +e.target.value})}
                className="w-full px-2 py-1.5 rounded-lg text-xs" style={{background:'var(--color-surface-lighter)', color:'white', border:'1px solid rgba(148,163,184,0.2)', outline:'none'}} />
            </div>
            <div>
              <label className="block text-[10px] text-[#64748b] mb-1">Years</label>
              <input type="number" value={form.years} onChange={e => setForm({...form, years: +e.target.value})}
                className="w-full px-2 py-1.5 rounded-lg text-xs" style={{background:'var(--color-surface-lighter)', color:'white', border:'1px solid rgba(148,163,184,0.2)', outline:'none'}} />
            </div>
          </div>
          <button onClick={handleCalc} className="btn btn-primary w-full py-2 text-xs mb-4">
            🔄 Recalculate
          </button>

          {calcResult && (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{background:'#1e293b', border:'1px solid rgba(148,163,184,0.2)', borderRadius:8, color:'#f1f5f9'}}
                    formatter={(v) => [`${formatNumber(v)} kg CO₂`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
                <div><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#f97316'}}></span>Mfg: {formatNumber(calcResult.emissions.manufacturing_kg)}</div>
                <div><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#3b82f6'}}></span>Ops: {formatNumber(calcResult.emissions.operational_kg)}</div>
                <div><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#ef4444'}}></span>Disp: {formatNumber(calcResult.emissions.disposal_kg)}</div>
              </div>
              <div className="mt-3 text-center text-xs text-[#94a3b8]">
                {calcResult.emissions.emission_per_km} kg CO₂/km • Grid: {calcResult.grid_intensity} kg CO₂/kWh
              </div>
            </>
          )}
        </div>
      </div>

      {/* Greenwash Flags */}
      {calcResult?.greenwash_flags?.length > 0 && (
        <div className="glass-card mt-6">
          <h3 className="font-bold mb-4">🚩 Greenwashing Alerts</h3>
          {calcResult.greenwash_flags.map((flag, i) => (
            <div key={i} className={`greenwash-flag ${flag.severity}`}>
              <div className="text-sm font-bold mb-1">⚠️ {flag.claim}</div>
              <div className="text-sm text-[#94a3b8]">{flag.reality}</div>
              <div className="text-sm text-[#14b8a6] mt-1.5">💡 {flag.recommendation}</div>
            </div>
          ))}
        </div>
      )}

      {/* Share / Download */}
      <div className="glass-card mt-6 flex flex-wrap items-center justify-center gap-4">
        <button className="btn btn-primary">📥 Download Carbon Passport PDF</button>
        <button className="btn btn-secondary">📤 Share on WhatsApp</button>
        <button className="btn btn-secondary">🔗 Copy Link</button>
      </div>
    </div>
  )
}
