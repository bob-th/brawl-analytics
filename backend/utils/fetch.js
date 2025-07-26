export async function fetchWithHandling(url, options = {}) {
  const res = await fetch(url, options);

  if (!res.ok) {
    const body = await res.text();
    console.error(`HTTP error from ${url} (${res.status}):`, body);
    throw new Error(`Request to ${url} failed with status ${res.status}`);
  }

  

  // Assuming you usually expect JSON:
  return res.json();
}