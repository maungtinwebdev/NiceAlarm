import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
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
      mapStyle = 'hybrid',
      onRegionChange,
      onBusStopPress,
    },
    ref,
  ) => {
    const { isDark, colors } = useTheme();
    const webViewRef = useRef(null);
    const [isWebViewLoaded, setIsWebViewLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const initLat = userLocation?.latitude || DEFAULT_REGION.latitude;
    const initLng = userLocation?.longitude || DEFAULT_REGION.longitude;

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

    // Build HTML with multiple CDN fallbacks for Leaflet
    const HTML_CONTENT = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;" />
        <style>
          * { margin: 0; padding: 0; }
          html, body, #map { height: 100%; width: 100%; background: #1a1a2e; }
          #loading { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; background: #1a1a2e; color: #94A3B8; font-family: sans-serif; font-size: 14px; z-index: 9999; }
          #loading.hidden { display: none; }
          .custom-marker { text-align: center; font-size: 16px; background: #1E293B; border-radius: 50%; width: 30px; height: 30px; line-height: 28px; box-shadow: 0 0 5px rgba(0,0,0,0.3); border: 1.5px solid; }
          .user-marker { background: rgba(59, 130, 246, 0.3); border: 1px solid rgba(59, 130, 246, 0.5); width: 24px; height: 24px; border-radius: 50%; position: relative; }
          .user-marker-inner { background: #3B82F6; border: 2px solid #FFFFFF; width: 12px; height: 12px; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 2px rgba(0,0,0,0.5); }
          .label-tooltip { background: rgba(30,41,59,0.8) !important; color: #F1F5F9 !important; border: none !important; font-size: 10px; font-weight: 700; border-radius: 8px !important; padding: 2px 6px !important; box-shadow: none !important; }
          .leaflet-tooltip-bottom:before { display: none; }
        </style>
      </head>
      <body>
        <div id="loading">Loading map...</div>
        <div id="map"></div>
        <script>
          // Multiple CDN sources for Leaflet - try each one
          var cdnSources = [
            {
              css: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
              js: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
            },
            {
              css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
              js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
            },
            {
              css: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
              js: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js'
            }
          ];

          var currentCDN = 0;

          function loadCSS(url) {
            return new Promise(function(resolve, reject) {
              var link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = url;
              link.onload = resolve;
              link.onerror = reject;
              document.head.appendChild(link);
            });
          }

          function loadJS(url) {
            return new Promise(function(resolve, reject) {
              var script = document.createElement('script');
              script.src = url;
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }

          function tryLoadLeaflet() {
            if (currentCDN >= cdnSources.length) {
              document.getElementById('loading').textContent = 'Map failed to load. Check internet.';
              window.ReactNativeWebView.postMessage('MAP_LOAD_FAILED');
              return;
            }

            var cdn = cdnSources[currentCDN];
            document.getElementById('loading').textContent = 'Loading map...';

            loadCSS(cdn.css)
              .then(function() { return loadJS(cdn.js); })
              .then(function() {
                initMap();
              })
              .catch(function() {
                currentCDN++;
                tryLoadLeaflet();
              });
          }

          function initMap() {
            document.getElementById('loading').className = 'hidden';

            var map = L.map('map', { zoomControl: false, attributionControl: false })
              .setView([${initLat}, ${initLng}], 14);

            // Load initial tiles immediately
            L.tileLayer('${mapStyle === 'street' ? getStreetTileUrl(isDark) : getHybridBaseUrl()}', { maxZoom: 19 }).addTo(map);
            ${mapStyle === 'hybrid' ? `L.tileLayer('${getHybridLabelUrl(isDark)}', { maxZoom: 19 }).addTo(map);` : ''}

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

            var busIcon = createIcon('\\u{1F68F}', '#4F46E5');
            var destIcon = createIcon('\\u{1F4CD}', '#818CF8');
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

              markers.forEach(function(m) { map.removeLayer(m); });
              shapes.forEach(function(s) { map.removeLayer(s); });
              markers = [];
              shapes = [];

              // Bus stops rendering removed

              if (data.userLocation) {
                markers.push(L.marker([data.userLocation.latitude, data.userLocation.longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map));
              }

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
          }

          // Start loading Leaflet with fallbacks
          tryLoadLeaflet();
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
      const data = event.nativeEvent.data;
      if (data === 'MAP_LOADED') {
        setIsWebViewLoaded(true);
        setLoadError(false);
        return;
      }
      if (data === 'MAP_LOAD_FAILED') {
        setLoadError(true);
        return;
      }
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'mapPress' && onMapPress) {
          onMapPress(msg.coordinate);
        } else if (msg.type === 'regionChange' && onRegionChange) {
          onRegionChange(msg.region);
        } else if (msg.type === 'busStopPress' && onBusStopPress) {
          onBusStopPress(msg.item);
        }
      } catch (e) {
        // ignore
      }
    };

    const handleRetry = () => {
      setLoadError(false);
      setIsWebViewLoaded(false);
      setRetryCount(prev => prev + 1);
    };

    return (
      <View style={styles.container}>
        <WebView
          key={`map-webview-${retryCount}`}
          ref={webViewRef}
          source={{ html: HTML_CONTENT }}
          originWhitelist={['*']}
          style={styles.map}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          bounces={false}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#818CF8" />
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
          onError={() => setLoadError(true)}
          onHttpError={() => setLoadError(true)}
        />
        {loadError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>Map failed to load</Text>
            <Text style={styles.errorSubtext}>Check your internet connection</Text>
            <Text style={styles.retryButton} onPress={handleRetry}>
              ↻ Tap to Retry
            </Text>
          </View>
        )}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '600',
  },
  errorSubtext: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
  },
  retryButton: {
    color: '#818CF8',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    padding: 12,
  },
});

export default MapViewComponent;
