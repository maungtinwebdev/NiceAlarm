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

    const HTML_CONTENT = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { padding: 0; margin: 0; background-color: ${colors.background}; }
          html, body, #map { height: 100%; width: 100%; }
          .custom-marker { text-align: center; font-size: 16px; background: ${colors.surface}; border-radius: 50%; width: 30px; height: 30px; line-height: 28px; box-shadow: 0 0 5px rgba(0,0,0,0.3); border: 1.5px solid; }
          .user-marker { background: rgba(59, 130, 246, 0.3); border: 1px solid rgba(59, 130, 246, 0.5); width: 24px; height: 24px; border-radius: 50%; position: relative; }
          .user-marker-inner { background: #3B82F6; border: 2px solid #FFFFFF; width: 12px; height: 12px; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 2px rgba(0,0,0,0.5); }
          .label-tooltip { background: ${colors.surface + 'CC'} !important; color: ${colors.text} !important; border: 0.5px solid rgba(0,0,0,0.1) !important; font-size: 10px; font-weight: 700; border-radius: 8px !important; padding: 2px 6px !important; box-shadow: none !important; }
          .leaflet-tooltip-bottom:before { display: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${DEFAULT_REGION.latitude}, ${DEFAULT_REGION.longitude}], 12);
          
          let currentTileLayer = null;
          let markers = [];
          let shapes = [];
          
          const createIcon = (emoji, color) => L.divIcon({
            className: 'custom-div-icon',
            html: "<div class='custom-marker' style='border-color: " + color + "'>" + emoji + "</div>",
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          
          const busIcon = createIcon('🚏', '#4F46E5');
          const shopIcon = createIcon('🛒', '#10B981');
          const destIcon = createIcon('📍', '${colors.primary}');
          const userIcon = L.divIcon({
            className: 'user-div-icon',
            html: "<div class='user-marker'><div class='user-marker-inner'></div></div>",
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          map.on('click', (e) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapPress', coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng } }));
          });
          
          map.on('moveend', () => {
            const center = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'regionChange', 
              region: { latitude: center.lat, longitude: center.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 } 
            }));
          });

          window.updateMap = function(data) {
            if (data.mapStyle && data.mapStyle !== window._currentMapStyle) {
              window._currentMapStyle = data.mapStyle;
              if (currentTileLayer) map.removeLayer(currentTileLayer);
              if (data.mapStyle === 'street') {
                currentTileLayer = L.tileLayer('https://a.basemaps.cartocdn.com/' + (data.isDark ? 'dark_all' : 'rastertiles/voyager') + '/{z}/{x}/{y}{r}.png', { maxZoom: 19 });
              } else {
                currentTileLayer = L.layerGroup([
                  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
                  L.tileLayer('https://a.basemaps.cartocdn.com/' + (data.isDark ? 'dark_only_labels' : 'light_only_labels') + '/{z}/{x}/{y}{r}.png', { maxZoom: 19 })
                ]);
              }
              currentTileLayer.addTo(map);
            }
            
            markers.forEach(m => map.removeLayer(m));
            shapes.forEach(s => map.removeLayer(s));
            markers = [];
            shapes = [];
            
            if (!data.isTracking) {
              (data.busStops || []).forEach(stop => {
                const m = L.marker([stop.latitude, stop.longitude], { icon: busIcon }).addTo(map);
                m.bindTooltip(stop.name || '', { permanent: true, direction: 'bottom', className: 'label-tooltip', offset: [0, 8] });
                m.on('click', () => {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'busStopPress', item: stop }));
                });
                markers.push(m);
              });
              
              (data.shops || []).forEach(shop => {
                const m = L.marker([shop.latitude, shop.longitude], { icon: shopIcon }).addTo(map);
                m.bindTooltip(shop.name || '', { permanent: true, direction: 'bottom', className: 'label-tooltip', offset: [0, 8] });
                m.on('click', () => {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'busStopPress', item: shop }));
                });
                markers.push(m);
              });

              (data.busRoutes || []).forEach(route => {
                const latlngs = route.path.map(p => [p.latitude, p.longitude]);
                shapes.push(L.polyline(latlngs, { color: route.color + '33', weight: 8 }).addTo(map));
                shapes.push(L.polyline(latlngs, { color: route.color, weight: 3 }).addTo(map));
              });
            }
            
            if (data.userLocation) {
              markers.push(L.marker([data.userLocation.latitude, data.userLocation.longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map));
            }
            
            if (data.destination) {
              markers.push(L.marker([data.destination.latitude, data.destination.longitude], { icon: destIcon }).addTo(map));
              if (data.alertDistance > 0) {
                shapes.push(L.circle([data.destination.latitude, data.destination.longitude], {
                  radius: data.alertDistance,
                  color: data.colors.radiusCircleStroke,
                  fillColor: data.colors.radiusCircleFill,
                  fillOpacity: 1, // Let react-native hex format handling be ignored, opacity applied by leaflet
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
            const bounds = L.latLngBounds(coords.map(c => [c.latitude, c.longitude]));
            map.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 0.8 });
          };

          window.postMessage('MAP_LOADED');
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

    // Handle auto-centering
    useEffect(() => {
      if (isTracking && userLocation && destination && isWebViewLoaded) {
        webViewRef.current?.injectJavaScript(`
          window.fitToCoordinates([
            { latitude: ${userLocation.latitude}, longitude: ${userLocation.longitude} },
            { latitude: ${destination.latitude}, longitude: ${destination.longitude} }
          ]);true;
        `);
      }
    }, [isTracking, isWebViewLoaded, userLocation?.latitude, userLocation?.longitude]);

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
        // parsing error
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
          bounces={false}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
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
  },
});

export default MapViewComponent;
