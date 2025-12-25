-- Supabase Schema for Wage Lens (Raw Events)
-- Run this in the Supabase SQL Editor

-- Create the events table (raw, minimal interpretation)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  timezone TEXT,
  
  -- Raw page data
  url TEXT NOT NULL,
  page_title TEXT,
  
  -- Price we found (null if none detected)
  scraped_price DECIMAL(10,2),
  
  -- Flexible storage for anything else
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for common queries
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_url ON events(url);

-- GIN index for fast JSONB queries
CREATE INDEX idx_events_metadata ON events USING GIN (metadata);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anon key
CREATE POLICY "Allow anonymous inserts" ON events
  FOR INSERT
  WITH CHECK (true);

-- Allow reads (for future dashboard)
CREATE POLICY "Allow reads" ON events
  FOR SELECT
  USING (true);


-- ============================================
-- USEFUL QUERIES (run these later for analysis)
-- ============================================

-- All events for a user
-- SELECT * FROM events WHERE user_id = 'xxx' ORDER BY timestamp DESC;

-- Detect product pages (you define the logic, not the schema)
-- SELECT * FROM events WHERE url LIKE '%/dp/%' OR url LIKE '%/gp/product/%';

-- Browsing by hour of day
-- SELECT 
--   EXTRACT(HOUR FROM timestamp AT TIME ZONE timezone) as local_hour,
--   COUNT(*) 
-- FROM events 
-- GROUP BY local_hour 
-- ORDER BY local_hour;

-- Total value browsed (only where we found a price)
-- SELECT user_id, SUM(scraped_price) as total_browsed
-- FROM events 
-- WHERE scraped_price IS NOT NULL
-- GROUP BY user_id;

-- Extract ASIN from metadata
-- SELECT metadata->>'asin' as asin, COUNT(*)
-- FROM events
-- WHERE metadata->>'asin' IS NOT NULL
-- GROUP BY asin
-- ORDER BY count DESC;

-- Find repeat views of same product
-- SELECT url, COUNT(*) as views, MIN(timestamp) as first_view, MAX(timestamp) as last_view
-- FROM events
-- WHERE url LIKE '%/dp/%'
-- GROUP BY url
-- HAVING COUNT(*) > 1;

-- Late night browsing (11pm - 3am local time)
-- SELECT *
-- FROM events
-- WHERE EXTRACT(HOUR FROM timestamp AT TIME ZONE timezone) IN (23, 0, 1, 2, 3);
