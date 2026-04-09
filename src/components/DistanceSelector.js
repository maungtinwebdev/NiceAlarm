import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ALERT_DISTANCES } from '../constants/config';
import { formatDistance } from '../utils/distance';

export default function DistanceSelector({
  selectedDistance,
  onDistanceChange,
  isTracking,
}) {
  const { colors } = useTheme();
  const scaleAnims = useRef(
    ALERT_DISTANCES.map(() => new Animated.Value(1)),
  ).current;

  const handleSelect = (value, index) => {
    if (isTracking) return;

    // Bounce animation
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();

    onDistanceChange(value);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        Alert Distance
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {ALERT_DISTANCES.map((item, index) => {
          const isSelected = selectedDistance === item.value;
          return (
            <Animated.View
              key={item.value}
              style={{ transform: [{ scale: scaleAnims[index] }] }}
            >
              <TouchableOpacity
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surface,
                    borderColor: isSelected
                      ? colors.primary
                      : colors.borderLight,
                    shadowColor: isSelected ? colors.primary : 'transparent',
                    shadowOpacity: isSelected ? 0.4 : 0,
                  },
                ]}
                onPress={() => handleSelect(item.value, index)}
                activeOpacity={0.7}
                disabled={isTracking}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  scrollContent: {
    paddingHorizontal: 2,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
  },
  chipText: {
    fontSize: 14,
  },
});
