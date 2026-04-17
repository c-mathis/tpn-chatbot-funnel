-- Migration: Add emails_sent table for Resend email audit trail
-- Run: wrangler d1 execute tpn_crm --file=migrations/0001_add_emails_sent.sql

CREATE TABLE IF NOT EXISTS emails_sent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_event_id TEXT,
  email_type TEXT NOT NULL,       -- 'confirmation' | 'internal_notification' | 'firm_delivery' | 'abandoned' | 'drip_1' etc.
  to_address TEXT NOT NULL,
  subject TEXT,
  resend_id TEXT,                 -- Resend's message ID for correlation with webhooks
  status TEXT DEFAULT 'sent',     -- 'sent' | 'failed'
  sent_at TEXT                    -- ISO timestamp
);

-- Index for looking up emails by lead
CREATE INDEX IF NOT EXISTS idx_emails_sent_lead ON emails_sent(lead_event_id);

-- Index for filtering by type (useful for drip sequence queries later)
CREATE INDEX IF NOT EXISTS idx_emails_sent_type ON emails_sent(email_type);
