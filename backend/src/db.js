const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'carbon-wise.db');

let db = null;
let dbReady = null;

function initDb() {
  if (dbReady) return dbReady;
  
  dbReady = initSqlJs().then(SQL => {
    let data = null;
    if (fs.existsSync(DB_PATH)) {
      data = fs.readFileSync(DB_PATH);
    }
    
    db = data ? new SQL.Database(data) : new SQL.Database();
    
    if (!data) {
      initializeSchema();
      seedData();
      saveDb();
      console.log('✅ Database initialized and seeded');
    }
    
    return db;
  });
  
  return dbReady;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function initializeSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      variant TEXT,
      fuel_type TEXT NOT NULL,
      manufacture_year INTEGER,
      country_of_assembly TEXT,
      kerb_weight_kg REAL,
      engine_displacement_cc INTEGER,
      battery_capacity_kwh REAL,
      bs_norm TEXT,
      midc_efficiency REAL,
      midc_efficiency_unit TEXT,
      wltp_efficiency REAL,
      manufacturing_emissions_kg REAL,
      disposal_emissions_kg REAL,
      has_recycling_program INTEGER DEFAULT 0,
      data_source TEXT,
      price_lakh REAL,
      seating_capacity INTEGER,
      body_type TEXT,
      segment TEXT,
      greenwash_flags TEXT,
      image_url TEXT,
      last_updated TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS state_grid_intensity (
      state_name TEXT PRIMARY KEY,
      intensity_kg_per_kwh REAL NOT NULL,
      renewable_pct REAL,
      data_year INTEGER,
      source TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fuel_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fuel_type TEXT NOT NULL,
      state_name TEXT NOT NULL,
      price_per_unit REAL NOT NULL,
      unit TEXT,
      updated_date TEXT,
      UNIQUE(fuel_type, state_name)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS community_reports (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT,
      user_state TEXT,
      reported_efficiency REAL,
      usage_pattern TEXT,
      verified INTEGER DEFAULT 0,
      submitted_at TEXT
    )
  `);
}

function seedData() {
  // Seed vehicles
  const vehicles = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'seed-vehicles.json'), 'utf8')
  );
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO vehicles (
      id, make, model, variant, fuel_type, manufacture_year, country_of_assembly,
      kerb_weight_kg, engine_displacement_cc, battery_capacity_kwh, bs_norm,
      midc_efficiency, midc_efficiency_unit, wltp_efficiency,
      manufacturing_emissions_kg, disposal_emissions_kg, has_recycling_program,
      data_source, price_lakh, seating_capacity, body_type, segment,
      greenwash_flags, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const v of vehicles) {
    stmt.run([
      v.id, v.make, v.model, v.variant, v.fuel_type, v.manufacture_year,
      v.country_of_assembly, v.kerb_weight_kg, v.engine_displacement_cc,
      v.battery_capacity_kwh, v.bs_norm, v.midc_efficiency, v.midc_efficiency_unit,
      v.wltp_efficiency, v.manufacturing_emissions_kg, v.disposal_emissions_kg,
      v.has_recycling_program ? 1 : 0, v.data_source, v.price_lakh,
      v.seating_capacity, v.body_type, v.segment || v.body_type,
      JSON.stringify(v.greenwash_flags || []), v.image_url
    ]);
  }
  stmt.free();

  // Seed grid intensity
  const gridData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'seed-grid-intensity.json'), 'utf8')
  );
  
  const gridStmt = db.prepare(`
    INSERT OR REPLACE INTO state_grid_intensity (state_name, intensity_kg_per_kwh, renewable_pct, data_year, source)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const g of gridData) {
    gridStmt.run([g.state_name, g.intensity_kg_per_kwh, g.renewable_pct, g.data_year, g.source]);
  }
  gridStmt.free();

  // Seed fuel prices
  const fuelData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'data', 'seed-fuel-prices.json'), 'utf8')
  );
  
  const fuelStmt = db.prepare(`
    INSERT OR REPLACE INTO fuel_prices (fuel_type, state_name, price_per_unit, unit, updated_date)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const f of fuelData) {
    fuelStmt.run([f.fuel_type, f.state_name, f.price_per_unit, f.unit, f.updated_date]);
  }
  fuelStmt.free();
}

// Helper: run a query and return results as array of objects
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run a query and return first result as object
function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

module.exports = { initDb, getDb, saveDb, queryAll, queryOne };
