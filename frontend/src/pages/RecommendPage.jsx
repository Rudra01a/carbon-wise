import { useState, useEffect } from 'react';
import { getRecommendations, fetchGridIntensity, formatCO2, formatNumber, getFuelColor, getFuelLabel } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const STATES_CACHE_KEY = 'cw_states';

const BUDGET_PILLS = [
  { label: 'Under ₹8L', min: 0, max: 8 },
  { label: '₹8L – ₹15L', min: 8, max: 15 },
  { label: '₹15L – ₹25L', min: 15, max: 25 },
  { label: '₹25L – ₹50L', min: 25, max: 50 },
  { label: '₹50L – ₹1Cr', min: 50, max: 100 },
  { label: 'Over ₹1Cr', min: 100, max: 999 },
];

const FUEL_OPTIONS = ['ANY', 'PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID'];
const SEATING_OPTIONS = [0, 4, 5, 6, 7, 8];

function getConfidenceBadge(source) {
  if (!source) return { label: 'Unknown', color: '#6b7280' };
  if (source === 'ARAI') return { label: 'ARAI Verified', color: '#22c55e' };
  if (source === 'Manufacturer') return { label: 'Manufacturer Data', color: '#3b82f6' };
  return { label: 'Estimated', color: '#f59e0b' };
}

