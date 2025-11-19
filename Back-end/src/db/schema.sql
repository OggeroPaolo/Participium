-- ============================================
-- Participium Database Schema
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role_id INTEGER NOT NULL DEFAULT 1,
  profile_photo_url TEXT,
  telegram_username TEXT,
  email_notifications_enabled INTEGER DEFAULT 1, -- SQLite uses INTEGER for boolean (1=true, 0=false)
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Offices table. TODO: type necessary?
CREATE TABLE IF NOT EXISTS offices (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('organization', 'technical')),
  category_id INTEGER UNIQUE,
  email TEXT,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status in ('pending_approval', 'assigned', 'in_progress', 'suspended', 'rejected', 'resolved')),
  assigned_to INTEGER,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  note TEXT,
  position_lat REAL NOT NULL,
  position_lng REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  ordering INTEGER NOT NULL CHECK(ordering >=1 AND ordering <=3),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);
-- ============================================
-- Indexes for better query performance
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- Offices indexes
CREATE INDEX IF NOT EXISTS idx_offices_type ON offices(type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_offices_category_id ON offices(category_id);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

-- Reports indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_reports_assigned_to ON reports(assigned_to);

-- Photos indexes
CREATE INDEX IF NOT EXISTS idx_photos_report_id ON photos(report_id);

-- ============================================
-- Triggers for updated_at timestamps
-- ============================================

-- Users updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Offices updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_offices_updated_at
AFTER UPDATE ON offices
FOR EACH ROW
BEGIN
  UPDATE offices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Categories updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_categories_updated_at
AFTER UPDATE ON categories
FOR EACH ROW
BEGIN
  UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Reports updated_at trigger
CREATE TRIGGER IF NOT EXISTS trigger_reports_updated_at
AFTER UPDATE ON reports
FOR EACH ROW
BEGIN
  UPDATE reports SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
