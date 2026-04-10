/**
 * Service to fetch bus stops using the Overpass API (OpenStreetMap data)
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Fetch bus stops within a given radius of a coordinate
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} radius - Radius in meters
 * @returns {Promise<Array>} List of bus stops
 */
export async function fetchBusStopsAround(latitude, longitude, radius = 2000) {
  const query = `
    [out:json][timeout:25];
    (
      node["highway"="bus_stop"](around:${radius}, ${latitude}, ${longitude});
      node["public_transport"="stop_position"]["bus"="yes"](around:${radius}, ${latitude}, ${longitude});
      way["highway"="bus_stop"](around:${radius}, ${latitude}, ${longitude});
      rel["highway"="bus_stop"](around:${radius}, ${latitude}, ${longitude});
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Overpass API request failed');
    }

    const data = await response.json();
    return processOverpassData(data);
  } catch (error) {
    console.warn('Error fetching bus stops:', error);
    return [];
  }
}

/**
 * Fetch bus stops within a bounding box
 * @param {number} minLat 
 * @param {number} minLon 
 * @param {number} maxLat 
 * @param {number} maxLon 
 * @returns {Promise<Array>}
 */
export async function fetchBusStopsInBBox(minLat, minLon, maxLat, maxLon) {
  const query = `
    [out:json][timeout:25];
    (
      node["highway"="bus_stop"](${minLat}, ${minLon}, ${maxLat}, ${maxLon});
      node["public_transport"="stop_position"]["bus"="yes"](${minLat}, ${minLon}, ${maxLat}, ${maxLon});
    );
    out body;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Overpass API request failed');
    }

    const data = await response.json();
    return processOverpassData(data);
  } catch (error) {
    console.warn('Error fetching bus stops in bbox:', error);
    return [];
  }
}

/**
 * Fetch shops around a coordinate
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} radius 
 * @returns {Promise<Array>} List of shop objects
 */
export async function fetchShopsAround(latitude, longitude, radius = 1500) {
  const query = `
    [out:json][timeout:25];
    node["shop"](around:${radius}, ${latitude}, ${longitude});
    out body;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Overpass API request failed');
    }

    const data = await response.json();
    return data.elements
      .filter(el => el.type === 'node' && el.lat && el.lon)
      .map(el => ({
        id: el.id.toString(),
        name: el.tags?.name || 'Shop',
        latitude: el.lat,
        longitude: el.lon,
        type: 'shop',
        shopType: el.tags?.shop,
        tags: el.tags
      }));
  } catch (error) {
    console.warn('Error fetching shops:', error);
    return [];
  }
}

/**
 * Fetch bus routes (polylines) around a coordinate
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {number} radius 
 * @returns {Promise<Array>} List of route objects with paths
 */
export async function fetchBusRoutesAround(latitude, longitude, radius = 2000) {
  const query = `
    [out:json][timeout:25];
    relation["route"="bus"](around:${radius}, ${latitude}, ${longitude});
    out geom;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error('Overpass API request failed');
    }

    const data = await response.json();
    return processRouteData(data);
  } catch (error) {
    console.warn('Error fetching bus routes:', error);
    return [];
  }
}

/**
 * Fetch all POIs (stops, routes, shops) in a bounding box
 * @param {number} minLat 
 * @param {number} minLon 
 * @param {number} maxLat 
 * @param {number} maxLon 
 * @returns {Promise<Object>} { stops: [], routes: [], shops: [] }
 */
export async function fetchAllPOIInBBox(minLat, minLon, maxLat, maxLon) {
  const query = `
    [out:json][timeout:25];
    (
      node["highway"="bus_stop"](${minLat}, ${minLon}, ${maxLat}, ${maxLon});
      node["public_transport"="stop_position"]["bus"="yes"](${minLat}, ${minLon}, ${maxLat}, ${maxLon});
      node["shop"](${minLat}, ${minLon}, ${maxLat}, ${maxLon});
      relation["route"="bus"](${minLat}, ${minLon}, ${maxLat}, ${maxLon});
    );
    out body geom;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) throw new Error('Overpass API request failed');

    const data = await response.json();
    
    const stops = [];
    const routes = [];
    const shops = [];

    data.elements.forEach(el => {
      if (el.type === 'node') {
        const poi = {
          id: el.id.toString(),
          name: el.tags?.name || 'Point of Interest',
          latitude: el.lat,
          longitude: el.lon,
          tags: el.tags
        };

        if (el.tags?.highway === 'bus_stop' || el.tags?.public_transport === 'stop_position') {
          stops.push({ ...poi, type: 'bus_stop' });
        } else if (el.tags?.shop) {
          shops.push({ ...poi, type: 'shop', shopType: el.tags.shop });
        }
      } else if (el.type === 'relation' && el.tags?.route === 'bus') {
        const path = [];
        el.members?.forEach(m => {
          if (m.type === 'way' && m.geometry) {
            m.geometry.forEach(p => path.push({ latitude: p.lat, longitude: p.lon }));
          }
        });
        if (path.length > 0) {
          routes.push({
            id: el.id.toString(),
            name: el.tags?.name || el.tags?.ref || 'Bus Route',
            ref: el.tags?.ref,
            color: el.tags?.colour || '#4F46E5',
            path
          });
        }
      }
    });

    return { stops, routes, shops };
  } catch (error) {
    console.warn('Error fetching POIs in bbox:', error);
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
            path.push({
              latitude: point.lat,
              longitude: point.lon
            });
          });
        }
      });

      if (path.length > 0) {
        routes.push({
          id: element.id.toString(),
          name: element.tags?.name || element.tags?.ref || 'Bus Route',
          ref: element.tags?.ref,
          color: element.tags?.colour || '#4F46E5',
          path: path
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
      tags: el.tags
    }));
}
