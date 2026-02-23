import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchVehicles, fetchGridIntensity, getRecommendations, formatNumber } from '../lib/api'

export default function HomePage() {
  const navigate = useNavigate()
  const [states, setStates] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({ state: 'Maharashtra', daily_km: 40, years: 5 })
  const [quickResult, setQuickResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statsAnimated, setStatsAnimated] = useState(false)

  useEffect(() => {
    fetchGridIntensity()
      .then(d => setStates(d.states || []))
      .catch(e => console.error('Failed to load states:', e))
    fetchVehicles()
      .then(d => setVehicles(d.vehicles || []))
      .catch(e => console.error('Failed to load vehicles:', e))
    setTimeout(() => setStatsAnimated(true), 500)
  }, [])

  const handleQuickCalc = async () => {
    setLoading(true)
    try {
      const data = await getRecommendations({
        state: form.state,
        daily_km: form.daily_km,
        years: form.years
      })
      setQuickResult(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div>
      {/* ===================== HERO SECTION ===================== */}
      <section className="hero-section">
        <div className="hero-grid">
          {/* Left Column */}
          <div className="fade-in-up">
            <span className="pill-label" style={{ marginBottom: '24px', display: 'inline-flex' }}>
              India's First Lifecycle Carbon Platform
            </span>

            <h1 style={{ fontSize: '48px', fontWeight: 700, color: '#E6EDF3', lineHeight: 1.15, marginBottom: '20px', marginTop: '24px' }}>
              Know the <span className="gradient-text">Truth</span>
              <br />Before You Drive
            </h1>

            <p style={{ fontSize: '18px', color: '#8B949E', lineHeight: 1.6, maxWidth: '480px', marginBottom: '32px' }}>
              Compare the <strong style={{ color: '#E6EDF3' }}>real lifecycle carbon cost</strong> of every car in India —
              from factory to scrapyard. No greenwashing. No marketing spin. Just data.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <Link to="/compare" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '15px' }}>
                Compare Vehicles
              </Link>
              <Link to="/recommend" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '15px' }}>
                Get Recommendation
              </Link>
            </div>
          </div>

          {/* Right Column — Calculator Card */}
          <div className="fade-in-up glass-card" style={{ animationDelay: '0.2s' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#E6EDF3', marginBottom: '4px' }}>
              Find the Greenest Car in 10 Seconds
            </h3>
            <p style={{ fontSize: '13px', color: '#8B949E', marginBottom: '20px' }}>
              Quick carbon check based on your driving profile
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* State */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8B949E', marginBottom: '6px' }}>
                  Your State
                </label>
                <select
                  value={form.state}
                  onChange={e => setForm({...form, state: e.target.value})}
                  className="w-full"
                >
                  {states.map(s => (
                    <option key={s.state_name} value={s.state_name}>{s.state_name}</option>
                  ))}
                </select>
              </div>

              {/* Daily Driving */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8B949E', marginBottom: '6px' }}>
                  Daily Driving: <span style={{ color: '#E6EDF3', fontWeight: 700 }}>{form.daily_km} km</span>
                </label>
                <input
                  type="range" min="5" max="150" value={form.daily_km}
                  onChange={e => setForm({...form, daily_km: +e.target.value})}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#484F58', marginTop: '4px' }}>
                  <span>5 km</span><span>75 km</span><span>150 km</span>
                </div>
              </div>

              {/* Ownership */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#8B949E', marginBottom: '6px' }}>
                  Ownership: <span style={{ color: '#E6EDF3', fontWeight: 700 }}>{form.years} years</span>
                </label>
                <input
                  type="range" min="1" max="15" value={form.years}
                  onChange={e => setForm({...form, years: +e.target.value})}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#484F58', marginTop: '4px' }}>
                  <span>1 yr</span><span>8 yrs</span><span>15 yrs</span>
                </div>
              </div>

              <button
                onClick={handleQuickCalc}
                disabled={loading}
                className="btn btn-primary w-full"
                style={{ height: '44px' }}
              >
                {loading ? (
                  <><span className="spinner" style={{ marginRight: '8px' }}></span> Calculating...</>
                ) : 'Find Greenest Car'}
              </button>
            </div>

            {/* Quick Result */}
            {quickResult && quickResult.recommendations?.length > 0 && (
              <div style={{
                marginTop: '20px', padding: '16px', borderRadius: '10px',
                background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)'
              }}>
                <div style={{ fontSize: '12px', color: '#22C55E', fontWeight: 600, marginBottom: '8px' }}>
                  Greenest Choice for You
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#E6EDF3' }}>
                      {quickResult.recommendations[0].vehicle.make} {quickResult.recommendations[0].vehicle.model}
                    </div>
                    <div style={{ fontSize: '12px', color: '#8B949E' }}>
                      {quickResult.recommendations[0].vehicle.variant}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#22C55E' }}>
                      {formatNumber(quickResult.recommendations[0].emissions.total_kg)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#8B949E' }}>kg CO₂ total</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/recommend', { state: form })}
                  style={{ marginTop: '12px', fontSize: '13px', color: '#22C55E', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  See all 3 recommendations →
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===================== STATS BAR ===================== */}
      <section className="stats-section">
        <div className="stats-bar">
          {[
            { value: vehicles.length || 32, label: 'Vehicles Analyzed' },
            { value: states.length || 36, label: 'States & UTs' },
            { value: 5, label: 'Fuel Types Covered' },
            { value: '100%', label: 'India-Specific Data' },
          ].map((stat, i) => (
            <div key={i} className={statsAnimated ? 'count-up' : ''} style={{
              textAlign: 'center',
              animationDelay: `${i * 0.15}s`,
              opacity: statsAnimated ? undefined : 0
            }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#22C55E', lineHeight: 1.2 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '13px', color: '#8B949E', marginTop: '4px' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', color: '#E6EDF3', marginBottom: '8px' }}>
            How Carbon-Wise Works
          </h2>
          <p style={{ textAlign: 'center', color: '#8B949E', marginBottom: '48px', maxWidth: '560px', margin: '0 auto 48px' }}>
            Three steps to understanding the true carbon cost of any vehicle in India.
          </p>

          <div className="cards-grid">
            {[
              {
                step: 1, icon: '📊', title: 'Enter Your Profile',
                desc: 'Tell us your state, daily mileage, and how long you plan to own the car. We factor in your local grid intensity.'
              },
              {
                step: 2, icon: '⚖️', title: 'Compare Lifecycle Emissions',
                desc: 'See the complete picture: manufacturing, operational footprint, and end-of-life disposal — not just tailpipe.'
              },
              {
                step: 3, icon: '✅', title: 'Make an Informed Decision',
                desc: 'Get personalized recommendations with plain-language explanations and download a Carbon Passport.'
              }
            ].map((item, i) => (
              <div key={i} className="glass-card fade-in-up" style={{
                textAlign: 'center',
                animationDelay: `${i * 0.1}s`
              }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '14px',
                  margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', background: 'rgba(34,197,94,0.08)'
                }}>
                  {item.icon}
                </div>
                <span className="step-circle" style={{ marginBottom: '12px' }}>{item.step}</span>
                <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#E6EDF3', marginBottom: '8px', marginTop: '12px' }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#8B949E', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== WHY THIS MATTERS ===================== */}
      <section style={{ padding: '80px 24px', background: 'rgba(22,27,34,0.5)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, textAlign: 'center', color: '#E6EDF3', marginBottom: '8px' }}>
            Why This Matters
          </h2>
          <p style={{ textAlign: 'center', color: '#8B949E', marginBottom: '48px', maxWidth: '560px', margin: '0 auto 48px' }}>
            Buying a car is a ₹10–50 lakh decision. Don't make it with incomplete carbon data.
          </p>

          <div className="cards-grid">
            {[
              {
                icon: '🏭', title: 'Manufacturing Blind Spot',
                stat: '6,000–8,100 kg', statLabel: 'CO₂ from a 40 kWh EV battery alone',
                desc: 'No brochure tells you the carbon cost of making the car. A Nexon EV battery emits tonnes of CO₂ before you drive a single km.'
              },
              {
                icon: '⚡', title: 'India Grid Problem',
                stat: '0.71–0.96', statLabel: 'kg CO₂/kWh across Indian states',
                desc: 'An EV charged in coal-heavy Jharkhand may emit MORE lifecycle CO₂ than a CNG car in Gujarat. Location matters enormously.'
              },
              {
                icon: '♻️', title: 'End-of-Life Void',
                stat: '< 5%', statLabel: 'of EV batteries are recycled in India today',
                desc: 'India has no large-scale EV battery recycling. Batteries going to landfill carry hidden carbon and toxicity penalties.'
              }
            ].map((item, i) => (
              <div key={i} className="glass-card">
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#E6EDF3', marginBottom: '12px' }}>{item.title}</h3>
                <div className="red-highlight" style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#fca5a5' }}>{item.stat}</div>
                  <div style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>{item.statLabel}</div>
                </div>
                <p style={{ fontSize: '14px', color: '#8B949E', lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#E6EDF3', marginBottom: '12px' }}>
            Ready to discover the <span className="gradient-text">real carbon truth</span>?
          </h2>
          <p style={{ color: '#8B949E', marginBottom: '32px', fontSize: '16px' }}>
            Join thousands of informed car buyers making emissions-aware decisions.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
            <Link to="/compare" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '15px' }}>
              Start Comparing →
            </Link>
            <Link to="/recommend" className="btn btn-secondary" style={{ padding: '16px 32px', fontSize: '15px' }}>
              Get My Recommendation
            </Link>
          </div>
        </div>
      </section>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .hero-section h1 { font-size: 32px !important; }
        }
      `}</style>
    </div>
  )
}
