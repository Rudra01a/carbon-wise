import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ComparePage from './pages/ComparePage'
import RecommendPage from './pages/RecommendPage'
import GridMapPage from './pages/GridMapPage'
import FleetPage from './pages/FleetPage'
import VehicleDetailPage from './pages/VehicleDetailPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0D1117' }}>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/recommend" element={<RecommendPage />} />
            <Route path="/grid" element={<GridMapPage />} />
            <Route path="/fleet" element={<FleetPage />} />
            <Route path="/vehicle/:id" element={<VehicleDetailPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
