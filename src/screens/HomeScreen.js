import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  StatusBar,
  Platform,
} from 'react-native';
import * as TaskManager from 'expo-task-manager';
import { useTheme } from '../context/ThemeContext';
import { LOCATION_TASK_NAME, ALERT_DISTANCES } from '../constants/config';
import { getDistanceMeters } from '../utils/distance';

// Services
import {
  requestForegroundPermission,
  requestBackgroundPermission,
  getCurrentPosition,
  watchForegroundLocation,
  startBackgroundLocation,
  stopBackgroundLocation,
} from '../services/LocationService';
import { playAlarm, stopAlarm, triggerVibration } from '../services/SoundService';
import {
  configureNotifications,
  requestNotificationPermission,
  sendLocalNotification,
  cancelAllNotifications,
} from '../services/NotificationService';
import {
  loadFavorites,
  addFavorite,
  removeFavorite,
  saveLastDistance,
  loadLastDistance,
  loadSettings,
  saveSettings,
} from '../services/StorageService';

// Components
import MapViewComponent from '../components/MapViewComponent';
import SearchBar from '../components/SearchBar';
import DistanceSelector from '../components/DistanceSelector';
import AlarmControls from '../components/AlarmControls';
import FavoritesSheet from '../components/FavoritesSheet';
import SettingsModal from '../components/SettingsModal';

