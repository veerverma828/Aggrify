export function getSearchEventSource(query, source, location = 'meerut') {
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${apiBaseUrl}/api/search?q=${encodeURIComponent(query.trim())}&source=${source}&location=${encodeURIComponent(location)}`;
  return new EventSource(url);
}
