export const ALERT_DISTANCES = [
  { label: '100m', value: 100 },
  { label: '200m', value: 200 },
  { label: '300m', value: 300 },
  { label: '500m', value: 500 },
  { label: '750m', value: 750 },
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
  { label: '3 km', value: 3000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
];

export const OSM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

export const LOCATION_TASK_NAME = 'DISTANCE_ALARM_BACKGROUND_LOCATION';

export const DEFAULT_REGION = {
  latitude: 16.8661,
  longitude: 96.1951,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const STORAGE_KEYS = {
  FAVORITES: '@distance_alarm_favorites',
  SETTINGS: '@distance_alarm_settings',
  DARK_MODE: '@distance_alarm_dark_mode',
  LAST_DISTANCE: '@distance_alarm_last_distance',
};

export const MAP_STYLE_DARK = [
  { elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1E293B' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0F172A' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1E293B' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748B' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#334155' }] },
];
