import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
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
          mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
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
});

export default MapViewComponent;
