import initSqlJs from 'sql.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../pioneers.db');

let db = null;

export async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      leader_id INTEGER,
      max_concurrent_breaks INTEGER DEFAULT 2,
      max_overlap_tolerance INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_number TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'Agent' CHECK(role IN ('Agent', 'TeamLead', 'SuperAdmin')),
      sub_role TEXT,
      team_id INTEGER REFERENCES teams(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shift_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      special_status TEXT,
      special_start_time TIME,
      special_end_time TIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS work_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_date DATE NOT NULL,
      start_time DATETIME,
      end_time DATETIME,
      total_worked_seconds INTEGER DEFAULT 0,
      total_break_seconds INTEGER DEFAULT 0,
      status TEXT DEFAULT 'idle' CHECK(status IN ('idle', 'active', 'paused', 'completed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS breaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      break_date DATE NOT NULL,
      start_time TIME NOT NULL,
      duration_minutes INTEGER NOT NULL CHECK(duration_minutes IN (10, 30)),
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'active', 'completed', 'cancelled')),
      actual_start DATETIME,
      actual_end DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      report_date DATETIME NOT NULL,
      case_id TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('General', 'Technical', 'Other Providers', 'Customer Behavior')),
      impact TEXT NOT NULL CHECK(impact IN ('High', 'Medium', 'Low')),
      description TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      upvotes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS report_upvotes (
      report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (report_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_global INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK(category IN ('İzin', 'Geç Kalma', 'Erken Çıkma', 'Şirket İçi', 'Diğer')),
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      response TEXT,
      responded_by INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sub_role_name TEXT NOT NULL UNIQUE,
      permissions TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed Super Admin if not exists
  const adminResult = db.exec("SELECT id FROM users WHERE agent_number = 'pioneersADMIN'");
  if (adminResult.length === 0 || adminResult[0].values.length === 0) {
    const passwordHash = bcrypt.hashSync('354406', 10);
    db.run(
      "INSERT INTO users (agent_number, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
      ['pioneersADMIN', passwordHash, 'Super Administrator', 'SuperAdmin']
    );
    console.log('✅ Super Admin created: pioneersADMIN / 354406');
  }

  // Seed default team if not exists
  const teamResult = db.exec("SELECT id FROM teams WHERE name = 'İzmir'");
  if (teamResult.length === 0 || teamResult[0].values.length === 0) {
    db.run(
      "INSERT INTO teams (name, max_concurrent_breaks, max_overlap_tolerance) VALUES (?, ?, ?)",
      ['İzmir', 2, 1]
    );
    console.log('✅ Default team created: İzmir');
  }

  saveDatabase();
  console.log('✅ Database initialized');
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Helper functions to match better-sqlite3 API style
export function prepare(sql) {
  return {
    run: (...params) => {
      db.run(sql, params);
      saveDatabase();
      return { changes: db.getRowsModified(), lastInsertRowid: getLastInsertRowId() };
    },
    get: (...params) => {
      const result = db.exec(sql, params);
      if (result.length === 0 || result[0].values.length === 0) return undefined;
      const columns = result[0].columns;
      const values = result[0].values[0];
      const row = {};
      columns.forEach((col, i) => { row[col] = values[i]; });
      return row;
    },
    all: (...params) => {
      const result = db.exec(sql, params);
      if (result.length === 0) return [];
      const columns = result[0].columns;
      return result[0].values.map(values => {
        const row = {};
        columns.forEach((col, i) => { row[col] = values[i]; });
        return row;
      });
    }
  };
}

function getLastInsertRowId() {
  const result = db.exec("SELECT last_insert_rowid() as id");
  return result[0]?.values[0]?.[0] || 0;
}

export function getDb() {
  return { prepare };
}

export default { prepare, getDb, initDatabase, saveDatabase };
