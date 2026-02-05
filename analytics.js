// CashBFF Anonymous Analytics
// No PII, no URLs, no exact prices — just anonymous usage events

const SUPABASE_URL = 'https://nsrofxehicljgifexjfd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_I3WCB_2buOn9US2B7GiUtQ_tLRYWZQX';

const FLUSH_INTERVAL = 30000; // 30 seconds
const TABLE = 'anon_events';

let eventQueue = [];
let anonId = null;

// Generate or retrieve anonymous ID
async function getAnonId() {
  if (anonId) return anonId;
  const result = await chrome.storage.local.get({ anonId: null });
  if (result.anonId) {
    anonId = result.anonId;
  } else {
    anonId = crypto.randomUUID();
    await chrome.storage.local.set({ anonId });
  }
  return anonId;
}

// Check if tracking is enabled
async function isTrackingEnabled() {
  const result = await chrome.storage.sync.get({ trackingEnabled: true });
  return result.trackingEnabled;
}

// Queue an event for sending
async function track(event, payload = {}) {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return; // not configured
  if (!(await isTrackingEnabled())) return;

  const id = await getAnonId();
  eventQueue.push({
    anon_id: id,
    event,
    payload,
  });
}

// Flush queued events to Supabase
async function flush() {
  if (eventQueue.length === 0) return;
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL') return;

  const batch = eventQueue.splice(0);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      // Put events back on queue to retry next flush
      eventQueue.unshift(...batch);
    }
  } catch {
    // Network error — put events back
    eventQueue.unshift(...batch);
  }
}

// Flush on interval
setInterval(flush, FLUSH_INTERVAL);

// Flush on page unload
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  });
}

// Price bucket helper
function priceBucket(price) {
  if (price <= 10) return '0-10';
  if (price <= 50) return '10-50';
  if (price <= 200) return '50-200';
  return '200+';
}

// Time of day helper
function timeOfDayPeriod() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

// Make available globally for content script and background (service worker)
const _global = typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : {};
_global.__cashbff_analytics = { track, flush, getAnonId, priceBucket, timeOfDayPeriod };
