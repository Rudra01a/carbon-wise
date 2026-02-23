/**
 * Carbon-Wise LCA Engine
 * Core lifecycle carbon calculator for Indian vehicles
 * 
 * Total CO₂ = Manufacturing + Operational + Disposal
 */

// CO₂ emission factors per fuel type
const EMISSION_FACTORS = {
  PETROL: 2.31,    // kg CO₂ per litre
  DIESEL: 2.68,    // kg CO₂ per litre
  CNG: 2.75,       // kg CO₂ per kg
  ELECTRIC: null,   // Depends on grid intensity
  HYBRID: null       // Blend
};

// Charging loss factor for EVs (cable + converter + battery losses)
const CHARGING_LOSS_FACTOR = 1.15;

// Hybrid electric fraction (average proportion of driving on battery)
const HYBRID_ELECTRIC_FRACTION = 0.35;

/**
 * Calculate operational emissions per km for a vehicle
 * @param {Object} vehicle - Vehicle data
 * @param {number} gridIntensity - kg CO₂/kWh for the state (EVs only)
 * @returns {number} kg CO₂ per km
 */
function getOperationalEmissionPerKm(vehicle, gridIntensity = 0.71) {
  const efficiency = vehicle.midc_efficiency;

  switch (vehicle.fuel_type) {
    case 'PETROL':
      // efficiency is km/L → consumption = 1/efficiency L/km → emission = consumption × factor
      return (1 / efficiency) * EMISSION_FACTORS.PETROL;

    case 'DIESEL':
      return (1 / efficiency) * EMISSION_FACTORS.DIESEL;

    case 'CNG':
      // efficiency is km/kg → consumption = 1/efficiency kg/km → emission = consumption × factor
      return (1 / efficiency) * EMISSION_FACTORS.CNG;

    case 'ELECTRIC':
      // efficiency is km/kWh → consumption = 1/efficiency kWh/km
      // emission = consumption × grid intensity × charger loss factor
      return (1 / efficiency) * gridIntensity * CHARGING_LOSS_FACTOR;

    case 'HYBRID':
      // Weighted blend: electric fraction uses battery, rest uses petrol
      const petrolEmission = (1 / efficiency) * EMISSION_FACTORS.PETROL;
      const electricEmission = vehicle.battery_capacity_kwh 
        ? (1 / (efficiency * 1.3)) * gridIntensity * CHARGING_LOSS_FACTOR 
        : 0;
      return (1 - HYBRID_ELECTRIC_FRACTION) * petrolEmission + 
             HYBRID_ELECTRIC_FRACTION * electricEmission;

    default:
      throw new Error(`Unknown fuel type: ${vehicle.fuel_type}`);
  }
}

/**
 * Calculate total lifecycle carbon footprint
 * @param {Object} params
 * @param {Object} params.vehicle - Vehicle data from database
 * @param {number} params.dailyKm - Daily mileage in km
 * @param {number} params.years - Ownership period in years
 * @param {number} params.gridIntensity - State grid intensity (kg CO₂/kWh)
 * @param {string} params.usagePattern - CITY, HIGHWAY, or MIXED
 * @returns {Object} Breakdown of emissions
 */
function calculateLifecycleEmissions({ vehicle, dailyKm, years, gridIntensity, usagePattern = 'MIXED' }) {
  // Usage pattern adjustment factors (MIDC is a blend)
  const usageMultiplier = {
    CITY: 1.15,    // City driving is less efficient than MIDC
    HIGHWAY: 0.90, // Highway is more efficient
    MIXED: 1.0     // MIDC represents mixed
  }[usagePattern] || 1.0;

  // Total distance over ownership
  const totalDistanceKm = dailyKm * 365 * years;

  // Manufacturing emissions
  const manufacturingKg = vehicle.manufacturing_emissions_kg || estimateManufacturingEmissions(vehicle);

  // Operational emissions
  const emissionPerKm = getOperationalEmissionPerKm(vehicle, gridIntensity) * usageMultiplier;
  const operationalKg = emissionPerKm * totalDistanceKm;

  // Disposal emissions (only for EVs and Hybrids with batteries)
  let disposalKg = vehicle.disposal_emissions_kg || 0;
  if (!vehicle.has_recycling_program && vehicle.battery_capacity_kwh && vehicle.battery_capacity_kwh > 5) {
    // Extra penalty for no recycling program on large batteries
    disposalKg *= 1.5;
  }

  const totalKg = manufacturingKg + operationalKg + disposalKg;

  return {
    manufacturing_kg: Math.round(manufacturingKg),
    operational_kg: Math.round(operationalKg),
    disposal_kg: Math.round(disposalKg),
    total_kg: Math.round(totalKg),
    emission_per_km: Math.round(emissionPerKm * 1000) / 1000,
    total_distance_km: totalDistanceKm,
    daily_km: dailyKm,
    years,
    usage_pattern: usagePattern,
    grid_intensity_used: gridIntensity
  };
}

/**
 * Estimate manufacturing emissions using ML-like heuristic
 * Uses vehicle weight and battery capacity as primary factors
 */
