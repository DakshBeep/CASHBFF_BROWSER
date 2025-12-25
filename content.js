// Wage Lens - Content Script
// Runs on all pages, replaces prices with hours of work on shopping sites, logs raw events

(async function() {
  // Get settings
  const settings = await chrome.storage.sync.get({
    hourlyWage: 30,
    supabaseUrl: '',
    supabaseKey: '',
    userId: null
  });

  const HOURLY_WAGE = settings.hourlyWage;

  // Generate user ID if needed
  if (!settings.userId) {
    settings.userId = 'user_' + Math.random().toString(36).substr(2, 9);
    await chrome.storage.sync.set({ userId: settings.userId });
  }

  // Price selectors for Amazon (expanded)
  const priceSelectors = [
    '.a-price .a-offscreen',
    '.a-price-whole',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.a-color-price',
    '[data-a-color="price"] .a-offscreen',
    '.apexPriceToPay .a-offscreen',
    // Format switcher (Kindle, Hardcover, Paperback buttons)
    '#tmmSwatches .a-button-text .a-size-base',
    '#tmmSwatches .slot-price span',
    '.swatchElement .a-color-base',
    // "Other Used, New, Collectible" link
    '#usedBuySection .a-color-price',
    '.olp-from-new-price',
    '.olp-used-good-price',
    '#mediaOlp .a-color-price',
    // More general price patterns
    '.a-text-price .a-offscreen',
    '.a-text-price',
    'span.a-price span.a-offscreen'
  ];

  function parsePrice(text) {
    if (!text) return null;
    // Skip if it's not a dollar amount (like "1 credit")
    if (!text.includes('$')) return null;
    const match = text.replace(/[^0-9.,]/g, '').match(/[\d,]+\.?\d*/);
    if (!match) return null;
    return parseFloat(match[0].replace(/,/g, ''));
  }

  function formatHours(price) {
    const hours = price / HOURLY_WAGE;
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} min of work`;
    } else if (hours < 8) {
      return `${hours.toFixed(1)} hrs of work`;
    } else {
      const days = hours / 8;
      if (days < 5) {
        return `${days.toFixed(1)} days of work`;
      } else {
        const weeks = days / 5;
        return `${weeks.toFixed(1)} weeks of work`;
      }
    }
  }

  // Scrape whatever price we can find (first one)
  function scrapePrice() {
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const price = parsePrice(el.textContent);
        if (price && price > 0) return price;
      }
    }
    return null;
  }

  // Try to extract ASIN from URL or page
  function scrapeASIN() {
    const urlMatch = window.location.pathname.match(/\/(dp|gp\/product)\/([A-Z0-9]{10})/);
    if (urlMatch) return urlMatch[2];
    const asinEl = document.querySelector('[data-asin]');
    if (asinEl) return asinEl.dataset.asin;
    return null;
  }

  // Log raw event to Supabase
  async function logEvent() {
    if (!settings.supabaseUrl || !settings.supabaseKey) {
      console.log('[Wage Lens] No Supabase configured, skipping log');
      return;
    }

    const event = {
      user_id: settings.userId,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      url: window.location.href,
      page_title: document.title,
      scraped_price: scrapePrice(),
      metadata: {
        asin: scrapeASIN(),
        referrer: document.referrer || null,
        viewport_width: window.innerWidth,
        viewport_height: window.innerHeight
      }
    };

    try {
      const res = await fetch(`${settings.supabaseUrl}/rest/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': settings.supabaseKey,
          'Authorization': `Bearer ${settings.supabaseKey}`
        },
        body: JSON.stringify(event)
      });

      if (!res.ok) {
        console.error('[Wage Lens] Failed to log:', res.status, await res.text());
      } else {
        console.log('[Wage Lens] Logged event');
      }
    } catch (err) {
      console.error('[Wage Lens] Error logging event:', err);
    }
  }

  // Convert prices on page
  function convertPrices() {
    priceSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el.dataset.wageLensConverted) return;

        const originalText = el.textContent;
        const price = parsePrice(originalText);

        if (price && price > 0) {
          el.dataset.wageLensConverted = 'true';
          el.dataset.originalPrice = originalText;
          el.textContent = formatHours(price);
          el.classList.add('wage-lens-converted');
          el.title = `Original: ${originalText}`;
        }
      });
    });
  }

  // === Run ===

  // Log this page view (raw data)
  logEvent();

  // Only convert prices on shopping sites
  const isShoppingSite = window.location.hostname.includes('amazon');

  if (isShoppingSite) {
    convertPrices();

    // Watch for dynamic content
    const observer = new MutationObserver(() => {
      convertPrices();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

})();
