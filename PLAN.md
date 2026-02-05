# CashBFF — Anonymous Analytics & Privacy Policy Plan

## Overview
Add anonymous, privacy-respecting analytics (all 3 tiers) and a privacy policy with a working link, ready for Chrome Web Store resubmission.

---

## What We're Tracking (Anonymous Events)

All events use a locally-generated anonymous ID (UUID stored in `chrome.storage.local`). No PII, no full URLs, no exact prices, no wage values.

### Events & Payloads

| Event | Payload | Tier |
|-------|---------|------|
| `install` | `{ version }` | 1 |
| `daily_active` | `{ version }` | 1 |
| `wage_set` | `{ is_default: bool }` | 1 |
| `page_converted` | `{ domain, price_count }` | 2 |
| `price_bucket` | `{ bucket: "0-10" \| "10-50" \| "50-200" \| "200+" }` | 3 |
| `time_of_day` | `{ period: "morning" \| "afternoon" \| "evening" \| "night" }` | 3 |
| `price_hover` | `{ domain }` | 3 |

**No exact prices, no URLs beyond domain, no wage values, no product info.**

---

## Architecture

### Backend: Supabase (reuse existing project setup)

Replace `supabase-schema.sql` with a new anonymous-events schema:

```sql
CREATE TABLE anon_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anon_id TEXT NOT NULL,        -- locally generated UUID
  event TEXT NOT NULL,           -- event name from table above
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Client-side: New `analytics.js` module

- Generates/stores anonymous UUID in `chrome.storage.local`
- Exposes `track(event, payload)` function
- Sends events to Supabase via REST API (anon key, insert-only)
- Batches events (flush every 30s or on page unload)
- Respects a `trackingEnabled` setting (default: true, user can opt out in popup)
- Daily active ping: check `lastActiveDate` in storage, send once per day

### Files to modify/create:

1. **`analytics.js`** (NEW) — analytics module
2. **`content.js`** — import analytics, fire `page_converted`, `price_bucket`, `time_of_day`, `price_hover` events
3. **`background.js`** — fire `install` event on `onInstalled`, fire `daily_active` on alarm
4. **`popup.js`** — fire `wage_set` event when wage is saved
5. **`popup.html`** — add opt-out toggle + privacy policy link
6. **`manifest.json`** — add `alarms` permission (for daily ping), keep `storage`
7. **`supabase-schema.sql`** — replace with new anonymous schema
8. **`privacy-policy.html`** (NEW) — privacy policy page (hosted via GitHub Pages or similar)
9. **`styles.css`** — minor additions for opt-out toggle styling

---

## Implementation Steps

### Step 1: New Supabase schema
- Rewrite `supabase-schema.sql` with the `anon_events` table
- Add RLS policy for insert-only from anon key
- Add indexes on `anon_id`, `event`, `created_at`

### Step 2: Create `analytics.js`
- Anonymous ID generation/retrieval
- `track(event, payload)` function
- Event batching (queue + flush every 30s)
- `navigator.sendBeacon` fallback on page unload
- Config: Supabase URL + anon key (hardcoded or from storage)
- Opt-out check: read `trackingEnabled` from storage

### Step 3: Update `manifest.json`
- Add `"alarms"` permission
- Add `analytics.js` to content_scripts js array
- Bump version to `0.2.0`

### Step 4: Update `background.js`
- On install: generate anon_id, fire `install` event
- Set up daily alarm, fire `daily_active` event
- Listen for `wage_set` messages from popup

### Step 5: Update `content.js`
- After converting prices, fire `page_converted` with domain + count
- Bucket prices and fire `price_bucket` events
- Determine time-of-day period and fire `time_of_day`
- Add hover listener on converted prices for `price_hover`

### Step 6: Update `popup.js` + `popup.html`
- Add tracking opt-out toggle
- Add privacy policy link
- Fire `wage_set` event on save

### Step 7: Write `privacy-policy.html`
- Plain HTML page, can be hosted anywhere
- Covers: what data is collected, what is NOT collected, anonymous ID explanation, opt-out instructions, contact info
- Link from popup.html and manifest.json

### Step 8: Update `styles.css`
- Style the opt-out toggle in popup

---

## Privacy Policy Content (Summary)

- CashBFF collects anonymous usage data to improve the extension
- Data collected: event types (install, daily active, page views by domain, price range buckets, time-of-day buckets)
- Data NOT collected: browsing history, URLs, product names, prices, wages, personal information
- All data tied to a random anonymous ID with no way to identify you
- You can opt out in extension settings
- No data is sold or shared with third parties
- Contact: [your email]

---

## Open Questions for User

1. Supabase project URL + anon key — do you have these already, or should I add placeholder config?
2. Privacy policy hosting — GitHub Pages? Or do you have a domain?
3. Contact email for privacy policy?
