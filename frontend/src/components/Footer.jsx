import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{ background: '#161B22', borderTop: '1px solid #30363D' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8.17 20C12.17 20 13.5 14.5 17 8Z" fill="#22C55E"/>
                <path d="M17 8C17 8 20 6 21 3C18 4 15.5 5.5 13 8C10.5 10.5 9 13.5 8 17C10 15 12 13 17 8Z" fill="#4ADE80" opacity="0.6"/>
              </svg>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#E6EDF3' }}>Carbon-Wise</span>
            </div>
            <p style={{ color: '#8B949E', fontSize: '13px', lineHeight: '1.6', maxWidth: '320px' }}>
              India's first Lifecycle Carbon Intelligence Platform. Know the true environmental
              cost of every vehicle — from factory to scrapyard — using Indian data.
            </p>
          </div>

          {/* Platform Links */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '16px', color: '#E6EDF3' }}>Platform</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/compare" style={{ color: '#8B949E', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color='#22C55E'} onMouseOut={e => e.currentTarget.style.color='#8B949E'}>
                Compare Vehicles
              </Link>
              <Link to="/recommend" style={{ color: '#8B949E', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color='#22C55E'} onMouseOut={e => e.currentTarget.style.color='#8B949E'}>
                Get Recommendations
              </Link>
              <Link to="/grid" style={{ color: '#8B949E', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color='#22C55E'} onMouseOut={e => e.currentTarget.style.color='#8B949E'}>
                Grid Intensity Map
              </Link>
              <Link to="/fleet" style={{ color: '#8B949E', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color='#22C55E'} onMouseOut={e => e.currentTarget.style.color='#8B949E'}>
                Fleet Optimizer
              </Link>
            </div>
          </div>

          {/* Data Sources */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '16px', color: '#E6EDF3' }}>Data Sources</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="https://cea.nic.in" target="_blank" rel="noopener noreferrer" style={{ color: '#8B949E', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color='#22C55E'} onMouseOut={e => e.currentTarget.style.color='#8B949E'}>
                CEA India
              </a>
              <a href="https://www.araiindia.com" target="_blank" rel="noopener noreferrer" style={{ color: '#8B949E', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color='#22C55E'} onMouseOut={e => e.currentTarget.style.color='#8B949E'}>
                ARAI
              </a>
              <a href="https://ppac.gov.in" target="_blank" rel="noopener noreferrer" style={{ color: '#8B949E', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color='#22C55E'} onMouseOut={e => e.currentTarget.style.color='#8B949E'}>
                PPAC India
              </a>
              <a href="https://theicct.org/india" target="_blank" rel="noopener noreferrer" style={{ color: '#8B949E', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseOver={e => e.currentTarget.style.color='#22C55E'} onMouseOut={e => e.currentTarget.style.color='#8B949E'}>
                ICCT India
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{
          borderTop: '1px solid #30363D',
          marginTop: '32px',
          paddingTop: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <p style={{ color: '#484F58', fontSize: '12px' }}>
            © 2025 Carbon-Wise. Built for a cleaner India. Data last updated Dec 2024.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#484F58' }}>
            <span>Made in India</span>
            <span>•</span>
            <span>MIDC Compliant</span>
            <span>•</span>
            <span>CEA Verified Data</span>
          </div>
        </div>
      </div>

      {/* Mobile responsive override */}
      <style>{`
        @media (max-width: 768px) {
          footer > div > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </footer>
  )
}
