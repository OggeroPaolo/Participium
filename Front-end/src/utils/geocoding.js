/**
 * Reverse geocoding using Nominatim (OpenStreetMap)
 * Converts lat/lng to human-readable address
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Cache to avoid repeated requests for same location
const geocodeCache = new Map();

export async function reverseGeocode(lat, lng) {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  
  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?` +
      `lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Participium (civic engagement platform)',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    
    // Format address nicely
    const address = formatAddress(data);
    
    // Cache the result
    geocodeCache.set(cacheKey, address);
    
    return address;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Fallback to coordinates
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

/**
 * Format Nominatim response into readable address
 */
function formatAddress(data) {
  if (!data || !data.address) {
    return 'Unknown location';
  }

  const addr = data.address;
  const parts = [];

  // Street number and name
  if (addr.road) {
    const street = addr.house_number 
      ? `${addr.road} ${addr.house_number}` 
      : addr.road;
    parts.push(street);
  }

  // Neighborhood or suburb
  if (addr.suburb || addr.neighbourhood) {
    parts.push(addr.suburb || addr.neighbourhood);
  }

  // City
  if (addr.city || addr.town || addr.village) {
    parts.push(addr.city || addr.town || addr.village);
  }

  // Country (optional, can remove if always Italy)
  // if (addr.country) {
  //   parts.push(addr.country);
  // }

  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
}

/**
 * Clear the geocoding cache (useful for testing or memory management)
 */
export function clearGeocodeCache() {
  geocodeCache.clear();
}

