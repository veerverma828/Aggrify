export function getSearchEventSource(query, source, location = 'meerut', refresh = false) {
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${apiBaseUrl}/api/search?q=${encodeURIComponent(query.trim())}&source=${source}&location=${encodeURIComponent(location)}${refresh ? '&refresh=true' : ''}`;
  return new EventSource(url);
}
