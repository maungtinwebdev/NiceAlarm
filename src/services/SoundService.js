import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let alarmPlayer = null;

/**
 * Play the alarm sound in an infinite loop with vibration.
 */
export async function playAlarm() {
  try {
    await stopAlarm();

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

    // Vibration pattern
    triggerVibration();
  } catch (error) {
    console.warn('SoundService.playAlarm error:', error);
    // Fallback: at least vibrate
    triggerVibration();
  }
}

/**
 * Stop the alarm sound and vibration.
 */
export async function stopAlarm() {
  try {
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
 * Trigger haptic vibration pattern.
 */
export async function triggerVibration() {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.warn('Haptics error:', error);
  }
}

/**
 * Check if alarm is currently playing.
 * @returns {boolean}
 */
export function isAlarmPlaying() {
  return alarmPlayer !== null && alarmPlayer.playing;
}
