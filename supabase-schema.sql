-- CashBFF Anonymous Analytics Schema
-- Run this in the Supabase SQL Editor
-- No PII, no URLs, no exact prices — just anonymous usage events

-- Drop old table if migrating
-- DROP TABLE IF EXISTS events;

CREATE TABLE anon_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anon_id TEXT NOT NULL,
  event TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_anon_events_anon_id ON anon_events(anon_id);
CREATE INDEX idx_anon_events_event ON anon_events(event);
CREATE INDEX idx_anon_events_created_at ON anon_events(created_at);
CREATE INDEX idx_anon_events_payload ON anon_events USING GIN (payload);

-- Row Level Security
ALTER TABLE anon_events ENABLE ROW LEVEL SECURITY;

-- Anon key can only INSERT (no reads, no updates, no deletes)
CREATE POLICY "Allow anonymous inserts" ON anon_events
  FOR INSERT WITH CHECK (true);

-- Only service_role can read (for your dashboard queries)
CREATE POLICY "Service role reads" ON anon_events
  FOR SELECT USING (auth.role() = 'service_role');


-- ============================================
-- USEFUL QUERIES (run with service_role key)
-- ============================================

-- Daily active users
-- SELECT DATE(created_at) as day, COUNT(DISTINCT anon_id)
-- FROM anon_events WHERE event = 'daily_active'
-- GROUP BY day ORDER BY day DESC;

-- Installs over time
-- SELECT DATE(created_at) as day, COUNT(*)
-- FROM anon_events WHERE event = 'install'
-- GROUP BY day ORDER BY day DESC;

-- Which domains are most used
-- SELECT payload->>'domain' as domain, COUNT(*)
-- FROM anon_events WHERE event = 'page_converted'
-- GROUP BY domain ORDER BY count DESC;

-- Price bucket distribution
-- SELECT payload->>'bucket' as bucket, COUNT(*)
-- FROM anon_events WHERE event = 'price_bucket'
-- GROUP BY bucket ORDER BY count DESC;

-- Time of day usage
-- SELECT payload->>'period' as period, COUNT(*)
-- FROM anon_events WHERE event = 'time_of_day'
-- GROUP BY period ORDER BY count DESC;

-- Average prices converted per page
-- SELECT AVG((payload->>'price_count')::int) as avg_prices
-- FROM anon_events WHERE event = 'page_converted';

-- Onboarding completion (wage_set vs install)
-- SELECT event, COUNT(DISTINCT anon_id)
-- FROM anon_events WHERE event IN ('install', 'wage_set')
-- GROUP BY event;
