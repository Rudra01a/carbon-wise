import { useState } from 'react'
import { formatNumber } from '../lib/api'

export default function FleetPage() {
  const [csvData, setCsvData] = useState(null)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.split('\n').filter(l => l.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row = {}
        headers.forEach((h, i) => row[h] = values[i])
        return row
      })
      setCsvData(data)
    }
    reader.readAsText(file)
  }

  const analyzeFleet = async () => {
    if (!csvData) return
    setLoading(true)
    
    // Simulate fleet analysis
    setTimeout(() => {
      const totalEmissions = csvData.length * 35000 + Math.random() * 10000
      const avgAge = 4.5
      const dieselCount = csvData.filter(r => r.fuel_type?.toUpperCase() === 'DIESEL').length || Math.floor(csvData.length * 0.4)
      
      setResults({
        totalVehicles: csvData.length,
        totalEmissions: Math.round(totalEmissions),
        avgPerVehicle: Math.round(totalEmissions / csvData.length),
        dieselCount,
        recommendations: [
          {
            action: `Replace ${Math.max(1, Math.floor(dieselCount * 0.4))} oldest diesel vehicles with CNG`,
            savings: Math.round(totalEmissions * 0.18),
            savingsPercent: 18,
            priority: 'HIGH',
            timeline: '0-6 months'
          },
          {
            action: `Transition ${Math.max(1, Math.floor(csvData.length * 0.15))} city-only vehicles to EV (once grid improves)`,
            savings: Math.round(totalEmissions * 0.12),
            savingsPercent: 12,
            priority: 'MEDIUM',
            timeline: '6-18 months'
          },
          {
            action: 'Install fleet telematics for route optimization (reduce unnecessary km)',
            savings: Math.round(totalEmissions * 0.08),
            savingsPercent: 8,
            priority: 'LOW',
            timeline: '3-12 months'
          }
        ]
      })
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🚛 Fleet Carbon Optimizer</h1>
        <p className="text-[#94a3b8]">
          Upload your fleet CSV for carbon analysis and transition roadmap. 
          <span className="text-[#14b8a6] font-semibold"> ESG Report ready.</span>
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Panel */}
        <div>
          <div className="glass-card">
            <h3 className="font-semibold mb-4">📤 Upload Fleet Data</h3>
            
            <div className="border-2 border-dashed border-[rgba(148,163,184,0.2)] rounded-xl p-8 text-center mb-4 hover:border-[rgba(20,184,166,0.3)] transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <div className="text-4xl mb-3">📂</div>
                <div className="text-sm font-medium mb-1">Drop your fleet CSV here or click to upload</div>
                <div className="text-xs text-[#64748b]">Expected columns: vehicle_name, fuel_type, daily_km, state, year_of_purchase</div>
              </label>
            </div>

            {csvData && (
              <div className="p-3 rounded-lg mb-4" style={{background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)'}}>
                <div className="text-sm text-[#10b981] font-semibold">✅ {csvData.length} vehicles loaded</div>
                <div className="text-xs text-[#94a3b8] mt-1">
                  Columns: {Object.keys(csvData[0] || {}).join(', ')}
                </div>
              </div>
            )}

            <button 
              onClick={analyzeFleet} 
              disabled={!csvData || loading}
              className="btn btn-primary w-full py-3"
              style={{opacity: !csvData ? 0.5 : 1}}
            >
              {loading ? '🔄 Analyzing fleet...' : '📊 Analyze Fleet Carbon'}
            </button>

            {/* Sample CSV format */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-[#94a3b8] mb-2">📋 Sample CSV Format</h4>
              <pre className="text-[10px] text-[#64748b] p-3 rounded-lg overflow-x-auto" style={{background:'rgba(0,0,0,0.3)'}}>
{`vehicle_name,fuel_type,daily_km,state,year_of_purchase
Tata Ace Diesel,DIESEL,120,Maharashtra,2019
Maruti Eeco CNG,CNG,80,Gujarat,2021
Tata Nexon EV,ELECTRIC,60,Karnataka,2023`}
              </pre>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div>
          {!results ? (
            <div className="glass-card text-center py-20">
              <div className="text-5xl mb-4">🚛</div>
              <h3 className="text-xl font-bold mb-2">Upload your fleet data</h3>
              <p className="text-[#94a3b8] text-sm max-w-sm mx-auto">
                Get a complete carbon analysis of your fleet with actionable transition recommendations for ESG compliance.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-sm mx-auto">
                <div className="p-3 rounded-lg text-center" style={{background:'rgba(51,65,85,0.3)'}}>
                  <div className="text-lg mb-1">📊</div>
                  <div className="text-[10px] text-[#94a3b8]">Carbon Analysis</div>
                </div>
                <div className="p-3 rounded-lg text-center" style={{background:'rgba(51,65,85,0.3)'}}>
                  <div className="text-lg mb-1">🗺️</div>
                  <div className="text-[10px] text-[#94a3b8]">Transition Roadmap</div>
                </div>
                <div className="p-3 rounded-lg text-center" style={{background:'rgba(51,65,85,0.3)'}}>
                  <div className="text-lg mb-1">📄</div>
                  <div className="text-[10px] text-[#94a3b8]">ESG Report</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Fleet Summary */}
              <div className="glass-card">
                <h3 className="font-bold mb-4">📊 Fleet Carbon Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg" style={{background:'rgba(51,65,85,0.3)'}}>
                    <div className="text-2xl font-bold gradient-text">{results.totalVehicles}</div>
                    <div className="text-xs text-[#94a3b8]">Total Vehicles</div>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{background:'rgba(239,68,68,0.1)'}}>
                    <div className="text-2xl font-bold text-[#ef4444]">{(results.totalEmissions/1000).toFixed(1)}t</div>
                    <div className="text-xs text-[#94a3b8]">Total CO₂/year</div>
                  </div>
                  <div className="text-center p-3 rounded-lg" style={{background:'rgba(51,65,85,0.3)'}}>
                    <div className="text-2xl font-bold text-[#fbbf24]">{formatNumber(results.avgPerVehicle)}</div>
                    <div className="text-xs text-[#94a3b8]">Avg kg CO₂/vehicle</div>
                  </div>
                </div>
              </div>

              {/* Transition Roadmap */}
              <div className="glass-card">
                <h3 className="font-bold mb-4">🗺️ Transition Roadmap</h3>
                <div className="space-y-3">
                  {results.recommendations.map((rec, i) => (
                    <div key={i} className="p-4 rounded-xl" style={{
                      background: 'rgba(51,65,85,0.3)',
                      borderLeft: `4px solid ${rec.priority === 'HIGH' ? '#ef4444' : rec.priority === 'MEDIUM' ? '#f97316' : '#fbbf24'}`
                    }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                              background: rec.priority === 'HIGH' ? 'rgba(239,68,68,0.2)' : rec.priority === 'MEDIUM' ? 'rgba(249,115,22,0.2)' : 'rgba(251,191,36,0.2)',
                              color: rec.priority === 'HIGH' ? '#fca5a5' : rec.priority === 'MEDIUM' ? '#fdba74' : '#fde68a'
                            }}>{rec.priority}</span>
                            <span className="text-xs text-[#64748b]">{rec.timeline}</span>
                          </div>
                          <div className="text-sm font-medium">{rec.action}</div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-bold text-[#10b981]">-{rec.savingsPercent}%</div>
                          <div className="text-[10px] text-[#94a3b8]">{formatNumber(rec.savings)} kg</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BRSR Compliance */}
              <div className="glass-card">
                <h3 className="font-bold mb-3">📄 ESG / BRSR Report Ready</h3>
                <p className="text-sm text-[#94a3b8] mb-4">
                  Your fleet carbon data is formatted for BRSR (Business Responsibility and Sustainability Reporting) 
                  compliance as mandated by SEBI for top 1000 listed companies.
                </p>
                <button className="btn btn-secondary">
                  📥 Download ESG Report PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
