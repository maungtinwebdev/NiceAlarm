import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/config';

/**
 * Load saved favorite places.
 * @returns {Array} Array of favorite objects { id, name, latitude, longitude }
 */
export async function loadFavorites() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save a new favorite place.
 * @param {Object} place - { name, latitude, longitude }
 * @returns {Array} Updated favorites list
 */
export async function addFavorite(place) {
  const favorites = await loadFavorites();
  const newFavorite = {
    id: Date.now().toString(),
    name: place.name || `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`,
    latitude: place.latitude,
    longitude: place.longitude,
    createdAt: new Date().toISOString(),
  };
  const updated = [newFavorite, ...favorites];
  await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
  return updated;
}

/**
 * Remove a favorite by ID.
 * @param {string} id
 * @returns {Array} Updated favorites list
 */
export async function removeFavorite(id) {
  const favorites = await loadFavorites();
  const updated = favorites.filter((f) => f.id !== id);
  await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
  return updated;
}

/**
 * Save the last selected alert distance.
 * @param {number} distance - Distance in meters
 */
export async function saveLastDistance(distance) {
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_DISTANCE, distance.toString());
}

/**
 * Load the last selected alert distance.
 * @returns {number|null}
 */
export async function loadLastDistance() {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.LAST_DISTANCE);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Save app settings.
 * @param {Object} settings
 */
export async function saveSettings(settings) {
  await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

/**
 * Load app settings.
 * @returns {Object}
 */
export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw
      ? JSON.parse(raw)
      : { soundEnabled: true, vibrationEnabled: true, autoStop: false };
  } catch {
    return { soundEnabled: true, vibrationEnabled: true, autoStop: false };
  }
}
