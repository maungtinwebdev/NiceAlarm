import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT, UrlTile, Polyline } from 'react-native-maps';
import { useTheme } from '../context/ThemeContext';
import { MAP_STYLE_DARK, DEFAULT_REGION } from '../constants/config';

const MapViewComponent = forwardRef(
  (
    {
      userLocation,
      destination,
      alertDistance,
      onMapPress,
      isTracking,
      busStops = [],
      busRoutes = [],
      shops = [],
      mapStyle = 'hybrid',
      onRegionChange,
      onBusStopPress,
    },
    ref,
  ) => {
    const { isDark, colors } = useTheme();
    const mapRef = useRef(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region, duration = 800) => {
        mapRef.current?.animateToRegion(region, duration);
      },
      fitToCoordinates: (coords, options) => {
        mapRef.current?.fitToCoordinates(coords, options);
      },
    }));

    // Auto-center when tracking starts
    useEffect(() => {
      if (isTracking && userLocation && destination) {
        mapRef.current?.fitToCoordinates(
          [
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude: destination.latitude, longitude: destination.longitude },
          ],
          {
            edgePadding: { top: 120, right: 60, bottom: 300, left: 60 },
            animated: true,
          },
        );
      }
    }, [isTracking]);

    return (
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          mapType="none"
          initialRegion={
            userLocation
              ? {
                  ...userLocation,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : DEFAULT_REGION
          }
          customMapStyle={isDark ? MAP_STYLE_DARK : []}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          rotateEnabled={false}
          onPress={(e) => {
            if (e.nativeEvent.coordinate) {
              onMapPress(e.nativeEvent.coordinate);
            }
          }}
          onRegionChangeComplete={onRegionChange}
          mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          {/* Street Map Style */}
          {mapStyle === 'street' && (
            <UrlTile 
              urlTemplate={
                isDark 
                  ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  : "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              }
              maximumZ={19}
              flipY={false}
              shouldReplaceMapContent={true}
            />
          )}

          {/* Smart Hybrid Style */}
          {mapStyle === 'hybrid' && (
            <>
              <UrlTile 
                urlTemplate="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maximumZ={19}
                shouldReplaceMapContent={true}
              />
              <UrlTile 
                urlTemplate={
                  isDark 
                    ? "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
                    : "https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
                }
                maximumZ={19}
                shouldReplaceMapContent={false}
              />
            </>
          )}

          {/* Bus Routes (Polylines) - Glow effect for Smart Look */}
          {!isTracking && busRoutes.map((route) => (
            <React.Fragment key={`bus-route-group-${route.id}`}>
              <Polyline
                coordinates={route.path}
                strokeColor={route.color + '33'} // Outer glow
                strokeWidth={8}
              />
              <Polyline
                coordinates={route.path}
                strokeColor={route.color} // Core line
                strokeWidth={3}
              />
            </React.Fragment>
          ))}

          {/* Bus Stops Markers */}
          {!isTracking && busStops.map((stop) => (
            <Marker
              key={`bus-stop-${stop.id}`}
              coordinate={{
                latitude: stop.latitude,
                longitude: stop.longitude,
              }}
              onPress={() => onBusStopPress?.(stop)}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.busStopMarker, { backgroundColor: colors.surface }]}>
                  <Text style={styles.busStopEmoji}>🚏</Text>
                </View>
                <View style={[styles.labelContainer, { backgroundColor: colors.surface + 'CC' }]}>
                  <Text style={[styles.labelText, { color: colors.text }]} numberOfLines={1}>
                    {stop.name}
                  </Text>
                </View>
              </View>
            </Marker>
          ))}

          {/* Shops Markers */}
          {!isTracking && shops.map((shop) => (
            <Marker
              key={`shop-${shop.id}`}
              coordinate={{
                latitude: shop.latitude,
                longitude: shop.longitude,
              }}
              onPress={() => onBusStopPress?.(shop)}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.shopMarker, { backgroundColor: colors.surface }]}>
                  <Text style={styles.shopEmoji}>🛒</Text>
                </View>
                <View style={[styles.labelContainer, { backgroundColor: colors.surface + 'CC' }]}>
                  <Text style={[styles.labelText, { color: colors.text }]} numberOfLines={1}>
                    {shop.name}
                  </Text>
                </View>
              </View>
            </Marker>
          ))}

          {/* Destination Marker */}
          {destination && (
            <>
              <Marker
                coordinate={{
                  latitude: destination.latitude,
                  longitude: destination.longitude,
                }}
                title={destination.name || 'Destination'}
                pinColor={colors.primary}
              />
              {/* Alert Radius Circle */}
              {alertDistance > 0 && (
                <Circle
                  center={{
                    latitude: destination.latitude,
                    longitude: destination.longitude,
                  }}
                  radius={alertDistance}
                  fillColor={colors.radiusCircleFill}
                  strokeColor={colors.radiusCircleStroke}
                  strokeWidth={2}
                />
              )}
            </>
          )}
        </MapView>
      </View>
    );
  },
);

MapViewComponent.displayName = 'MapViewComponent';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: 'center',
    width: 120,
  },
  labelContainer: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  busStopMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#4F46E5', // or colors.primary
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  busStopEmoji: {
    fontSize: 16,
  },
  shopMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981', // green for shops
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  shopEmoji: {
    fontSize: 14,
  },
});

export default MapViewComponent;
