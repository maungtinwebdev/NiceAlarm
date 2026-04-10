import './consolePatch';
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import * as TaskManager from 'expo-task-manager';
import { LOCATION_TASK_NAME } from './src/constants/config';

// Background task definition must be in global scope
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.warn('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const loc = locations[0];
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

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
