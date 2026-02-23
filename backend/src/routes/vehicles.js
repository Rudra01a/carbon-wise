const express = require('express');
const { queryAll, queryOne } = require('../db');

const router = express.Router();

// GET /api/vehicles — List all vehicles with filtering
router.get('/', (req, res) => {
  const { fuel_type, make, body_type, min_price, max_price, search, seating } = req.query;
  
  let query = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];
  
  if (fuel_type) {
    query += ' AND fuel_type = ?';
    params.push(fuel_type);
  }
  if (make) {
    query += ' AND make = ?';
    params.push(make);
  }
  if (body_type) {
    query += ' AND body_type = ?';
    params.push(body_type);
  }
  if (min_price) {
    query += ' AND price_lakh >= ?';
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    query += ' AND price_lakh <= ?';
    params.push(parseFloat(max_price));
  }
  if (seating) {
    query += ' AND seating_capacity >= ?';
    params.push(parseInt(seating));
  }
  if (search) {
    query += " AND (make || ' ' || model || ' ' || variant) LIKE ?";
    params.push(`%${search}%`);
  }
  
  query += ' ORDER BY make, model, variant';
  
  const vehicles = queryAll(query, params);
  res.json({ count: vehicles.length, vehicles });
});

// GET /api/vehicles/makes — Get distinct makes
router.get('/makes', (req, res) => {
  const makes = queryAll('SELECT DISTINCT make FROM vehicles ORDER BY make');
  res.json(makes.map(m => m.make));
});

// GET /api/vehicles/:id — Single vehicle details
router.get('/:id', (req, res) => {
  const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [req.params.id]);
  
  if (!vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }
  
  res.json(vehicle);
});

module.exports = router;