function estimateManufacturingEmissions(vehicle) {
  const weight = vehicle.kerb_weight_kg || 1200;
  
  // Base manufacturing: ~4 kg CO₂ per kg of vehicle weight
  let baseEmissions = weight * 4.0;
  
  // Battery manufacturing: ~150 kg CO₂ per kWh (industry average)
  if (vehicle.battery_capacity_kwh) {
    baseEmissions += vehicle.battery_capacity_kwh * 150;
  }
  
  return baseEmissions;
}

/**
 * Calculate the breakeven point where an EV becomes cleaner than an ICE vehicle
 * @param {Object} evResult - LCA result for EV
 * @param {Object} iceResult - LCA result for ICE
 * @param {Object} evVehicle - EV vehicle data
 * @param {Object} iceVehicle - ICE vehicle data
 * @param {number} gridIntensity - Current grid intensity
 * @returns {Object} Breakeven analysis
 */
function calculateBreakeven(evResult, iceResult, evVehicle, iceVehicle, gridIntensity) {
  const evMfg = evResult.manufacturing_kg + evResult.disposal_kg;
  const iceMfg = iceResult.manufacturing_kg + iceResult.disposal_kg;
  
  const evPerKm = evResult.emission_per_km;
  const icePerKm = iceResult.emission_per_km;
  
  // If EV per-km is >= ICE per-km, it never breaks even
  if (evPerKm >= icePerKm) {
    return {
      breakevenKm: null,
      breakevenYears: null,
      breakevenMonths: null,
      willBreakeven: false,
      reason: `EV per-km emissions (${evPerKm.toFixed(3)} kg) ≥ ICE per-km emissions (${icePerKm.toFixed(3)} kg) at current grid intensity`
    };
  }
  
  // Breakeven distance (km where cumulative emissions are equal)
  const emissionDebt = evMfg - iceMfg;
  const savingsPerKm = icePerKm - evPerKm;
  const breakevenKm = emissionDebt / savingsPerKm;
  
  const dailyKm = evResult.daily_km || 40;
  const breakevenDays = breakevenKm / dailyKm;
  const breakevenYears = breakevenDays / 365;
  const breakevenMonths = Math.round(breakevenYears * 12);
  
  return {
    breakevenKm: Math.round(breakevenKm),
    breakevenYears: Math.round(breakevenYears * 10) / 10,
    breakevenMonths,
    willBreakeven: true,
    emissionDebt: Math.round(emissionDebt),
    savingsPerKm: Math.round(savingsPerKm * 1000) / 1000
  };
}

/**
 * Generate monthly carbon accumulation data for breakeven graph
 * @param {Object} vehicle - Vehicle data
 * @param {number} gridIntensity - State grid intensity
 * @param {number} dailyKm - Daily driving distance
 * @param {number} months - Number of months to simulate
 * @param {number} [gridImprovementRate=0] - Annual grid improvement rate (0-1)
 * @returns {Array} Monthly carbon accumulation data points
 */
function generateMonthlyTimeline(vehicle, gridIntensity, dailyKm, months = 120, gridImprovementRate = 0) {
  const timeline = [];
  const mfg = vehicle.manufacturing_emissions_kg || estimateManufacturingEmissions(vehicle);
  const disposal = vehicle.disposal_emissions_kg || 0;
  
  let cumulative = mfg; // Start with manufacturing debt
  
  for (let m = 0; m <= months; m++) {
    timeline.push({
      month: m,
      year: Math.round(m / 12 * 10) / 10,
      cumulative_kg: Math.round(cumulative),
      label: `${Math.floor(m / 12)}y ${m % 12}m`
    });
    
    // Adjust grid intensity for this month
    const yearFraction = m / 12;
    const currentGrid = gridIntensity * (1 - gridImprovementRate * yearFraction);
    
    const monthlyKm = dailyKm * 30.44; // avg days per month
    const emissionPerKm = getOperationalEmissionPerKm(vehicle, Math.max(currentGrid, 0.05));
    cumulative += emissionPerKm * monthlyKm;
    
    // Add disposal at end of ownership (approximate at last month)
    if (m === months) {
      cumulative += disposal;
    }
  }
  
  return timeline;
}

/**
 * Calculate TCO (Total Cost of Ownership)
 * @param {Object} params
 * @returns {Object} TCO breakdown
 */
