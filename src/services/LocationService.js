import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK_NAME } from '../constants/config';

/**
 * Request foreground location permissions.
 * @returns {boolean} Whether permission was granted
 */
export async function requestForegroundPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Request background location permissions.
 * @returns {boolean} Whether permission was granted
 */
export async function requestBackgroundPermission() {
  const { status } = await Location.requestBackgroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Get the current position once.
 * @returns {Object} { latitude, longitude, accuracy }
 */
export async function getCurrentPosition() {
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy,
  };
}

/**
 * Start watching foreground location updates.
 * @param {Function} callback - Called with { latitude, longitude, accuracy }
 * @returns {Object} Subscription that can be removed
 */
export async function watchForegroundLocation(callback) {
  return await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 3000,
      distanceInterval: 5,
    },
    (loc) => {
      callback({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        speed: loc.coords.speed,
        heading: loc.coords.heading,
        timestamp: loc.timestamp,
      });
    },
  );
}

/**
 * Start background location tracking.
 * @param {Function} taskCallback - The task body registered separately
 */
export async function startBackgroundLocation() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 10,
    deferredUpdatesInterval: 1000,
    deferredUpdatesDistance: 5,
    showsBackgroundLocationIndicator: true,
    pausesLocationUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Distance Alarm Running',
      notificationBody: 'Distance Alarm is active in your pocket/bag.',
      notificationColor: '#4F46E5',
    },
  });
}

/**
 * Stop background location tracking.
 */
export async function stopBackgroundLocation() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

/**
 * Check if background location task is running.
 * @returns {boolean}
 */
export async function isBackgroundLocationRunning() {
  return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
}
