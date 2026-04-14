import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { DEFAULT_REGION } from '../constants/config';

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
    const webViewRef = useRef(null);
    const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);

    const initLat = userLocation?.latitude || DEFAULT_REGION.latitude;
    const initLng = userLocation?.longitude || DEFAULT_REGION.longitude;

    // Determine initial tile URL based on current style
    const getStreetTileUrl = (dark) =>
      dark
        ? 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const getHybridBaseUrl = () =>
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const getHybridLabelUrl = (dark) =>
      dark
        ? 'https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png'
        : 'https://a.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png';

    const HTML_CONTENT = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { margin: 0; padding: 0; }
          html, body, #map { height: 100%; width: 100%; background: #1a1a2e; }
          .custom-marker { text-align: center; font-size: 16px; background: #1E293B; border-radius: 50%; width: 30px; height: 30px; line-height: 28px; box-shadow: 0 0 5px rgba(0,0,0,0.3); border: 1.5px solid; }
          .user-marker { background: rgba(59, 130, 246, 0.3); border: 1px solid rgba(59, 130, 246, 0.5); width: 24px; height: 24px; border-radius: 50%; position: relative; }
          .user-marker-inner { background: #3B82F6; border: 2px solid #FFFFFF; width: 12px; height: 12px; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 2px rgba(0,0,0,0.5); }
          .label-tooltip { background: rgba(30,41,59,0.8) !important; color: #F1F5F9 !important; border: none !important; font-size: 10px; font-weight: 700; border-radius: 8px !important; padding: 2px 6px !important; box-shadow: none !important; }
          .leaflet-tooltip-bottom:before { display: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize map
          var map = L.map('map', { zoomControl: false, attributionControl: false })
            .setView([${initLat}, ${initLng}], 14);

          // Load initial tiles IMMEDIATELY so map is never blank
          var baseLayer = L.tileLayer('${mapStyle === 'street' ? getStreetTileUrl(isDark) : getHybridBaseUrl()}', { maxZoom: 19 }).addTo(map);
          ${mapStyle === 'hybrid' ? `var labelLayer = L.tileLayer('${getHybridLabelUrl(isDark)}', { maxZoom: 19 }).addTo(map);` : ''}

          var currentStyle = '${mapStyle}';
          var markers = [];
          var shapes = [];

          var createIcon = function(emoji, color) {
            return L.divIcon({
              className: 'custom-div-icon',
              html: "<div class='custom-marker' style='border-color: " + color + "'>" + emoji + "</div>",
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            });
          };

          var busIcon = createIcon('🚏', '#4F46E5');
          var shopIcon = createIcon('🛒', '#10B981');
          var destIcon = createIcon('📍', '#818CF8');
          var userIcon = L.divIcon({
            className: 'user-div-icon',
            html: "<div class='user-marker'><div class='user-marker-inner'></div></div>",
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapPress',
              coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng }
            }));
          });

          map.on('moveend', function() {
            var c = map.getCenter();
            var b = map.getBounds();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'regionChange',
              region: {
                latitude: c.lat,
                longitude: c.lng,
                latitudeDelta: b.getNorth() - b.getSouth(),
                longitudeDelta: b.getEast() - b.getWest()
              }
            }));
          });

          window.updateMap = function(data) {
            // Update tile style if changed
            if (data.mapStyle && data.mapStyle !== currentStyle) {
              currentStyle = data.mapStyle;
              map.eachLayer(function(layer) {
                if (layer instanceof L.TileLayer) map.removeLayer(layer);
              });
              if (data.mapStyle === 'street') {
                L.tileLayer('https://a.basemaps.cartocdn.com/' + (data.isDark ? 'dark_all' : 'rastertiles/voyager') + '/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
              } else {
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map);
                L.tileLayer('https://a.basemaps.cartocdn.com/' + (data.isDark ? 'dark_only_labels' : 'light_only_labels') + '/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
              }
            }

            // Clear old markers/shapes
            markers.forEach(function(m) { map.removeLayer(m); });
            shapes.forEach(function(s) { map.removeLayer(s); });
            markers = [];
            shapes = [];

            // POI markers (only when not tracking)
            if (!data.isTracking) {
              (data.busStops || []).forEach(function(stop) {
                var m = L.marker([stop.latitude, stop.longitude], { icon: busIcon }).addTo(map);
                if (stop.name) m.bindTooltip(stop.name, { permanent: true, direction: 'bottom', className: 'label-tooltip', offset: [0, 8] });
                m.on('click', function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'busStopPress', item: stop }));
                });
                markers.push(m);
              });

              (data.shops || []).forEach(function(shop) {
                var m = L.marker([shop.latitude, shop.longitude], { icon: shopIcon }).addTo(map);
                m.on('click', function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'busStopPress', item: shop }));
                });
                markers.push(m);
              });

              // Bus routes removed for cleaner look
            }

            // User location
            if (data.userLocation) {
              markers.push(L.marker([data.userLocation.latitude, data.userLocation.longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map));
            }

            // Destination
            if (data.destination) {
              markers.push(L.marker([data.destination.latitude, data.destination.longitude], { icon: destIcon }).addTo(map));
              if (data.alertDistance > 0 && data.colors) {
                shapes.push(L.circle([data.destination.latitude, data.destination.longitude], {
                  radius: data.alertDistance,
                  color: data.colors.radiusCircleStroke || '#818CF8',
                  fillColor: data.colors.radiusCircleFill || 'rgba(129,140,248,0.15)',
                  fillOpacity: 0.3,
                  weight: 2
                }).addTo(map));
              }
            }
          };

          window.animateToRegion = function(region) {
            map.flyTo([region.latitude, region.longitude], 15, { animate: true, duration: 0.8 });
          };

          window.fitToCoordinates = function(coords) {
            if (!coords || coords.length === 0) return;
            var bounds = L.latLngBounds(coords.map(function(c) { return [c.latitude, c.longitude]; }));
            map.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 0.8 });
          };

          // Signal to React Native that map is ready
          window.ReactNativeWebView.postMessage('MAP_LOADED');
        </script>
      </body>
      </html>
    `;

    useImperativeHandle(ref, () => ({
      animateToRegion: (region, duration = 800) => {
        if (!isWebViewLoaded) return;
        webViewRef.current?.injectJavaScript(`window.animateToRegion(${JSON.stringify(region)});true;`);
      },
      fitToCoordinates: (coords, options) => {
        if (!isWebViewLoaded) return;
        webViewRef.current?.injectJavaScript(`window.fitToCoordinates(${JSON.stringify(coords)});true;`);
      },
    }));

    // Re-sync map state on data change
    useEffect(() => {
      if (!isWebViewLoaded) return;
      const data = {
        userLocation,
        destination,
        alertDistance,
        isTracking,
        busStops,
        busRoutes,
        shops,
        mapStyle,
        isDark,
        colors,
      };
      webViewRef.current?.injectJavaScript(`window.updateMap(${JSON.stringify(data)});true;`);
    }, [
      isWebViewLoaded,
      userLocation,
      destination,
      alertDistance,
      isTracking,
      busStops,
      busRoutes,
      shops,
      mapStyle,
      isDark,
      colors,
    ]);

    // Handle auto-centering when tracking
    useEffect(() => {
      if (isTracking && userLocation && destination && isWebViewLoaded) {
        webViewRef.current?.injectJavaScript(`
          window.fitToCoordinates([
            { latitude: ${userLocation.latitude}, longitude: ${userLocation.longitude} },
            { latitude: ${destination.latitude}, longitude: ${destination.longitude} }
          ]);true;
        `);
      }
    }, [isTracking, isWebViewLoaded]);

    const handleMessage = (event) => {
      if (event.nativeEvent.data === 'MAP_LOADED') {
        setIsWebViewLoaded(true);
        return;
      }
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'mapPress' && onMapPress) {
          onMapPress(msg.coordinate);
        } else if (msg.type === 'regionChange' && onRegionChange) {
          onRegionChange(msg.region);
        } else if (msg.type === 'busStopPress' && onBusStopPress) {
          onBusStopPress(msg.item);
        }
      } catch (e) {
        // ignore parse errors
      }
    };

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ html: HTML_CONTENT }}
          originWhitelist={['*']}
          style={styles.map}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          allowFileAccess={true}
          bounces={false}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onError={(syntheticEvent) => {
            console.warn('WebView error:', syntheticEvent.nativeEvent);
          }}
        />
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
    backgroundColor: '#1a1a2e',
  },
});

export default MapViewComponent;