function calculateTCO({ vehicle, dailyKm, years, fuelPrice, electricityPrice }) {
  const totalKm = dailyKm * 365 * years;
  let fuelCost = 0;
  
  switch (vehicle.fuel_type) {
    case 'PETROL':
      fuelCost = (totalKm / vehicle.midc_efficiency) * fuelPrice;
      break;
    case 'DIESEL':
      fuelCost = (totalKm / vehicle.midc_efficiency) * fuelPrice;
      break;
    case 'CNG':
      fuelCost = (totalKm / vehicle.midc_efficiency) * fuelPrice;
      break;
    case 'ELECTRIC':
      fuelCost = (totalKm / vehicle.midc_efficiency) * electricityPrice * CHARGING_LOSS_FACTOR;
      break;
    case 'HYBRID':
      const petrolCost = ((1 - HYBRID_ELECTRIC_FRACTION) * totalKm / vehicle.midc_efficiency) * fuelPrice;
      const elecCost = (HYBRID_ELECTRIC_FRACTION * totalKm / (vehicle.midc_efficiency * 1.3)) * (electricityPrice || 8) * CHARGING_LOSS_FACTOR;
      fuelCost = petrolCost + elecCost;
      break;
  }

  const purchaseCost = vehicle.price_lakh * 100000;
  const insurancePerYear = purchaseCost * 0.03; // ~3% of vehicle price
  const maintenancePerYear = vehicle.fuel_type === 'ELECTRIC' ? 5000 : 12000;
  
  return {
    purchase_cost: Math.round(purchaseCost),
    fuel_cost: Math.round(fuelCost),
    insurance_cost: Math.round(insurancePerYear * years),
    maintenance_cost: Math.round(maintenancePerYear * years),
    total_cost: Math.round(purchaseCost + fuelCost + insurancePerYear * years + maintenancePerYear * years),
    cost_per_km: Math.round((purchaseCost + fuelCost + insurancePerYear * years + maintenancePerYear * years) / totalKm * 100) / 100
  };
}

/**
 * Detect greenwashing flags for a vehicle
 * @param {Object} vehicle - Vehicle data
 * @param {number} gridIntensity - State grid intensity
 * @returns {Array} List of greenwash flags
 */
function detectGreenwashFlags(vehicle, gridIntensity = 0.75) {
  const flags = [];

  // Flag 1: "Zero Emission" claim with high manufacturing emissions
  if (vehicle.fuel_type === 'ELECTRIC' && vehicle.manufacturing_emissions_kg > 5000) {
    flags.push({
      type: 'MISLEADING_ZERO_EMISSION',
      severity: 'HIGH',
      claim: '"Zero Emission Vehicle"',
      reality: `Manufacturing this vehicle emits ${vehicle.manufacturing_emissions_kg.toLocaleString()} kg CO₂ — equivalent to driving a petrol car ${Math.round(vehicle.manufacturing_emissions_kg / 0.13)} km.`,
      recommendation: 'The "zero emission" label only applies to tailpipe emissions, not lifecycle emissions.'
    });
  }

  // Flag 2: EV in high-intensity grid state
  if (vehicle.fuel_type === 'ELECTRIC' && gridIntensity > 0.75) {
    flags.push({
      type: 'HIGH_GRID_INTENSITY',
      severity: 'MEDIUM',
      claim: '"Clean energy driving"',
      reality: `Your state\'s grid intensity is ${gridIntensity} kg CO₂/kWh — charging this EV may produce more lifecycle CO₂ than a comparable CNG vehicle.`,
      recommendation: 'Consider CNG alternatives in coal-heavy grid states, or charge during solar hours if possible.'
    });
  }

  // Flag 3: WLTP figures used without MIDC
  if (vehicle.wltp_efficiency && (!vehicle.midc_efficiency || vehicle.data_source?.includes('Estimated'))) {
    flags.push({
      type: 'WLTP_NOT_MIDC',
      severity: 'LOW',
      claim: `"${vehicle.wltp_efficiency} km/L efficiency"`,
      reality: 'This figure uses WLTP (European test cycle), not MIDC (Indian driving conditions). Real-world Indian efficiency is typically 10-20% lower.',
      recommendation: 'Always compare vehicles using MIDC figures for India-specific accuracy.'
    });
  }

  // Flag 4: No battery recycling program
  if ((vehicle.fuel_type === 'ELECTRIC' || vehicle.fuel_type === 'HYBRID') && 
      !vehicle.has_recycling_program && vehicle.battery_capacity_kwh > 5) {
    flags.push({
      type: 'NO_RECYCLING_PROGRAM',
      severity: 'MEDIUM',
      claim: '"Eco-friendly vehicle"',
      reality: `This vehicle has a ${vehicle.battery_capacity_kwh} kWh battery with no disclosed recycling program. Battery disposal adds ${vehicle.disposal_emissions_kg} kg CO₂ and potential toxic waste.`,
      recommendation: 'Ask the manufacturer about their battery end-of-life plan before purchasing.'
    });
  }

  // Flag 5: Heavy EV (high manufacturing footprint)
  if (vehicle.fuel_type === 'ELECTRIC' && vehicle.kerb_weight_kg > 1800) {
    flags.push({
      type: 'HIGH_WEIGHT_EV',
      severity: 'LOW',
      claim: '"Green transportation"',
      reality: `At ${vehicle.kerb_weight_kg} kg, this is a heavy EV. Heavier vehicles have higher manufacturing emissions and tire/brake particulate matter — even with zero tailpipe emissions.`,
      recommendation: 'Consider lighter EV alternatives for lower overall environmental impact.'
    });
  }

  return flags;
}

module.exports = {
  calculateLifecycleEmissions,
  calculateBreakeven,
  generateMonthlyTimeline,
  calculateTCO,
  detectGreenwashFlags,
  getOperationalEmissionPerKm,
  estimateManufacturingEmissions,
  EMISSION_FACTORS,
  CHARGING_LOSS_FACTOR
};