// Background task definition
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.warn('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const loc = locations[0];
      // Background distance check happens via the event emitter pattern
      // The component subscribes to this via a global ref
      if (global._distanceAlarmCallback) {
        global._distanceAlarmCallback({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        });
      }
    }
  }
});

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const mapRef = useRef(null);
  const locationSubRef = useRef(null);
  const isAlarmTriggeredRef = useRef(false);

  // State
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [alertDistance, setAlertDistance] = useState(ALERT_DISTANCES[3].value); // 500m default
  const [currentDistance, setCurrentDistance] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    soundEnabled: true,
    vibrationEnabled: true,
    autoStop: false,
  });

  // Initialize
  useEffect(() => {
    initializeApp();
    return () => {
      cleanupTracking();
    };
  }, []);

  const initializeApp = async () => {
    configureNotifications();
    await requestNotificationPermission();

    const hasForeground = await requestForegroundPermission();
    if (!hasForeground) {
      Alert.alert(
        'Location Required',
        'Distance Alarm needs location permission to work. Please enable it in Settings.',
      );
      return;
    }

    // Get initial position
    try {
      const pos = await getCurrentPosition();
      setUserLocation(pos);
      mapRef.current?.animateToRegion(
        {
          ...pos,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600,
      );
    } catch (error) {
      console.warn('Failed to get initial position:', error);
    }

    // Load saved data
    const savedFavorites = await loadFavorites();
    setFavorites(savedFavorites);

    const savedDistance = await loadLastDistance();
    if (savedDistance) setAlertDistance(savedDistance);

    const savedSettings = await loadSettings();
    setSettings(savedSettings);
  };

  // Handle map tap to set destination
  const handleMapPress = useCallback(
    (coordinate) => {
      if (isTracking) return;
      setDestination({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        name: `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`,
      });

      mapRef.current?.animateToRegion(
        {
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        600,
      );
    },
    [isTracking],
  );

  // Handle place selected from search
  const handlePlaceSelected = useCallback(
    (place) => {
      if (isTracking) return;
      setDestination({
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.shortName || place.name,
      });

      mapRef.current?.animateToRegion(
        {
          latitude: place.latitude,
          longitude: place.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        800,
      );
    },
    [isTracking],
  );

  // Handle distance change
  const handleDistanceChange = useCallback((value) => {
    setAlertDistance(value);
    saveLastDistance(value);
  }, []);

  // Start tracking
  const handleStartTracking = async () => {
    if (!destination) {
      Alert.alert('No Destination', 'Please select a destination on the map or search for a place.');
      return;
    }

    isAlarmTriggeredRef.current = false;
    setIsTracking(true);
    setIsAlarmActive(false);

    // Request background permission
    await requestBackgroundPermission();

    // Set up background callback
    global._distanceAlarmCallback = (loc) => {
      handleLocationUpdate(loc);
    };

    // Start foreground watcher
    try {
      const sub = await watchForegroundLocation((loc) => {
        handleLocationUpdate(loc);
      });
      locationSubRef.current = sub;
    } catch (error) {
      console.warn('Failed to start foreground watcher:', error);
    }

    // Start background location
    try {
      await startBackgroundLocation();
    } catch (error) {
      console.warn('Failed to start background location:', error);
    }

    sendLocalNotification(
      '📍 Tracking Started',
      `Heading to ${destination.name || 'destination'} — Alert at ${formatDist(alertDistance)}`,
    );
  };

  // Handle location updates
  const handleLocationUpdate = useCallback(
    (loc) => {
      setUserLocation(loc);

      if (!destination || isAlarmTriggeredRef.current) return;

      const dist = getDistanceMeters(
        loc.latitude,
        loc.longitude,
        destination.latitude,
        destination.longitude,
      );
      setCurrentDistance(dist);

      // Check if within alert distance
      if (dist <= alertDistance) {
        triggerAlarm(dist);
      }
    },
    [destination, alertDistance],
  );

  // Trigger alarm
  const triggerAlarm = async (dist) => {
    if (isAlarmTriggeredRef.current) return;
    isAlarmTriggeredRef.current = true;
    setIsAlarmActive(true);

    // Sound
    if (settings.soundEnabled) {
      await playAlarm();
    }

    // Vibration
    if (settings.vibrationEnabled) {
      triggerVibration();
    }

    // Notification
    sendLocalNotification(
      '🔔 You\'ve Arrived!',
      `You are ${Math.round(dist)}m from ${destination?.name || 'your destination'}`,
      { type: 'alarm' },
    );

    // Auto-stop after 30 seconds
    if (settings.autoStop) {
      setTimeout(() => {
        handleStopAlarm();
      }, 30000);
    }
  };

  // Stop alarm (sound only)
  const handleStopAlarm = async () => {
    await stopAlarm();
    setIsAlarmActive(false);
    await handleStopTracking();
  };

  // Stop tracking
  const handleStopTracking = async () => {
    await cleanupTracking();
    setIsTracking(false);
    setIsAlarmActive(false);
    setCurrentDistance(null);
    isAlarmTriggeredRef.current = false;
    await cancelAllNotifications();
  };

  // Cleanup
  const cleanupTracking = async () => {
    if (locationSubRef.current) {
      locationSubRef.current.remove();
      locationSubRef.current = null;
    }
    global._distanceAlarmCallback = null;
    try {
      await stopBackgroundLocation();
    } catch (e) {
      // ignore
    }
    await stopAlarm();
  };

  // Favorites
  const handleAddFavorite = async () => {
    if (!destination) return;
    const updated = await addFavorite(destination);
    setFavorites(updated);
    Alert.alert('⭐ Saved!', `"${destination.name}" added to favorites.`);
  };

  const handleRemoveFavorite = async (id) => {
    const updated = await removeFavorite(id);
    setFavorites(updated);
  };

  const handleSelectFavorite = (fav) => {
    setDestination({
      latitude: fav.latitude,
      longitude: fav.longitude,
      name: fav.name,
    });
    mapRef.current?.animateToRegion(
      {
        latitude: fav.latitude,
        longitude: fav.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      800,
    );
  };

  // Settings
  const handleSettingsChange = (newSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const formatDist = (m) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Map */}
      <MapViewComponent
        ref={mapRef}
        userLocation={userLocation}
        destination={destination}
        alertDistance={alertDistance}
        onMapPress={handleMapPress}
        isTracking={isTracking}
      />

      {/* Search Bar */}
      <SearchBar
        onPlaceSelected={handlePlaceSelected}
        isTracking={isTracking}
      />

      {/* Top Right Buttons */}
      <View style={styles.topRightButtons}>
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              shadowColor: colors.shadow,
            },
          ]}
          onPress={() => setShowSettings(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.iconButtonText}>⚙️</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              shadowColor: colors.shadow,
            },
          ]}
          onPress={() => {
            if (userLocation) {
              mapRef.current?.animateToRegion(
                {
                  ...userLocation,
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                },
                600,
              );
            }
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.iconButtonText}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Panel */}
      <View
        style={[
          styles.bottomPanel,
          {
            backgroundColor: colors.mapOverlay,
            borderColor: colors.borderLight,
            shadowColor: colors.shadowDark,
          },
        ]}
      >
        {/* Destination Info */}
        {destination && !isTracking && (
          <View style={styles.destinationInfo}>
            <View style={styles.destinationHeader}>
              <View style={styles.destinationTextContainer}>
                <Text style={[styles.destinationLabel, { color: colors.textTertiary }]}>
                  Destination
                </Text>
                <Text
                  style={[styles.destinationName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {destination.name}
                </Text>
              </View>
              <View style={styles.destinationActions}>
                <TouchableOpacity
                  style={[
                    styles.miniButton,
                    { backgroundColor: colors.warning + '20', borderColor: colors.warning },
                  ]}
                  onPress={handleAddFavorite}
                  activeOpacity={0.7}
                >
                  <Text style={styles.miniButtonText}>⭐</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.miniButton,
                    { backgroundColor: colors.accent + '20', borderColor: colors.accent },
                  ]}
                  onPress={() => setShowFavorites(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.miniButtonText}>📂</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Distance Selector */}
        {!isTracking && (
          <DistanceSelector
            selectedDistance={alertDistance}
            onDistanceChange={handleDistanceChange}
            isTracking={isTracking}
          />
        )}

        {/* Alarm Controls */}
        <AlarmControls
          isTracking={isTracking}
          destination={destination}
          alertDistance={alertDistance}
          currentDistance={currentDistance}
          userLocation={userLocation}
          isAlarmActive={isAlarmActive}
          onStart={handleStartTracking}
          onStop={handleStopTracking}
          onStopAlarm={handleStopAlarm}
        />

        {/* Quick Access Favorites Button (when no destination) */}
        {!destination && !isTracking && (
          <TouchableOpacity
            style={[
              styles.favoritesBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
            onPress={() => setShowFavorites(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.favoritesBtnIcon}>⭐</Text>
            <Text style={[styles.favoritesBtnText, { color: colors.text }]}>
              Saved Places ({favorites.length})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Favorites Sheet */}
      <FavoritesSheet
        favorites={favorites}
        onSelect={handleSelectFavorite}
        onRemove={handleRemoveFavorite}
        isTracking={isTracking}
        visible={showFavorites}
        onClose={() => setShowFavorites(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topRightButtons: {
    position: 'absolute',
    top: 68,
    right: 16,
    gap: 10,
    zIndex: 50,
  },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  iconButtonText: {
    fontSize: 20,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 24,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 24,
  },
  destinationInfo: {
    marginBottom: 16,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destinationTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  destinationLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  destinationName: {
    fontSize: 17,
    fontWeight: '700',
  },
  destinationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  miniButtonText: {
    fontSize: 18,
  },
  favoritesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  favoritesBtnIcon: {
    fontSize: 18,
  },
  favoritesBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
