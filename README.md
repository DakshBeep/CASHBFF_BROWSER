# Wage Lens 💰⏱️

See prices in hours of your life. A Chrome extension to reframe spending impulses.

## Quick Start (5 minutes)

### 1. Add Icons (required for Chrome)

Create simple icon files or download any 3 square images and rename them:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

Or run this in the folder to create simple placeholders (requires ImageMagick):
```bash
convert -size 16x16 xc:#007AFF icon16.png
convert -size 48x48 xc:#007AFF icon48.png
convert -size 128x128 xc:#007AFF icon128.png
```

Or just grab any icons and rename them - you can make nice ones later.

### 2. Load the Extension

1. Open Chrome → `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select this `wage-lens` folder
5. Done! Visit Amazon.

### 3. Set Your Hourly Wage

1. Click the extension icon in Chrome toolbar
2. Enter your hourly wage
3. Click Save
4. Refresh any Amazon page

### 4. (Optional) Enable Data Tracking

If you want to log browsing patterns to analyze later:

1. Create a free Supabase account at https://supabase.com
2. Create a new project
3. Go to SQL Editor and run the contents of `supabase-schema.sql`
4. Go to Settings → API and copy:
   - Project URL (looks like `https://xxx.supabase.co`)
   - `anon` `public` key (the long one starting with `eyJ`)
5. Paste these into the extension popup
6. Save - now your browsing is being logged!

## What Gets Logged

When Supabase is configured:
- Page views on Amazon
- Product views (URL, title, price)
- Timestamp and timezone

All data is tied to an anonymous user ID stored locally. No personal info.

## Files

```
wage-lens/
├── manifest.json      # Extension config
├── content.js         # Runs on Amazon, converts prices
├── popup.html/js      # Settings UI
├── styles.css         # Styling for converted prices
├── background.js      # Service worker
└── supabase-schema.sql # Database setup
```

## Future Ideas

- [ ] Support more sites (eBay, Walmart, etc.)
- [ ] Hover to show original price
- [ ] Daily/weekly spending summaries
- [ ] "Cooling off" alerts for expensive items
- [ ] Pattern detection (late night shopping, etc.)
- [ ] Dashboard to visualize browsing vs. buying

---

Built in one night. Ship it. 🚀
