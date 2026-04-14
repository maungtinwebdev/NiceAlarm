/**
 * Service to fetch bus stops using the Overpass API (OpenStreetMap data)
 * Uses multiple mirrors with automatic failover and in-memory caching
 */

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
];

// In-memory cache to avoid re-fetching the same area
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limit tracking - don't retry too soon after failures
let lastFailureTime = 0;
const FAILURE_COOLDOWN = 30000; // 30 seconds after all mirrors fail

function getCacheKey(prefix, ...args) {
  return `${prefix}:${args.map(a => Math.round(a * 1000) / 1000).join(',')}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.time < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
  // Keep cache size reasonable
  if (cache.size > 50) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

/**
 * Fetch from Overpass API with automatic mirror failover
 */
async function fetchWithRetry(query, timeout = 60000) {
  // Don't hammer servers if we just failed
  if (Date.now() - lastFailureTime < FAILURE_COOLDOWN) {
    return { elements: [] };
  }

  let lastError = null;
  const shuffled = [...OVERPASS_MIRRORS].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i++) {
    const mirror = shuffled[i];
    try {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(mirror, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal: controller.signal,
      });

      clearTimeout(timerId);

      if (response.ok) {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          if (json.remark || json.error) {
            throw new Error(json.remark || json.error);
          }
          return json;
        } catch (parseErr) {
          throw new Error('Invalid JSON from mirror');
        }
      }

      if (response.status === 429) {
        // Rate limited - silently try next
        continue;
      }

      // 504 or other server error - try next
      continue;
    } catch (error) {
      lastError = error;
    }
  }

  // All mirrors failed - set cooldown
  lastFailureTime = Date.now();
  return { elements: [] }; // Return empty instead of throwing
}

/**
 * Fetch bus stops within a given radius of a coordinate
 */
export async function fetchBusStopsAround(latitude, longitude, radius = 2000) {
  const key = getCacheKey('stops', latitude, longitude, radius);
  const cached = getCached(key);
  if (cached) return cached;

  const query = `
    [out:json][timeout:30];
    (
      node["highway"="bus_stop"](around:${radius}, ${latitude}, ${longitude});
      node["public_transport"="stop_position"]["bus"="yes"](around:${radius}, ${latitude}, ${longitude});
    );
    out body;
  `;

  try {
    const data = await fetchWithRetry(query, 30000);
    const result = processOverpassData(data);
    setCache(key, result);
    return result;
  } catch (error) {
    return [];
  }
}

/**
 * Fetch bus stops within a bounding box
 */
export async function fetchBusStopsInBBox(minLat, minLon, maxLat, maxLon) {
  const key = getCacheKey('stopsbb', minLat, minLon, maxLat, maxLon);
  const cached = getCached(key);
  if (cached) return cached;

  const query = `
    [out:json][timeout:30];
    (
      node["highway"="bus_stop"](${minLat}, ${minLon}, ${maxLat}, ${maxLon});
      node["public_transport"="stop_position"]["bus"="yes"](${minLat}, ${minLon}, ${maxLat}, ${maxLon});
    );
    out body;
  `;

  try {
    const data = await fetchWithRetry(query, 30000);
    const result = processOverpassData(data);
    setCache(key, result);
    return result;
  } catch (error) {
    return [];
  }
}

/**
 * Fetch shops around a coordinate
 */
export async function fetchShopsAround(latitude, longitude, radius = 1500) {
  const key = getCacheKey('shops', latitude, longitude, radius);
  const cached = getCached(key);
  if (cached) return cached;

  const query = `
    [out:json][timeout:30];
    node["shop"](around:${radius}, ${latitude}, ${longitude});
    out body;
  `;

  try {
    const data = await fetchWithRetry(query, 30000);
    const result = (data.elements || [])
      .filter(el => el.type === 'node' && el.lat && el.lon)
      .map(el => ({
        id: el.id.toString(),
        name: el.tags?.name || 'Shop',
        latitude: el.lat,
        longitude: el.lon,
        type: 'shop',
        shopType: el.tags?.shop,
        tags: el.tags,
      }));
    setCache(key, result);
    return result;
  } catch (error) {
    return [];
  }
}

/**
 * Fetch bus routes (polylines) around a coordinate
 */
export async function fetchBusRoutesAround(latitude, longitude, radius = 2000) {
  const key = getCacheKey('routes', latitude, longitude, radius);
  const cached = getCached(key);
  if (cached) return cached;

  const query = `
    [out:json][timeout:30];
    relation["route"="bus"](around:${radius}, ${latitude}, ${longitude});
    out geom;
  `;

  try {
    const data = await fetchWithRetry(query, 45000);
    const result = processRouteData(data);
    setCache(key, result);
    return result;
  } catch (error) {
    return [];
  }
}

/**
 * Fetch all POIs (stops, routes, shops) in a bounding box
 * Uses parallel requests with graceful degradation
 */
export async function fetchAllPOIInBBox(minLat, minLon, maxLat, maxLon) {
  const key = getCacheKey('poi', minLat, minLon, maxLat, maxLon);
  const cached = getCached(key);
  if (cached) return cached;

  // Don't even try if we're in cooldown
  if (Date.now() - lastFailureTime < FAILURE_COOLDOWN) {
    return { stops: [], routes: [], shops: [] };
  }

  const stopsQuery = `[out:json][timeout:30];(node["highway"="bus_stop"](${minLat}, ${minLon}, ${maxLat}, ${maxLon});node["public_transport"="stop_position"]["bus"="yes"](${minLat}, ${minLon}, ${maxLat}, ${maxLon}););out body;`;

  try {
    const stopsData = await fetchWithRetry(stopsQuery, 30000);

    const stops = (stopsData.elements || [])
      .filter(el => el.type === 'node' && el.lat && el.lon)
      .map(el => ({
        id: el.id.toString(),
        name: el.tags?.name || 'Bus Stop',
        latitude: el.lat,
        longitude: el.lon,
        type: 'bus_stop',
        tags: el.tags,
      }));

    const shops = []; // Shops fetching disabled for cleaner map
    const routes = [];
    const result = { stops, routes, shops };
    setCache(key, result);
    return result;
  } catch (error) {
    return { stops: [], routes: [], shops: [] };
  }
}

function processRouteData(data) {
  if (!data || !data.elements) return [];

  const routes = [];
  data.elements.forEach(element => {
    if (element.type === 'relation' && element.members) {
      const path = [];
      element.members.forEach(member => {
        if (member.type === 'way' && member.geometry) {
          member.geometry.forEach(point => {
            path.push({ latitude: point.lat, longitude: point.lon });
          });
        }
      });

      if (path.length > 0) {
        routes.push({
          id: element.id.toString(),
          name: element.tags?.name || element.tags?.ref || 'Bus Route',
          ref: element.tags?.ref,
          color: element.tags?.colour || '#4F46E5',
          path: path,
        });
      }
    }
  });

  return routes;
}

function processOverpassData(data) {
  if (!data || !data.elements) return [];

  return data.elements
    .filter(el => el.type === 'node' && el.lat && el.lon)
    .map(el => ({
      id: el.id.toString(),
      name: el.tags?.name || 'Bus Stop',
      latitude: el.lat,
      longitude: el.lon,
      type: 'bus_stop',
      tags: el.tags,
    }));
}
