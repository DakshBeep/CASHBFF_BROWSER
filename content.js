// CashBFF - Content Script
// Replaces prices with hours of work on shopping sites

(async function() {
  const analytics = window.__cashbff_analytics || {};
  const track = analytics.track || (() => {});

  // Get settings
  const settings = await chrome.storage.sync.get({
    hourlyWage: 20
  });

  const HOURLY_WAGE = settings.hourlyWage;
  const hostname = window.location.hostname;
  const domain = hostname.replace(/^www\./, '');

  // Track prices found on this page for analytics
  const pricesFoundOnPage = [];

  // Price selectors for Amazon (expanded)
  const priceSelectors = [
    '.a-price .a-offscreen',
    '.a-price-whole',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    'span.a-color-price',
    '[data-a-color="price"] .a-offscreen',
    '.apexPriceToPay .a-offscreen',
    // Buy box / Buy Now section prices
    '#corePrice_feature_div .a-price .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
    '.priceToPay .a-offscreen',
    '#price_inside_buybox',
    '#newBuyBoxPrice',
    '.reinventPricePriceToPayMargin .a-offscreen',
    '#buyNewSection .a-price .a-offscreen',
    '#apex_offerDisplay_desktop .a-price .a-offscreen',
    // List price / strikethrough price
    '.basisPrice .a-offscreen',
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
    'span.a-price span.a-offscreen',
    // Competitively priced / value pick section
    '#value-pick-price-view',
    // Unit price (e.g., "$5.99/count")
    '#value-pick-price-view + .a-color-secondary',
    // Cart/checkout totals
    'span.a-color-base[class*="total-amount"]',
    // Cart sidebar prices
    'h2.a-color-price',
    'span.a-text-bold',
    // Cart page subtotal
    '.sc-price',
    // Sephora prices
    '[data-at="product_sale_price"]',
    '[data-at="product_list_price"]',
    '[data-at="price"]',
    '[data-at="sku_price"]'
  ];

  function parsePrice(text, requireDollar = true) {
    if (!text) return null;
    // Skip if it's not a dollar amount (like "1 credit") - unless we're parsing a known price element
    if (requireDollar && !text.includes('$')) return null;
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

  // Convert prices on page
  function convertPrices() {
    // First, handle aok-offscreen elements (screen reader price text that appears before .a-price)
    document.querySelectorAll('.aok-offscreen').forEach(el => {
      if (el.dataset.wageLensConverted) return;

      const originalText = el.textContent;
      const price = parsePrice(originalText);

      if (price && price > 0) {
        el.dataset.wageLensConverted = 'true';
        el.dataset.originalPrice = originalText;
        // Keep it hidden but update the text for screen readers
        el.textContent = ` ${formatHours(price)} `;
        pricesFoundOnPage.push(price);
      }
    });

    // Handle price containers that have .a-offscreen children (.a-price, .a-text-price, etc.)
    // These have the structure: container > .a-offscreen (hidden full price) + visible parts
    document.querySelectorAll('.a-price, .a-text-price').forEach(priceContainer => {
      if (priceContainer.dataset.wageLensConverted) return;

      // Find the .a-offscreen element which contains the full price like "$17.75"
      // Also check for price in aok-offscreen sibling or the visible price parts
      const offscreen = priceContainer.querySelector('.a-offscreen');

      let originalText = offscreen?.textContent?.trim();
      let price = parsePrice(originalText);

      // If .a-offscreen is empty, try to construct price from visible parts
      if (!price) {
        const whole = priceContainer.querySelector('.a-price-whole');
        const fraction = priceContainer.querySelector('.a-price-fraction');
        if (whole && fraction) {
          originalText = `$${whole.textContent.replace(/\D/g, '')}.${fraction.textContent}`;
          price = parsePrice(originalText);
        }
      }

      // Also try aria-hidden span (used in twister/variant selectors)
      if (!price) {
        const ariaHidden = priceContainer.querySelector('span[aria-hidden="true"]');
        if (ariaHidden) {
          originalText = ariaHidden.textContent.trim();
          price = parsePrice(originalText);
        }
      }

      if (price && price > 0) {
        priceContainer.dataset.wageLensConverted = 'true';
        priceContainer.dataset.originalPrice = originalText;
        priceContainer.title = `Original: ${originalText}`;

        // Hide all children and insert our text
        Array.from(priceContainer.children).forEach(child => {
          child.style.display = 'none';
        });

        // Add our converted price as a visible span
        const hoursSpan = document.createElement('span');
        hoursSpan.className = 'wage-lens-converted';
        hoursSpan.textContent = formatHours(price);
        priceContainer.appendChild(hoursSpan);

        pricesFoundOnPage.push(price);
        addHoverTracking(priceContainer);
      }
    });

    // Then handle other selectors that aren't price containers we already handled
    priceSelectors.forEach(selector => {
      // Skip the selectors we handled above
      if (selector.includes('.a-price') || selector.includes('.a-text-price')) return;

      document.querySelectorAll(selector).forEach(el => {
        if (el.dataset.wageLensConverted) return;
        // Skip if inside a container that was already converted
        if (el.closest('[data-wage-lens-converted]')) return;
        // Skip container elements that have child elements (not just text)
        if (el.querySelector('*')) return;

        const originalText = el.textContent;
        const price = parsePrice(originalText);

        if (price && price > 0) {
          el.dataset.wageLensConverted = 'true';
          el.dataset.originalPrice = originalText;
          el.classList.add('wage-lens-converted');
          el.title = `Original: ${originalText}`;

          // Check if this is a unit price (e.g., "$5.99/count", "$2.50/oz")
          const unitMatch = originalText.match(/\/\w+/);
          if (unitMatch) {
            // Preserve the unit suffix
            el.textContent = `(${formatHours(price)}${unitMatch[0]})`;
          } else {
            el.textContent = formatHours(price);
          }

          pricesFoundOnPage.push(price);
          addHoverTracking(el);
        }
      });
    });

    // Handle coupon labels specially (they have nested spans)
    document.querySelectorAll('.couponLabel').forEach(el => {
      if (el.dataset.wageLensConverted) return;

      const originalText = el.textContent;
      const price = parsePrice(originalText);

      if (price && price > 0) {
        el.dataset.wageLensConverted = 'true';
        el.dataset.originalPrice = originalText;
        el.title = `Original: ${originalText}`;
        el.innerHTML = `<span>You pay </span>${formatHours(price)}`;
        pricesFoundOnPage.push(price);
      }
    });

    // Handle Sephora prices in css-* elements (single prices and ranges)
    // Use CSS-based approach to survive React re-renders
    if (hostname.includes('sephora')) {
      document.querySelectorAll('span[class^="css-"], b[class^="css-"]').forEach(el => {
        if (el.closest('[data-wage-lens-converted]')) return;
        if (el.querySelector('*')) return;

        const text = el.textContent.trim();
        // Skip if doesn't start with $ (not a price)
        if (!text.startsWith('$')) return;
        // Skip if already has our converted value attribute
        if (el.dataset.convertedValue) return;

        let convertedText = null;

        // Match price range pattern: $X.XX - $Y.YY
        const rangeMatch = text.match(/^\$(\d+(?:\.\d+)?)\s*-\s*\$(\d+(?:\.\d+)?)$/);
        if (rangeMatch) {
          const lowPrice = parseFloat(rangeMatch[1]);
          const highPrice = parseFloat(rangeMatch[2]);
          if (lowPrice > 0 && highPrice > 0) {
            convertedText = `${formatHours(lowPrice)} - ${formatHours(highPrice)}`;
          }
        }

        // Match single price pattern: $X or $X.XX
        if (!convertedText) {
          const singleMatch = text.match(/^\$(\d+(?:\.\d+)?)$/);
          if (singleMatch) {
            const price = parseFloat(singleMatch[1]);
            if (price > 0) {
              convertedText = formatHours(price);
            }
          }
        }

        // Fallback: try generic price parsing
        if (!convertedText) {
          const price = parsePrice(text);
          if (price && price > 0) {
            convertedText = formatHours(price);
          }
        }

        if (convertedText) {
          el.dataset.convertedValue = convertedText;
          el.dataset.originalPrice = text;
          el.classList.add('sephora-price-converted');
          el.title = `Original: ${text}`;
          const p = parsePrice(text);
          if (p) pricesFoundOnPage.push(p);
          addHoverTracking(el);
        }
      });
    }
  }

  // === Analytics helpers ===

  let analyticsFiredForPage = false;

  function firePageAnalytics() {
    if (analyticsFiredForPage || pricesFoundOnPage.length === 0) return;
    analyticsFiredForPage = true;

    // Tier 2: page converted
    track('page_converted', { domain, price_count: pricesFoundOnPage.length });

    // Tier 3: price buckets (deduplicated)
    const bucketsSeen = new Set();
    const priceBucket = analytics.priceBucket || (() => null);
    pricesFoundOnPage.forEach(p => {
      const bucket = priceBucket(p);
      if (bucket && !bucketsSeen.has(bucket)) {
        bucketsSeen.add(bucket);
        track('price_bucket', { bucket });
      }
    });

    // Tier 3: time of day
    const timeOfDayPeriod = analytics.timeOfDayPeriod || (() => null);
    const period = timeOfDayPeriod();
    if (period) {
      track('time_of_day', { period });
    }
  }

  function addHoverTracking(el) {
    el.addEventListener('mouseenter', () => {
      if (!el.dataset.hoverTracked) {
        el.dataset.hoverTracked = 'true';
        track('price_hover', { domain });
      }
    }, { once: true });
  }

  // === Run ===

  // Only convert prices on shopping sites
  const isShoppingSite = hostname.includes('amazon') || hostname.includes('sephora');

  if (isShoppingSite) {
    convertPrices();

    // Fire analytics after initial conversion
    firePageAnalytics();

    // Watch for dynamic content with debounce
    let debounceTimer;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        convertPrices();
        firePageAnalytics();
      }, 50);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

})();
