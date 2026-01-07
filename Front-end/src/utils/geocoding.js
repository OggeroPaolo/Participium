/**
 * Reverse geocoding using Nominatim (OpenStreetMap)
 * Converts lat/lng to human-readable address
 */

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// Approximate Torino bounding box (covers the geojson area we draw on the map)
export const TURIN_BOUNDING_BOX = Object.freeze({
  north: 45.15,
  south: 44.95,
  west: 7.55,
  east: 7.8,
});

const TURIN_VIEWBOX = Object.freeze({
  left: TURIN_BOUNDING_BOX.west,
  top: TURIN_BOUNDING_BOX.north,
  right: TURIN_BOUNDING_BOX.east,
  bottom: TURIN_BOUNDING_BOX.south,
});

// Cache to avoid repeated requests for same location/query
const reverseGeocodeCache = new Map();
const forwardGeocodeCache = new Map();

const DEFAULT_HEADERS = {
  "User-Agent": "Participium (civic engagement platform)",
};

export async function reverseGeocode(lat, lng) {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  
  // Check cache first
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}/reverse?` +
      `lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: DEFAULT_HEADERS,
      }
    );

    if (!response.ok) {
      throw new Error("Geocoding failed");
    }

    const data = await response.json();
    
    // Format address nicely
    const address = formatAddress(data);

    // Cache the result
    reverseGeocodeCache.set(cacheKey, address);
    
    return address;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Fallback to coordinates
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

/**
 * Forward geocoding using Nominatim.
 * Converts free-text address to coordinates.
 */
export async function forwardGeocode(query, options = {}) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return null;
  }

  if (forwardGeocodeCache.has(normalizedQuery)) {
    return forwardGeocodeCache.get(normalizedQuery);
  }

  const {
    signal,
    bounds = TURIN_BOUNDING_BOX,
    viewbox = TURIN_VIEWBOX,
    limit = 3,
  } = options;

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: String(limit),
    addressdetails: "1",
  });

  if (viewbox) {
    params.append(
      "viewbox",
      `${viewbox.left},${viewbox.top},${viewbox.right},${viewbox.bottom}`
    );
    params.append("bounded", "1");
  }

  const url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal,
    });

    if (!response.ok) {
      throw new Error("Forward geocoding failed");
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      forwardGeocodeCache.set(normalizedQuery, null);
      return null;
    }

    const candidate = data.find((item) => {
      const latNum = parseFloat(item.lat);
      const lngNum = parseFloat(item.lon);
      return isWithinBounds(latNum, lngNum, bounds);
    });

    if (!candidate) {
      forwardGeocodeCache.set(normalizedQuery, null);
      return null;
    }

    const result = {
      lat: parseFloat(candidate.lat),
      lng: parseFloat(candidate.lon),
      displayName: candidate.display_name,
    };

    forwardGeocodeCache.set(normalizedQuery, result);
    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }
    console.error("Forward geocoding error:", error);
    return null;
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

export function isWithinBounds(lat, lng, bounds = TURIN_BOUNDING_BOX) {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !bounds ||
    typeof bounds !== "object"
  ) {
    return false;
  }

  return (
    lat <= bounds.north &&
    lat >= bounds.south &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

/**
 * Clear the geocoding cache (useful for testing or memory management)
 */
export function clearGeocodeCache() {
  reverseGeocodeCache.clear();
  forwardGeocodeCache.clear();
}

