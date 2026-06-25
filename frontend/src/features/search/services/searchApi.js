export function getSearchEventSource(query, source) {
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${apiBaseUrl}/api/search?q=${encodeURIComponent(query.trim())}&source=${source}`;
  return new EventSource(url);
}
