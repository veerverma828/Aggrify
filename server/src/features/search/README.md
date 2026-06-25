# Backend Search Feature

## Purpose
Scrapes real-time quick commerce product data (prices, weights, discounts, delivery times) from Blinkit and Zepto using Playwright Chromium instances and exposes a Server-Sent Events (SSE) stream to the client.

## Important Files
- `routes/searchRoutes.js`: Express endpoint `/api/search` handler.
- `scrapers/blinkitScraper.js`: Crawls Blinkit.
- `scrapers/zeptoScraper.js`: Crawls Zepto (includes address/location selection).
- `services/browser.js`: Controls Playwright browser instance.
- `services/cache.js`: In-memory query caching mechanism.

## Dependencies
- `@playwright/test`: Launches Chromium.
- `express`: Handles routing.

## Extension Points
- **New Scrapers**: Add a new scraper in the `scrapers/` folder and include it in `routes/searchRoutes.js`.
- **Cache Persistence**: Swap `services/cache.js` in-memory Map with Redis or a persistent key-value store.
