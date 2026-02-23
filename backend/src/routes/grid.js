const express = require('express');
const { queryAll, queryOne } = require('../db');

const router = express.Router();

// GET /api/grid-intensity — All states with intensity data
router.get('/', (req, res) => {
  const states = queryAll('SELECT * FROM state_grid_intensity ORDER BY intensity_kg_per_kwh ASC');
  
  const statesWithColor = states.map(s => ({
    ...s,
    color: getGridColor(s.intensity_kg_per_kwh),
    category: getGridCategory(s.intensity_kg_per_kwh)
  }));
  
  res.json({ count: statesWithColor.length, states: statesWithColor });
});

// GET /api/grid-intensity/:state — Single state
router.get('/:state', (req, res) => {
  const state = queryOne('SELECT * FROM state_grid_intensity WHERE state_name = ?', [req.params.state]);
  
  if (!state) {
    return res.status(404).json({ error: 'State not found' });
  }
  
  res.json({
    ...state,
    color: getGridColor(state.intensity_kg_per_kwh),
    category: getGridCategory(state.intensity_kg_per_kwh)
  });
});

function getGridColor(intensity) {
  if (intensity <= 0.3) return '#10b981';
  if (intensity <= 0.5) return '#34d399';
  if (intensity <= 0.7) return '#fbbf24';
  if (intensity <= 0.85) return '#f97316';
  return '#ef4444';
}

function getGridCategory(intensity) {
  if (intensity <= 0.3) return 'Very Clean';
  if (intensity <= 0.5) return 'Clean';
  if (intensity <= 0.7) return 'Moderate';
  if (intensity <= 0.85) return 'Carbon Heavy';
  return 'Very Carbon Heavy';
}

module.exports = router;
