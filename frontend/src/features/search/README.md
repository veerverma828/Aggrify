# Frontend Search Feature

## Purpose
Enables users to search product prices in real-time. Connects to backend `/api/search` using Server-Sent Events (SSE) and displays product offers in a responsive grid, merging matches from multiple stores (Blinkit and Zepto) into single unified cards.

## Important Files
- `pages/Home.jsx`: Main landing page with the primary search bar and suggested items.
- `pages/Search.jsx`: Search results page displaying streaming content, loading skeletons, error states, and filters.
- `components/ProductCard.jsx`: Renders an individual product with its details, store badges, prices, and cheapest delivery badges.
- `components/StoreSelector.jsx`: Selector to filter queries by All, Blinkit, or Zepto.
- `components/SuggestionChips.jsx`: Interactive query suggestion chips.
- `components/FeatureHighlightGrid.jsx`: Static promotional highlights grid.
- `services/searchApi.js`: Handles connecting to the backend EventSource stream.
- `utils/matching.js`: Core text algorithms to clean, normalize, parse, and identify matching products across stores.
- `constants/searchConstants.js`: Brand names, suggested item list metadata.

## Dependencies
- `react-router-dom`: SPA page routing.
- `tailwindcss` / standard CSS.

## Extension Points
- **Fuzzy Matching logic**: Enhance `utils/matching.js` brand parsing or add Levenshtein distance calculations.
- **Sorting Options**: Add sorting by discount percentage or delivery time to `pages/Search.jsx`.
