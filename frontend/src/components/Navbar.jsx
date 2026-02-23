import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const navLinks = [
  { path: '/', label: 'Home' },
  { path: '/compare', label: 'Compare' },
  { path: '/recommend', label: 'Recommend' },
  { path: '/grid', label: 'Grid Map' },
  { path: '/fleet', label: 'Fleet' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: '#161B22',
      borderBottom: '1px solid #30363D',
      height: '64px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22L6.66 19.7C7.14 19.87 7.64 20 8.17 20C12.17 20 13.5 14.5 17 8Z" fill="#22C55E"/>
              <path d="M17 8C17 8 20 6 21 3C18 4 15.5 5.5 13 8C10.5 10.5 9 13.5 8 17C10 15 12 13 17 8Z" fill="#4ADE80" opacity="0.6"/>
            </svg>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#E6EDF3' }}>Carbon-Wise</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: '4px' }}>
            {navLinks.map(link => {
              const isActive = location.pathname === link.path
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    textDecoration: 'none',
                    color: isActive ? '#22C55E' : '#8B949E',
                    position: 'relative',
                    transition: 'color 0.2s',
                    borderBottom: isActive ? '2px solid #22C55E' : '2px solid transparent',
                  }}
                  onMouseOver={e => { if (!isActive) e.currentTarget.style.color = '#22C55E' }}
                  onMouseOut={e => { if (!isActive) e.currentTarget.style.color = '#8B949E' }}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B949E', fontSize: '20px', padding: '8px' }}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden" style={{
          position: 'absolute',
          top: '64px',
          right: 0,
          width: '260px',
          background: '#161B22',
          borderLeft: '1px solid #30363D',
          borderBottom: '1px solid #30363D',
          padding: '8px',
          boxShadow: '-4px 4px 16px rgba(0,0,0,0.3)',
        }}>
          {navLinks.map(link => {
            const isActive = location.pathname === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: isActive ? '#22C55E' : '#8B949E',
                  background: isActive ? 'rgba(34,197,94,0.08)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