export default function RecommendPage() {
  const [states, setStates] = useState([]);
  const [form, setForm] = useState({
    state: '', daily_km: 40, years: 8,
    usage_pattern: 'MIXED',
    min_budget: '', max_budget: '',
    fuel_type_preference: 'ANY',
    min_seating: 0,
  });
  const [activePill, setActivePill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchGridIntensity()
      .then(data => {
        const list = data?.states || [];
        setStates(list);
        if (list.length > 0 && !form.state) {
          setForm(f => ({ ...f, state: list[0].state_name }));
        }
      })
      .catch(() => {});
  }, []);

  const handlePill = (pill, idx) => {
    setActivePill(idx);
    setForm(f => ({ ...f, min_budget: pill.min, max_budget: pill.max }));
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!form.state) return;

    const minB = parseFloat(form.min_budget) || 0;
    const maxB = parseFloat(form.max_budget) || 999;
    if (minB >= maxB) {
      setError('Min budget must be less than max budget');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await getRecommendations({
        state: form.state,
        daily_km: form.daily_km,
        years: form.years,
        usage_pattern: form.usage_pattern,
        min_budget: minB > 0 ? minB : undefined,
        max_budget: maxB < 999 ? maxB : undefined,
        fuel_type_preference: form.fuel_type_preference,
        min_seating: form.min_seating > 0 ? form.min_seating : undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const chartData = result?.recommendations?.map(r => ({
    name: `${r.vehicle.make} ${r.vehicle.model}`,
    total: r.emissions.total_kg,
    mfg: r.emissions.manufacturing_kg,
    ops: r.emissions.operational_kg,
    disposal: r.emissions.disposal_kg,
    fuel: r.vehicle.fuel_type,
  })) || [];

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#e6edf3', marginBottom: 8 }}>
          Smart Carbon Recommendations
        </h1>
        <p style={{ color: '#8b949e', fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
          Tell us your driving profile and budget — we'll find the vehicles with the lowest lifecycle carbon footprint.
        </p>
      </div>

      {/* Input Form */}
      <div className="glass-card" style={{ maxWidth: 800, margin: '0 auto 48px', padding: 32 }}>
        <form onSubmit={handleSubmit}>
          {/* Row 1: State + Usage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>State</label>
              <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} style={inputStyle}>
                {states.map(s => <option key={s.state_name} value={s.state_name}>{s.state_name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Driving Pattern</label>
              <select value={form.usage_pattern} onChange={e => setForm(f => ({ ...f, usage_pattern: e.target.value }))} style={inputStyle}>
                <option value="CITY">City</option>
                <option value="HIGHWAY">Highway</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>
          </div>

          {/* Row 2: Daily km + Years */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Daily km</label>
              <input type="number" min={5} max={300} value={form.daily_km}
                onChange={e => setForm(f => ({ ...f, daily_km: parseInt(e.target.value) || 0 }))}
                style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ownership (years)</label>
              <input type="number" min={1} max={20} value={form.years}
                onChange={e => setForm(f => ({ ...f, years: parseInt(e.target.value) || 0 }))}
                style={inputStyle} />
            </div>
          </div>

          {/* Row 3: Budget Range */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Budget Range (₹ Lakh)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {BUDGET_PILLS.map((pill, i) => (
                <button type="button" key={i}
                  onClick={() => handlePill(pill, i)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, border: '1px solid',
                    borderColor: activePill === i ? '#22c55e' : '#30363d',
                    background: activePill === i ? 'rgba(34,197,94,0.15)' : 'transparent',
                    color: activePill === i ? '#22c55e' : '#8b949e',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .2s',
                  }}>
                  {pill.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <input type="number" min={0} placeholder="Min (₹L)" value={form.min_budget}
                  onChange={e => { setActivePill(null); setForm(f => ({ ...f, min_budget: e.target.value })); }}
                  style={inputStyle} />
              </div>
              <div>
                <input type="number" min={0} placeholder="Max (₹L)" value={form.max_budget}
                  onChange={e => { setActivePill(null); setForm(f => ({ ...f, max_budget: e.target.value })); }}
                  style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Row 4: Fuel preference + Seating */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Fuel Preference</label>
              <select value={form.fuel_type_preference} onChange={e => setForm(f => ({ ...f, fuel_type_preference: e.target.value }))} style={inputStyle}>
                {FUEL_OPTIONS.map(f => <option key={f} value={f}>{f === 'ANY' ? 'Any Fuel Type' : getFuelLabel(f)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Min Seating</label>
              <select value={form.min_seating} onChange={e => setForm(f => ({ ...f, min_seating: parseInt(e.target.value) }))} style={inputStyle}>
                {SEATING_OPTIONS.map(s => <option key={s} value={s}>{s === 0 ? 'Any' : `${s}+`}</option>)}
              </select>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width: '100%', padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Analyzing...' : 'Get Recommendations'}
          </button>

          {error && <p style={{ color: '#ef4444', marginTop: 12, textAlign: 'center', fontSize: 14 }}>{error}</p>}
        </form>
      </div>

      {/* Results */}
      {result && result.recommendations && result.recommendations.length > 0 && (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* Summary Bar */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center',
            marginBottom: 36, padding: '16px 24px',
            background: '#161b22', border: '1px solid #30363d', borderRadius: 12,
          }}>
            <Stat label="Vehicles Evaluated" value={result.total_evaluated} />
            <Stat label="Grid Intensity" value={`${result.grid_intensity} kg/kWh`} />
            <Stat label="Avg Carbon in Budget" value={formatCO2(result.avg_budget_carbon_kg || 0)} />
          </div>

          {/* Chart */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 36 }}>
            <h3 style={{ color: '#e6edf3', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              Lifecycle CO₂ Comparison
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 24, top: 8, bottom: 8 }}>
                <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 12 }} tickFormatter={v => formatCO2(v)} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#e6edf3', fontSize: 13 }} width={100} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, color: '#e6edf3' }}
                  formatter={(v) => formatCO2(v)}
                />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {chartData.map((d, i) => <Cell key={i} fill={getFuelColor(d.fuel)} />)}
                </Bar>
                {result.avg_budget_carbon_kg > 0 && (
                  <ReferenceLine x={result.avg_budget_carbon_kg} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Avg', fill: '#f59e0b', fontSize: 11 }} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recommendation Cards */}
          <div style={{ display: 'grid', gap: 24 }}>
            {result.recommendations.map((rec) => {
              const badge = getConfidenceBadge(rec.vehicle.data_source);
              return (
                <div key={rec.vehicle.id} className="glass-card" style={{ padding: 28 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span className="rank-badge">{rec.rank}</span>
                      <div>
                        <h3 style={{ color: '#e6edf3', fontSize: 20, fontWeight: 700, margin: 0 }}>
                          {rec.vehicle.make} {rec.vehicle.model}
                        </h3>
                        <p style={{ color: '#8b949e', fontSize: 13, margin: 0 }}>{rec.vehicle.variant}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {rec.label && (
                        <span style={{
                          padding: '4px 12px', borderRadius: 16,
                          background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                          fontSize: 12, fontWeight: 600,
                        }}>
                          {rec.label}
                        </span>
                      )}
                      <span style={{
                        padding: '4px 10px', borderRadius: 12,
                        border: `1px solid ${getFuelColor(rec.vehicle.fuel_type)}`,
                        color: getFuelColor(rec.vehicle.fuel_type),
                        fontSize: 12, fontWeight: 600,
                      }}>
                        {getFuelLabel(rec.vehicle.fuel_type)}
                      </span>
                      <span style={{
                        padding: '4px 10px', borderRadius: 12,
                        background: `${badge.color}18`,
                        color: badge.color, fontSize: 11, fontWeight: 600,
                      }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                    <MiniStat label="Total CO₂" value={formatCO2(rec.emissions.total_kg)} highlight />
                    <MiniStat label="Manufacturing" value={formatCO2(rec.emissions.manufacturing_kg)} />
                    <MiniStat label="Operational" value={formatCO2(rec.emissions.operational_kg)} />
                    <MiniStat label="Disposal" value={formatCO2(rec.emissions.disposal_kg)} />
                    <MiniStat label="Price" value={`₹${rec.vehicle.price_lakh}L`} />
                    <MiniStat label="TCO" value={`₹${(rec.tco.total_cost / 100000).toFixed(1)}L`} />
                  </div>

                  {/* Explanation */}
                  <p style={{ color: '#8b949e', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                    {rec.explanation}
                  </p>

                  {/* Greenwash Flags */}
                  {rec.greenwash_flags && rec.greenwash_flags.length > 0 && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
                      <p style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, margin: '0 0 6px' }}>Greenwash Alerts</p>
                      {rec.greenwash_flags.map((f, i) => (
                        <p key={i} style={{ color: '#8b949e', fontSize: 12, margin: '2px 0' }}>
                          <span style={{ color: '#f59e0b' }}>{f.severity}</span> — {f.reality?.substring(0, 120)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {result && result.recommendations && result.recommendations.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#8b949e' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>No vehicles match your criteria.</p>
          <p style={{ fontSize: 14 }}>Try widening your budget range or changing fuel preference.</p>
        </div>
      )}
    </div>
  );
}

/* Mini Components */
function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 16px' }}>
      <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#8b949e', fontSize: 12 }}>{label}</div>
    </div>
  );
}

function MiniStat({ label, value, highlight }) {
  return (
    <div style={{ background: '#0d1117', borderRadius: 8, padding: '10px 14px', border: '1px solid #30363d' }}>
      <div style={{ color: highlight ? '#22c55e' : '#e6edf3', fontSize: 16, fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#8b949e', fontSize: 11 }}>{label}</div>
    </div>
  );
}

/* Styles */
const labelStyle = {
  display: 'block', color: '#8b949e', fontSize: 13,
  fontWeight: 500, marginBottom: 6,
};

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #30363d', background: '#0d1117',
  color: '#e6edf3', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
