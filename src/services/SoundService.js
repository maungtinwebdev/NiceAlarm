import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';

let VolumeManager = null;
try {
  VolumeManager = require('react-native-volume-manager').VolumeManager;
} catch (e) {
  console.warn('VolumeManager native module not linked (e.g. running in Expo Go). Hardware volume listener disabled.');
}

let alarmPlayer = null;
let vibrationLoopInterval = null;
let volumeListener = null;

/**
 * Start the alarm (sound and/or vibration).
 * @param {boolean} soundEnabled 
 * @param {boolean} vibrationEnabled 
 * @param {string} intensity - 'low', 'medium', or 'high'
 */
export async function startAlarm(soundEnabled = true, vibrationEnabled = true, intensity = 'high') {
  try {
    await stopAlarm();

    if (soundEnabled || vibrationEnabled) {
      if (VolumeManager && !volumeListener) {
        try {
          VolumeManager.showNativeVolumeUI({ enabled: true });
          volumeListener = VolumeManager.addVolumeListener(() => {
            stopAlarm();
            if (global._stopAlarmFromVolume) {
              global._stopAlarmFromVolume();
            }
          });
        } catch (e) {
          console.warn('Failed to start volume listener:', e);
        }
      }
    }

    if (soundEnabled) {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });

      alarmPlayer = createAudioPlayer(require('../../assets/alarm.mp3'));
      if (alarmPlayer) {
        alarmPlayer.loop = true;
        alarmPlayer.volume = 1.0;
        alarmPlayer.play();
      }
    }

    if (vibrationEnabled) {
      startContinuousVibration(intensity);
    }
  } catch (error) {
    console.warn('SoundService.startAlarm error:', error);
    if (vibrationEnabled) {
      startContinuousVibration(intensity);
    }
  }
}

/**
 * Stop the alarm sound and vibration.
 */
export async function stopAlarm() {
  try {
    if (volumeListener) {
      try {
        volumeListener.remove();
      } catch (e) {}
      volumeListener = null;
    }
    stopContinuousVibration();
    if (alarmPlayer) {
      alarmPlayer.pause();
      alarmPlayer.remove();
      alarmPlayer = null;
    }
  } catch (error) {
    console.warn('SoundService.stopAlarm error:', error);
    alarmPlayer = null;
  }
}

/**
 * Trigger a single haptic vibration pulse.
 * @param {string} intensity - 'low', 'medium', or 'high'
 */
export async function triggerSingleVibration(intensity = 'high') {
  try {
    if (intensity === 'low') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (intensity === 'medium') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  } catch (error) {
    // Fallback if Haptics fails
    Vibration.vibrate(100);
  }
}

/**
 * Start continuous vibration based on intensity.
 * Handles platform differences: 
 * - Android supports patterns and looping natively.
 * - iOS requires an interval loop.
 * @param {string} intensity - 'low', 'medium', or 'high'
 */
export function startContinuousVibration(intensity = 'high') {
  stopContinuousVibration();

  if (Platform.OS === 'android') {
    let pattern = [];
    if (intensity === 'low') {
      pattern = [0, 400, 1000];
    } else if (intensity === 'medium') {
      pattern = [0, 600, 600];
    } else {
      pattern = [0, 1000, 400];
    }
    Vibration.vibrate(pattern, true);
  } else {
    // iOS doesn't support patterns or looping in the native vibrate() call.
    // We simulate it using an interval.
    let intervalTime = 1500;
    if (intensity === 'low') intervalTime = 2000;
    else if (intensity === 'medium') intervalTime = 1200;
    else intervalTime = 800;

    const performVibration = () => {
      // For iOS, the strength is determined by the Haptics style
      triggerSingleVibration(intensity);
      // Also call standard vibrate as a fallback
      Vibration.vibrate();
    };

    performVibration();
    vibrationLoopInterval = setInterval(performVibration, intervalTime);
  }
}

/**
 * Stop continuous vibration.
 */
export function stopContinuousVibration() {
  Vibration.cancel();
  if (vibrationLoopInterval) {
    clearInterval(vibrationLoopInterval);
    vibrationLoopInterval = null;
  }
}

/**
 * Check if alarm is currently playing.
 * @returns {boolean}
 */
export function isAlarmPlaying() {
  return alarmPlayer !== null && alarmPlayer.playing;
}

// Deprecated: keep for compatibility
export async function playAlarm(intensity = 'high') {
  return startAlarm(true, true, intensity);
}

export async function triggerVibration(intensity = 'high') {
  return triggerSingleVibration(intensity);
}
