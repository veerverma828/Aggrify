const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedProducts(query, source) {
  const key = `${source || 'all'}:${query.toLowerCase().trim()}`;
  const cached = searchCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    searchCache.delete(key);
    return null;
  }
  return cached.products;
}

function setCachedProducts(query, source, products) {
  const key = `${source || 'all'}:${query.toLowerCase().trim()}`;
  searchCache.set(key, {
    products,
    timestamp: Date.now()
  });
}

module.exports = {
  getCachedProducts,
  setCachedProducts
};
