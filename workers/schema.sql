-- TPN CRM Database Schema
-- Cloudflare D1 (SQLite)

-- Leads table: stores all lead submissions
CREATE TABLE leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT UNIQUE NOT NULL,

  -- Contact Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  state TEXT NOT NULL,

  -- Tax Situation
  tax_problem TEXT,
  tax_jurisdiction TEXT,
  tax_data JSON,  -- Flexible storage for conditional fields

  -- Lead Assignment
  buyer_id INTEGER,
  assigned_at TIMESTAMP,
  status TEXT DEFAULT 'new',  -- new, contacted, qualified, closed, lost

  -- Metadata
  source TEXT DEFAULT 'Tax Peace Now Chatbot',
  page_url TEXT,
  fbclid TEXT,
  fbc TEXT,
  fbp TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (buyer_id) REFERENCES buyers(id)
);

-- Indexes for performance
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_buyer_id ON leads(buyer_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_email ON leads(email);

-- Buyers table: resolution companies receiving leads
CREATE TABLE buyers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  is_active INTEGER DEFAULT 1,     -- 0=paused, 1=active
  weight INTEGER DEFAULT 1,         -- For weighted round-robin distribution
  total_leads INTEGER DEFAULT 0,   -- Counter for tracking
  last_assigned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initial buyers with placeholder phone numbers
INSERT INTO buyers (name, phone_number, weight) VALUES
  ('Resolution Company 1', '(800) 555-0001', 1),
  ('Resolution Company 2', '(800) 555-0002', 1);

-- Settings table: key-value configuration storage
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize round-robin position pointer
INSERT INTO settings (key, value) VALUES
  ('round_robin_position', '0');

-- Lead events table (optional): audit trail for status changes
CREATE TABLE lead_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,  -- assigned, status_change, note
  event_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
