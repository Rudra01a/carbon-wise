const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

async function seedDatabase() {
  const SQL = await initSqlJs();
  console.log('sql.js loaded');
  
  const db = new SQL.Database();
  console.log('DB created in memory');
  
  // Create schema
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY, make TEXT NOT NULL, model TEXT NOT NULL, variant TEXT,
      fuel_type TEXT NOT NULL, manufacture_year INTEGER, country_of_assembly TEXT,
      kerb_weight_kg REAL, engine_displacement_cc INTEGER, battery_capacity_kwh REAL,
      bs_norm TEXT, midc_efficiency REAL, midc_efficiency_unit TEXT, wltp_efficiency REAL,
      manufacturing_emissions_kg REAL, disposal_emissions_kg REAL, has_recycling_program INTEGER DEFAULT 0,
      data_source TEXT, price_lakh REAL, seating_capacity INTEGER, body_type TEXT,
      segment TEXT, greenwash_flags TEXT, image_url TEXT, last_updated TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS state_grid_intensity (
      state_name TEXT PRIMARY KEY, intensity_kg_per_kwh REAL NOT NULL,
      renewable_pct REAL, data_year INTEGER, source TEXT
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS fuel_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, fuel_type TEXT NOT NULL,
      state_name TEXT NOT NULL, price_per_unit REAL NOT NULL,
      unit TEXT, updated_date TEXT, UNIQUE(fuel_type, state_name)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS community_reports (
      id TEXT PRIMARY KEY, vehicle_id TEXT, user_state TEXT,
      reported_efficiency REAL, usage_pattern TEXT,
      verified INTEGER DEFAULT 0, submitted_at TEXT
    )
  `);
  console.log('Schema created');
  
  // Seed vehicles
  const vehicles = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'seed-vehicles.json'), 'utf8'));
  
  const vstmt = db.prepare(`
    INSERT OR REPLACE INTO vehicles (
      id, make, model, variant, fuel_type, manufacture_year, country_of_assembly,
      kerb_weight_kg, engine_displacement_cc, battery_capacity_kwh, bs_norm,
      midc_efficiency, midc_efficiency_unit, wltp_efficiency,
      manufacturing_emissions_kg, disposal_emissions_kg, has_recycling_program,
      data_source, price_lakh, seating_capacity, body_type, segment,
      greenwash_flags, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    try {
      vstmt.run([
        v.id, v.make, v.model, v.variant, v.fuel_type, v.manufacture_year,
        v.country_of_assembly, v.kerb_weight_kg, v.engine_displacement_cc,
        v.battery_capacity_kwh, v.bs_norm, v.midc_efficiency, v.midc_efficiency_unit,
        v.wltp_efficiency, v.manufacturing_emissions_kg, v.disposal_emissions_kg,
        v.has_recycling_program ? 1 : 0, v.data_source, v.price_lakh,
        v.seating_capacity, v.body_type, v.segment || v.body_type,
        JSON.stringify(v.greenwash_flags || []), v.image_url || null
      ]);
    } catch(e) {
      console.error('Failed at vehicle', i, v.id, ':', String(e));
      throw e;
    }
  }
  vstmt.free();
  console.log('Seeded', vehicles.length, 'vehicles');
  
  // Seed grid intensity
  const gridData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'seed-grid-intensity.json'), 'utf8'));
  const gstmt = db.prepare(`INSERT OR REPLACE INTO state_grid_intensity (state_name, intensity_kg_per_kwh, renewable_pct, data_year, source) VALUES (?, ?, ?, ?, ?)`);
  for (const g of gridData) { gstmt.run([g.state_name, g.intensity_kg_per_kwh, g.renewable_pct, g.data_year, g.source]); }
  gstmt.free();
  console.log('Seeded', gridData.length, 'grid entries');
  
  // Seed fuel prices
  const fuelData = JSON.parse(fs.readFileSync(path.join(__dirname, 'src', 'data', 'seed-fuel-prices.json'), 'utf8'));
  const fstmt = db.prepare(`INSERT OR REPLACE INTO fuel_prices (fuel_type, state_name, price_per_unit, unit, updated_date) VALUES (?, ?, ?, ?, ?)`);
  for (const f of fuelData) { fstmt.run([f.fuel_type, f.state_name, f.price_per_unit, f.unit, f.updated_date]); }
  fstmt.free();
  console.log('Seeded', fuelData.length, 'fuel prices');
  
  // Save
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(path.join(__dirname, 'carbon-wise.db'), buffer);
  console.log('DB saved:', buffer.length, 'bytes');
  console.log('DONE');
}

seedDatabase().then(() => {
  // Give time for async cleanup
  setTimeout(() => {}, 500);
}).catch(e => console.error('SEED ERROR:', String(e)));
