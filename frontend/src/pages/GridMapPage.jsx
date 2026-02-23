import { useState, useEffect } from 'react'
import { fetchGridIntensity } from '../lib/api'

export default function GridMapPage() {
  const [states, setStates] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchGridIntensity().then(d => setStates(d.states || []))
  }, [])

  const filtered = states.filter(s => 
    s.state_name.toLowerCase().includes(search.toLowerCase())
  )

  const maxIntensity = Math.max(...states.map(s => s.intensity_kg_per_kwh), 1)
  const avgIntensity = states.length ? (states.reduce((a,s) => a + s.intensity_kg_per_kwh, 0) / states.length).toFixed(2) : '0'

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🗺️ State Grid Carbon Intensity</h1>
        <p className="text-[#94a3b8]">
          India's electricity grid varies hugely by state. An EV charged in Sikkim is radically greener than one charged in Jharkhand.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card text-center p-4">
          <div className="text-2xl font-bold gradient-text">{states.length}</div>
          <div className="text-xs text-[#94a3b8]">States & UTs</div>
        </div>
        <div className="glass-card text-center p-4">
          <div className="text-2xl font-bold text-[#10b981]">{states.filter(s => s.intensity_kg_per_kwh <= 0.3).length}</div>
          <div className="text-xs text-[#94a3b8]">Very Clean Grids</div>
        </div>
        <div className="glass-card text-center p-4">
          <div className="text-2xl font-bold text-[#ef4444]">{states.filter(s => s.intensity_kg_per_kwh > 0.85).length}</div>
          <div className="text-xs text-[#94a3b8]">Carbon Heavy Grids</div>
        </div>
        <div className="glass-card text-center p-4">
          <div className="text-2xl font-bold text-[#fbbf24]">{avgIntensity}</div>
          <div className="text-xs text-[#94a3b8]">Avg kg CO₂/kWh</div>
        </div>
      </div>

      {/* Legend */}
      <div className="glass-card mb-6 p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-semibold text-[#94a3b8]">Grid Carbon Intensity:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{background:'#10b981'}}></span> Very Clean (≤0.3)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{background:'#34d399'}}></span> Clean (0.3–0.5)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{background:'#fbbf24'}}></span> Moderate (0.5–0.7)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{background:'#f97316'}}></span> Carbon Heavy (0.7–0.85)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{background:'#ef4444'}}></span> Very Carbon Heavy ({'>'}0.85)</span>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Search states..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full mb-6 px-4 py-3 rounded-xl text-sm"
        style={{background:'var(--color-surface-light)', color:'var(--color-text)', border:'1px solid rgba(148,163,184,0.2)', outline:'none'}}
      />

      {/* State Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.state_name} className="glass-card p-4 flex items-center gap-4">
            <div className="w-3 h-12 rounded-full" style={{background: s.color}}></div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{s.state_name}</div>
              <div className="text-xs text-[#94a3b8]">{s.category}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{color: s.color}}>{s.intensity_kg_per_kwh}</div>
              <div className="text-[10px] text-[#64748b]">kg CO₂/kWh</div>
            </div>
            <div className="w-24">
              <div className="h-2 rounded-full overflow-hidden" style={{background:'rgba(51,65,85,0.5)'}}>
                <div className="h-full rounded-full" style={{
                  width: `${(s.intensity_kg_per_kwh / maxIntensity) * 100}%`,
                  background: s.color
                }}></div>
              </div>
              <div className="text-[10px] text-[#64748b] mt-0.5 text-right">🌿 {s.renewable_pct}%</div>
            </div>
          </div>
        ))}
      </div>

      {/* Data source */}
      <div className="mt-8 text-center text-xs text-[#64748b]">
        Data source: Central Electricity Authority (CEA) CO₂ Baseline Database v20, {states[0]?.data_year || 2024}
      </div>
    </div>
  )
}
