import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { formatDistance, getCompassDirection, getBearing } from '../utils/distance';

export default function AlarmControls({
  isTracking,
  destination,
  alertDistance,
  currentDistance,
  userLocation,
  isAlarmActive,
  onStart,
  onStop,
  onStopAlarm,
}) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation when tracking
  useEffect(() => {
    if (isTracking && !isAlarmActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isTracking, isAlarmActive]);

  // Glow border animation when alarm is active — keep card fully opaque and visible
  useEffect(() => {
    if (isAlarmActive) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(borderAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: false,
          }),
          Animated.timing(borderAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: false,
          }),
        ]),
      );
      glow.start();

      // Slight pulse on the emoji only
      const emojiPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      emojiPulse.start();

      return () => {
        glow.stop();
        emojiPulse.stop();
      };
    } else {
      borderAnim.setValue(0);
      glowAnim.setValue(1);
    }
  }, [isAlarmActive]);

  const getProgress = () => {
    if (!currentDistance || !alertDistance) return 0;
    if (currentDistance <= alertDistance) return 1;
    // Show progress from a reasonable max distance
    const maxDisplayDistance = Math.max(alertDistance * 5, 5000);
    return Math.max(0, 1 - (currentDistance - alertDistance) / maxDisplayDistance);
  };

  const bearing =
    userLocation && destination
      ? getBearing(
          userLocation.latitude,
          userLocation.longitude,
          destination.latitude,
          destination.longitude,
        )
      : null;

  const progress = getProgress();

  // Interpolate border color for alarm glow effect
  const alarmBorderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.9)'],
  });

  if (isAlarmActive) {
    return (
      <View style={styles.alarmContainer}>
        <Animated.View
          style={[
            styles.alarmCard,
            {
              backgroundColor: colors.danger,
              shadowColor: colors.danger,
              borderColor: alarmBorderColor,
              borderWidth: 3,
            },
          ]}
        >
          <Animated.Text
            style={[styles.alarmEmoji, { transform: [{ scale: glowAnim }] }]}
          >
            🔔
          </Animated.Text>
          <Text style={styles.alarmTitle}>You've Arrived!</Text>
          <Text style={styles.alarmSubtitle}>
            {destination?.name || 'Destination'} — {formatDistance(currentDistance)} away
          </Text>
          <TouchableOpacity
            style={styles.stopAlarmBtn}
            onPress={onStopAlarm}
            activeOpacity={0.8}
          >
            <Text style={styles.stopAlarmText}>Stop Alarm</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Distance Info */}
      {isTracking && currentDistance != null && (
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              shadowColor: colors.shadow,
            },
          ]}
        >
          {/* Progress bar */}
          <View style={[styles.progressContainer, { backgroundColor: colors.divider }]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor:
                    progress > 0.8 ? colors.success : colors.primary,
                  width: `${Math.min(progress * 100, 100)}%`,
                  transform: [{ scaleX: pulseAnim }],
                },
              ]}
            />
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>
                Distance
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {formatDistance(currentDistance)}
              </Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} />
            <View style={styles.infoBlock}>
              <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>
                Alert At
              </Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>
                {formatDistance(alertDistance)}
              </Text>
            </View>
            {bearing != null && (
              <>
                <View style={[styles.infoDivider, { backgroundColor: colors.divider }]} />
                <View style={styles.infoBlock}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>
                    Direction
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.accent }]}>
                    {getCompassDirection(bearing)}
                  </Text>
                </View>
              </>
            )}
          </View>

          {destination?.name && (
            <Text
              style={[styles.destinationName, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              📍 {destination.name}
            </Text>
          )}
        </View>
      )}

      {/* Start / Stop Button */}
      <Animated.View
        style={
          isTracking ? { transform: [{ scale: pulseAnim }] } : undefined
        }
      >
        <TouchableOpacity
          style={[
            styles.mainButton,
            {
              backgroundColor: isTracking ? colors.danger : colors.primary,
              shadowColor: isTracking ? colors.danger : colors.primary,
            },
          ]}
          onPress={isTracking ? onStop : onStart}
          activeOpacity={0.8}
          disabled={!destination && !isTracking}
        >
          <Text style={styles.mainButtonIcon}>
            {isTracking ? '⏹' : '▶'}
          </Text>
          <Text style={styles.mainButtonText}>
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  infoCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  infoBlock: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  infoDivider: {
    width: 1,
    height: 36,
  },
  destinationName: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 28,
    gap: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  mainButtonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  mainButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  alarmContainer: {
    marginBottom: 8,
  },
  alarmCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  alarmEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  alarmTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  alarmSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 20,
  },
  stopAlarmBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  stopAlarmText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F43F5E',
  },
});
