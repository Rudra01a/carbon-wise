import { useState, useEffect } from 'react'
import { fetchVehicles, fetchGridIntensity, compareVehicles, formatNumber } from '../lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function ComparePage() {
  const [vehicles, setVehicles] = useState([])
  const [states, setStates] = useState([])
  const [selected, setSelected] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [form, setForm] = useState({ state: 'Maharashtra', daily_km: 40, years: 6, usage_pattern: 'MIXED' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchVehicles()
      .then(d => setVehicles(d.vehicles || []))
      .catch(e => console.error('Failed to load vehicles:', e))
    fetchGridIntensity()
      .then(d => setStates(d.states || []))
      .catch(e => console.error('Failed to load states:', e))
  }, [])

  const filteredVehicles = vehicles.filter(v => {
    const term = searchTerm.toLowerCase()
    return `${v.make} ${v.model} ${v.variant}`.toLowerCase().includes(term) &&
           !selected.find(s => s.id === v.id)
  })

  const addVehicle = (v) => {
    if (selected.length < 4) setSelected([...selected, v])
  }

  const removeVehicle = (id) => {
    setSelected(selected.filter(v => v.id !== id))
    setResult(null)
    setError(null)
  }

  const handleCompare = async () => {
    if (selected.length < 2) return
    setLoading(true)
    setError(null)
    try {
      const data = await compareVehicles({
        vehicle_ids: selected.map(v => v.id),
        state: form.state,
        daily_km: form.daily_km,
        years: form.years,
        usage_pattern: form.usage_pattern
      })
      setResult(data)
    } catch (e) {
      console.error(e)
      setError('Failed to compare vehicles. Please check your connection and try again.')
    }
    setLoading(false)
  }

  // Prepare chart data
  const barData = result?.results?.map(r => ({
    name: `${r.vehicle.make} ${r.vehicle.model}`,
    Manufacturing: r.emissions.manufacturing_kg,
    Operational: r.emissions.operational_kg,
    Disposal: r.emissions.disposal_kg,
    total: r.emissions.total_kg
  })) || []

  // Prepare timeline data
  const timelineData = []
  if (result?.results) {
    const maxMonths = form.years * 12
    for (let m = 0; m <= maxMonths; m += 3) {
      const point = { month: m, year: (m/12).toFixed(1) }
      result.results.forEach(r => {
        const t = r.timeline?.find(t => t.month === m)
        if (t) point[`${r.vehicle.make} ${r.vehicle.model}`] = t.cumulative_kg
      })
      timelineData.push(point)
    }
  }

  const lineColors = ['#22C55E', '#ef4444', '#f97316', '#a855f7']

  const tooltipStyle = {
    background: '#161B22',
    border: '1px solid #30363D',
    borderRadius: 8,
    color: '#E6EDF3'
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 80px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#E6EDF3', marginBottom: '8px' }}>
          Compare Vehicles
        </h1>
        <p style={{ color: '#8B949E', fontSize: '15px' }}>
          Select up to 4 vehicles for a side-by-side lifecycle carbon comparison.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ========== Left Panel: Vehicle Selector ========== */}
        <div className="lg:col-span-1">
          <div className="glass-card" style={{ position: 'sticky', top: '80px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#E6EDF3', marginBottom: '12px' }}>
              Select Vehicles ({selected.length}/4)
            </h3>

            <input
              type="text"
              placeholder="Search vehicles..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ marginBottom: '12px' }}
            />

            {/* Selected vehicles */}
            {selected.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {selected.map(v => (
                  <div key={v.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: '8px',
                    background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)'
                  }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#E6EDF3' }}>{v.make} {v.model}</span>
                      <span className={`fuel-badge ${v.fuel_type.toLowerCase()}`} style={{ marginLeft: '8px' }}>{v.fuel_type}</span>
                    </div>
                    <button
                      onClick={() => removeVehicle(v.id)}
                      style={{ color: '#ef4444', fontSize: '14px', cursor: 'pointer', background: 'none', border: 'none' }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Vehicle list */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredVehicles.slice(0, 15).map(v => (
                <button
                  key={v.id}
                  onClick={() => addVehicle(v)}
                  disabled={selected.length >= 4}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px',
                    fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s',
                    background: 'rgba(33,38,45,0.5)', border: '1px solid transparent', color: '#E6EDF3'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>{v.make} {v.model}</span>
                    <span className={`fuel-badge ${v.fuel_type.toLowerCase()}`}>{v.fuel_type}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8B949E', marginTop: '2px' }}>
                    {v.variant} • ₹{v.price_lakh}L
                  </div>
                </button>
              ))}
            </div>

            {/* Comparison Settings */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #30363D', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8B949E', marginBottom: '4px' }}>State</label>
                <select value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full">
                  {states.map(s => <option key={s.state_name} value={s.state_name}>{s.state_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8B949E', marginBottom: '4px' }}>Daily km</label>
                  <input type="number" value={form.daily_km} onChange={e => setForm({...form, daily_km: +e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8B949E', marginBottom: '4px' }}>Years</label>
                  <input type="number" value={form.years} onChange={e => setForm({...form, years: +e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8B949E', marginBottom: '4px' }}>Usage Pattern</label>
                <select value={form.usage_pattern} onChange={e => setForm({...form, usage_pattern: e.target.value})} className="w-full">
                  <option value="CITY">City</option>
                  <option value="HIGHWAY">Highway</option>
                  <option value="MIXED">Mixed</option>
                </select>
              </div>
              <button
                onClick={handleCompare}
                disabled={selected.length < 2 || loading}
                className="btn btn-primary w-full"
                style={{ height: '44px', marginTop: '4px' }}
              >
                {loading ? (
                  <><span className="spinner" style={{ marginRight: '8px' }}></span> Comparing...</>
                ) : `Compare ${selected.length} Vehicles`}
              </button>
            </div>
          </div>
        </div>

        {/* ========== Right Panel: Results ========== */}
        <div className="lg:col-span-2">
          {/* Error state */}
          {error && (
            <div style={{
              padding: '16px 20px', marginBottom: '16px',
              borderRadius: '12px', background: '#1F0F0F', border: '1px solid rgba(255,68,68,0.3)',
              color: '#fca5a5', fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {!result && !error ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>⚖️</div>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#E6EDF3', marginBottom: '8px' }}>
                Select vehicles to compare
              </h3>
              <p style={{ color: '#8B949E', fontSize: '14px' }}>
                Choose 2–4 vehicles from the left panel and click Compare
              </p>
            </div>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Grid intensity info */}
              <div className="glass-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', flexWrap: 'wrap' }}>
                  <span>📍 {result.state}</span>
                  <span style={{ color: '#30363D' }}>•</span>
                  <span>Grid: <strong style={{ color: '#22C55E' }}>{result.grid_intensity} kg CO₂/kWh</strong></span>
                  <span style={{ color: '#30363D' }}>•</span>
                  <span>{result.daily_km} km/day</span>
                  <span style={{ color: '#30363D' }}>•</span>
                  <span>{result.years} years</span>
                </div>
              </div>

              {/* Stacked Bar Chart */}
              <div className="glass-card">
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#E6EDF3', marginBottom: '16px' }}>
                  Lifecycle Carbon Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={barData} layout="vertical" margin={{left: 80}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(48,54,61,0.8)" />
                    <XAxis type="number" tick={{fill:'#8B949E', fontSize:12}} tickFormatter={v => `${(v/1000).toFixed(0)}t`} />
                    <YAxis dataKey="name" type="category" tick={{fill:'#E6EDF3', fontSize:12}} width={100} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${formatNumber(value)} kg CO₂`, '']} />
                    <Legend />
                    <Bar dataKey="Manufacturing" stackId="a" fill="#f97316" />
                    <Bar dataKey="Operational" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Disposal" stackId="a" fill="#ef4444" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Table */}
              <div className="glass-card" style={{ overflowX: 'auto' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#E6EDF3', marginBottom: '16px' }}>
                  Comparison Summary
                </h3>
                <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #30363D' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', color: '#8B949E', fontWeight: 500 }}>Vehicle</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#8B949E', fontWeight: 500 }}>Mfg</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#8B949E', fontWeight: 500 }}>Ops</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#8B949E', fontWeight: 500 }}>Disposal</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#8B949E', fontWeight: 500 }}>Total</th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', color: '#8B949E', fontWeight: 500 }}>per km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.results.map((r, i) => (
                      <tr key={r.vehicle.id} style={{ borderBottom: '1px solid rgba(48,54,61,0.5)' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {i === 0 && <span title="Lowest emissions">🏆</span>}
                            <div>
                              <div style={{ fontWeight: 600 }}>{r.vehicle.make} {r.vehicle.model}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                <span className={`fuel-badge ${r.vehicle.fuel_type.toLowerCase()}`}>{r.vehicle.fuel_type}</span>
                                <span style={{ fontSize: '11px', color: '#484F58' }}>{r.vehicle.variant}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', color: '#f97316' }}>{formatNumber(r.emissions.manufacturing_kg)}</td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', color: '#3b82f6' }}>{formatNumber(r.emissions.operational_kg)}</td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', color: '#ef4444' }}>{formatNumber(r.emissions.disposal_kg)}</td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 700, color: '#E6EDF3' }}>{formatNumber(r.emissions.total_kg)}</td>
                        <td style={{ textAlign: 'right', padding: '12px 8px', color: '#8B949E' }}>{r.emissions.emission_per_km} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Breakeven Timeline */}
              {timelineData.length > 0 && (
                <div className="glass-card">
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#E6EDF3', marginBottom: '4px' }}>
                    Carbon Accumulation Timeline
                  </h3>
                  <p style={{ fontSize: '13px', color: '#8B949E', marginBottom: '16px' }}>
                    Month-by-month cumulative CO₂ — watch when cleaner vehicles overtake dirtier ones
                  </p>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={timelineData} margin={{left:10, right:20}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(48,54,61,0.8)" />
                      <XAxis dataKey="year" tick={{fill:'#8B949E', fontSize:11}} label={{value:'Years', position:'bottom', fill:'#484F58', fontSize:11}} />
                      <YAxis tick={{fill:'#8B949E', fontSize:11}} tickFormatter={v => `${(v/1000).toFixed(0)}t`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${formatNumber(Math.round(value))} kg CO₂`, '']} />
                      <Legend />
                      {result.results.map((r, i) => (
                        <Line
                          key={r.vehicle.id}
                          type="monotone"
                          dataKey={`${r.vehicle.make} ${r.vehicle.model}`}
                          stroke={lineColors[i]}
                          strokeWidth={2.5}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Breakeven Analysis */}
              {result.breakeven_analysis?.length > 0 && (
                <div className="glass-card">
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#E6EDF3', marginBottom: '16px' }}>
                    Breakeven Analysis
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {result.breakeven_analysis.map((b, i) => (
                      <div key={i} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(33,38,45,0.5)' }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                          {b.ev} vs {b.ice}
                        </div>
                        {b.willBreakeven ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#22C55E' }}>
                              ✅ EV breaks even at <strong>{b.breakevenYears} years</strong> ({formatNumber(b.breakevenKm)} km)
                            </span>
                            {b.breakevenYears <= form.years ? (
                              <span style={{ fontSize: '12px', background: 'rgba(34,197,94,0.12)', color: '#86efac', padding: '2px 10px', borderRadius: '100px' }}>
                                Within your ownership period
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', padding: '2px 10px', borderRadius: '100px' }}>
                                Beyond your {form.years}-year plan
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '14px', color: '#fca5a5' }}>❌ {b.reason}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Greenwash Flags */}
              {result.results.some(r => r.greenwash_flags?.length > 0) && (
                <div className="glass-card">
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#E6EDF3', marginBottom: '16px' }}>
                    Greenwashing Flags
                  </h3>
                  {result.results.filter(r => r.greenwash_flags?.length > 0).map(r => (
                    <div key={r.vehicle.id} style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{r.vehicle.make} {r.vehicle.model}</div>
                      {r.greenwash_flags.map((flag, i) => (
                        <div key={i} className={`greenwash-flag ${flag.severity}`}>
                          <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>{flag.claim}</div>
                          <div style={{ fontSize: '12px', color: '#8B949E' }}>{flag.reality}</div>
                          <div style={{ fontSize: '12px', color: '#22C55E', marginTop: '4px', fontWeight: 500 }}>💡 {flag.recommendation}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
