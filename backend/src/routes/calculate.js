const express = require('express');
const { queryAll, queryOne } = require('../db');
const { 
  calculateLifecycleEmissions, 
  calculateBreakeven, 
  generateMonthlyTimeline,
  calculateTCO,
  detectGreenwashFlags
} = require('../services/lca-engine');

const router = express.Router();

// POST /api/calculate — Calculate lifecycle emissions for a single vehicle
router.post('/', (req, res) => {
  try {
    const { vehicle_id, state, daily_km, years, usage_pattern } = req.body;
    
    if (!vehicle_id || !state || !daily_km || !years) {
      return res.status(400).json({ 
        error: 'Missing required fields: vehicle_id, state, daily_km, years' 
      });
    }
    
    const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    const gridData = queryOne('SELECT * FROM state_grid_intensity WHERE state_name = ?', [state]);
    const gridIntensity = gridData ? gridData.intensity_kg_per_kwh : 0.71;
    
    const result = calculateLifecycleEmissions({
      vehicle,
      dailyKm: parseFloat(daily_km),
      years: parseInt(years),
      gridIntensity,
      usagePattern: usage_pattern || 'MIXED'
    });
    
    const greenwashFlags = detectGreenwashFlags(vehicle, gridIntensity);
    
    res.json({
      vehicle: {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        variant: vehicle.variant,
        fuel_type: vehicle.fuel_type,
        price_lakh: vehicle.price_lakh
      },
      state,
      grid_intensity: gridIntensity,
      emissions: result,
      greenwash_flags: greenwashFlags
    });
  } catch (error) {
    console.error('Calculate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/compare — Side-by-side comparison of up to 4 vehicles
router.post('/compare', (req, res) => {
  try {
    const { vehicle_ids, state, daily_km, years, usage_pattern } = req.body;
    
    if (!vehicle_ids || !Array.isArray(vehicle_ids) || vehicle_ids.length < 2) {
      return res.status(400).json({ error: 'Provide 2-4 vehicle_ids as an array' });
    }
    
    if (vehicle_ids.length > 4) {
      return res.status(400).json({ error: 'Maximum 4 vehicles for comparison' });
    }
    
    const gridData = queryOne('SELECT * FROM state_grid_intensity WHERE state_name = ?', [state]);
    const gridIntensity = gridData ? gridData.intensity_kg_per_kwh : 0.71;
    
    const results = vehicle_ids.map(id => {
      const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [id]);
      if (!vehicle) return null;
      
      const emissions = calculateLifecycleEmissions({
        vehicle,
        dailyKm: parseFloat(daily_km),
        years: parseInt(years),
        gridIntensity,
        usagePattern: usage_pattern || 'MIXED'
      });
      
      const greenwashFlags = detectGreenwashFlags(vehicle, gridIntensity);
      
      const timeline = generateMonthlyTimeline(
        vehicle, gridIntensity, parseFloat(daily_km), parseInt(years) * 12
      );
      
      return {
        vehicle: {
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          variant: vehicle.variant,
          fuel_type: vehicle.fuel_type,
          price_lakh: vehicle.price_lakh,
          battery_capacity_kwh: vehicle.battery_capacity_kwh,
          midc_efficiency: vehicle.midc_efficiency,
          midc_efficiency_unit: vehicle.midc_efficiency_unit,
          kerb_weight_kg: vehicle.kerb_weight_kg
        },
        emissions,
        timeline,
        greenwash_flags: greenwashFlags
      };
    }).filter(Boolean);
    
    results.sort((a, b) => a.emissions.total_kg - b.emissions.total_kg);
    
    const evResults = results.filter(r => r.vehicle.fuel_type === 'ELECTRIC');
    const iceResults = results.filter(r => ['PETROL', 'DIESEL', 'CNG'].includes(r.vehicle.fuel_type));
    
    const breakevenAnalysis = [];
    for (const ev of evResults) {
      for (const ice of iceResults) {
        const evVehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [ev.vehicle.id]);
        const iceVehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [ice.vehicle.id]);
        
        const breakeven = calculateBreakeven(
          ev.emissions, ice.emissions, evVehicle, iceVehicle, gridIntensity
        );
        
        breakevenAnalysis.push({
          ev: `${ev.vehicle.make} ${ev.vehicle.model}`,
          ice: `${ice.vehicle.make} ${ice.vehicle.model} ${ice.vehicle.variant}`,
          ...breakeven
        });
      }
    }
    
    res.json({
      state,
      grid_intensity: gridIntensity,
      daily_km: parseFloat(daily_km),
      years: parseInt(years),
      usage_pattern: usage_pattern || 'MIXED',
      results,
      breakeven_analysis: breakevenAnalysis
    });
  } catch (error) {
    console.error('Compare error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/recommend — Smart recommendation engine with diversity
router.post('/recommend', (req, res) => {
  try {
    const { state, daily_km, years, usage_pattern, min_budget, max_budget, fuel_type_preference, min_seating } = req.body;
    
    if (!state || !daily_km || !years) {
      return res.status(400).json({ error: 'Missing: state, daily_km, years' });
    }
    
    const gridData = queryOne('SELECT * FROM state_grid_intensity WHERE state_name = ?', [state]);
    const gridIntensity = gridData ? gridData.intensity_kg_per_kwh : 0.71;
    
    // --- Hard filters ---
    let query = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];
    
    if (min_budget) {
      query += ' AND price_lakh >= ?';
      params.push(parseFloat(min_budget));
    }
    if (max_budget) {
      query += ' AND price_lakh <= ?';
      params.push(parseFloat(max_budget));
    }
    if (fuel_type_preference && fuel_type_preference !== 'ANY') {
      query += ' AND fuel_type = ?';
      params.push(fuel_type_preference);
    }
    if (min_seating) {
      query += ' AND seating_capacity >= ?';
      params.push(parseInt(min_seating));
    }
    
    const vehicles = queryAll(query, params);
    
    // --- Score every vehicle ---
    const scored = vehicles.map(vehicle => {
      const emissions = calculateLifecycleEmissions({
        vehicle,
        dailyKm: parseFloat(daily_km),
        years: parseInt(years),
        gridIntensity,
        usagePattern: usage_pattern || 'MIXED'
      });
      
      const fuelPriceRow = queryOne(
        'SELECT price_per_unit FROM fuel_prices WHERE fuel_type = ? AND state_name = ?',
        [vehicle.fuel_type === 'HYBRID' ? 'PETROL' : vehicle.fuel_type, state]
      );
      
      const electricityRow = queryOne(
        'SELECT price_per_unit FROM fuel_prices WHERE fuel_type = ? AND state_name = ?',
        ['ELECTRICITY', state]
      );
      
      const tco = calculateTCO({
        vehicle,
        dailyKm: parseFloat(daily_km),
        years: parseInt(years),
        fuelPrice: fuelPriceRow ? fuelPriceRow.price_per_unit : 100,
        electricityPrice: electricityRow ? electricityRow.price_per_unit : 8
      });
      
      const greenwashFlags = detectGreenwashFlags(vehicle, gridIntensity);
      
      return {
        vehicle: {
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          variant: vehicle.variant,
          fuel_type: vehicle.fuel_type,
          price_lakh: vehicle.price_lakh,
          battery_capacity_kwh: vehicle.battery_capacity_kwh,
          midc_efficiency: vehicle.midc_efficiency,
          midc_efficiency_unit: vehicle.midc_efficiency_unit,
          body_type: vehicle.body_type,
          segment: vehicle.segment,
          seating_capacity: vehicle.seating_capacity,
          data_source: vehicle.data_source
        },
        emissions,
        tco,
        greenwash_flags: greenwashFlags
      };
    });
    
    scored.sort((a, b) => a.emissions.total_kg - b.emissions.total_kg);
    
    // --- Diversity logic: pick top 3 with different brands, prefer different fuel ---
    const diverse = [];
    const usedMakes = new Set();
    const usedFuels = new Set();
    
    // Pass 1: pick unique brand + unique fuel
    for (const item of scored) {
      if (diverse.length >= 3) break;
      if (!usedMakes.has(item.vehicle.make) && !usedFuels.has(item.vehicle.fuel_type)) {
        diverse.push(item);
        usedMakes.add(item.vehicle.make);
        usedFuels.add(item.vehicle.fuel_type);
      }
    }
    // Pass 2: if < 3, relax fuel constraint (just unique brand)
    if (diverse.length < 3) {
      for (const item of scored) {
        if (diverse.length >= 3) break;
        if (diverse.includes(item)) continue;
        if (!usedMakes.has(item.vehicle.make)) {
          diverse.push(item);
          usedMakes.add(item.vehicle.make);
        }
      }
    }
    // Pass 3: if still < 3, fill with remaining
    if (diverse.length < 3) {
      for (const item of scored) {
        if (diverse.length >= 3) break;
        if (!diverse.includes(item)) {
          diverse.push(item);
        }
      }
    }
    
    // --- Labels ---
    const LABELS = [
      'Best Carbon Choice',
      'Greener Alternative',
      'Premium Carbon-Efficient Pick'
    ];
    
    // --- Average carbon in this budget range ---
    const avgCO2 = scored.length > 0
      ? Math.round(scored.reduce((s, v) => s + v.emissions.total_kg, 0) / scored.length)
      : 0;
    
    const recommendations = diverse.map((item, rank) => {
      const explanation = generateExplanation(item, state, gridIntensity, daily_km, years, rank);
      return { ...item, rank: rank + 1, label: LABELS[rank] || '', explanation };
    });
    
    res.json({
      state,
      grid_intensity: gridIntensity,
      renewable_pct: gridData ? gridData.renewable_pct : null,
      daily_km: parseFloat(daily_km),
      years: parseInt(years),
      usage_pattern: usage_pattern || 'MIXED',
      total_evaluated: vehicles.length,
      avg_budget_carbon_kg: avgCO2,
      recommendations
    });
  } catch (error) {
    console.error('Recommend error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/breakeven-timeline
router.post('/breakeven-timeline', (req, res) => {
  try {
    const { vehicle_ids, state, daily_km, months, grid_improvement_rate } = req.body;
    
    if (!vehicle_ids || !state || !daily_km) {
      return res.status(400).json({ error: 'Missing: vehicle_ids, state, daily_km' });
    }
    
    const gridData = queryOne('SELECT * FROM state_grid_intensity WHERE state_name = ?', [state]);
    const gridIntensity = gridData ? gridData.intensity_kg_per_kwh : 0.71;
    
    const timelines = vehicle_ids.map(id => {
      const vehicle = queryOne('SELECT * FROM vehicles WHERE id = ?', [id]);
      if (!vehicle) return null;
      
      const timeline = generateMonthlyTimeline(
        vehicle, 
        gridIntensity, 
        parseFloat(daily_km),
        parseInt(months) || 120,
        parseFloat(grid_improvement_rate) || 0
      );
      
      return {
        vehicle: {
          id: vehicle.id,
          make: vehicle.make,
          model: vehicle.model,
          variant: vehicle.variant,
          fuel_type: vehicle.fuel_type
        },
        timeline
      };
    }).filter(Boolean);
    
    res.json({ state, grid_intensity: gridIntensity, daily_km: parseFloat(daily_km), timelines });
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: error.message });
  }
});

function generateExplanation(item, state, gridIntensity, dailyKm, years, rank) {
  const v = item.vehicle;
  const e = item.emissions;
  const name = `${v.make} ${v.model} ${v.variant}`;
  
  if (rank === 0) {
    if (v.fuel_type === 'CNG') {
      return `At ${dailyKm} km/day in ${state} for ${years} years, the ${name} achieves the lowest lifecycle carbon footprint of ${e.total_kg.toLocaleString()} kg CO₂. CNG's low manufacturing emissions (${e.manufacturing_kg.toLocaleString()} kg) and competitive per-km efficiency make it the cleanest choice at your usage pattern.`;
    } else if (v.fuel_type === 'ELECTRIC') {
      return `At ${dailyKm} km/day in ${state} for ${years} years, the ${name} has the lowest total footprint at ${e.total_kg.toLocaleString()} kg CO₂. Despite higher manufacturing emissions (${e.manufacturing_kg.toLocaleString()} kg), ${state}'s grid intensity of ${gridIntensity} kg CO₂/kWh enables the EV to offset its carbon debt within your ownership period.`;
    } else if (v.fuel_type === 'HYBRID') {
      return `The ${name} tops our recommendation at ${e.total_kg.toLocaleString()} kg CO₂ total. Its hybrid powertrain combines low petrol consumption with electric efficiency, resulting in the best carbon outcome for ${state} at your driving pattern.`;
    } else {
      return `At ${dailyKm} km/day in ${state} for ${years} years, the ${name} has the lowest lifecycle footprint at ${e.total_kg.toLocaleString()} kg CO₂. Its fuel efficiency of ${v.midc_efficiency} ${v.midc_efficiency_unit} keeps operational emissions competitive.`;
    }
  }
  
  if (v.fuel_type === 'ELECTRIC') {
    return `The ${name} totals ${e.total_kg.toLocaleString()} kg CO₂. Its battery manufacturing adds ${e.manufacturing_kg.toLocaleString()} kg upfront. At ${state}'s grid intensity of ${gridIntensity} kg CO₂/kWh, the EV needs extended driving to offset compared to lower-emission alternatives.`;
  }
  
  return `The ${name} totals ${e.total_kg.toLocaleString()} kg CO₂ over ${years} years. Manufacturing contributes ${e.manufacturing_kg.toLocaleString()} kg and operations add ${e.operational_kg.toLocaleString()} kg at your ${dailyKm} km/day usage in ${state}.`;
}

module.exports = router;
