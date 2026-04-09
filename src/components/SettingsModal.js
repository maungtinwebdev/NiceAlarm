import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Switch,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function SettingsModal({
  visible,
  onClose,
  settings,
  onSettingsChange,
}) {
  const { colors, isDark, toggleTheme } = useTheme();

  const toggleSetting = (key) => {
    onSettingsChange({ ...settings, [key]: !settings[key] });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: colors.surface,
              shadowColor: colors.shadowDark,
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>⚙️ Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textTertiary }]}>
                Done
              </Text>
            </TouchableOpacity>
          </View>

          {/* Settings List */}
          <View style={styles.settingsList}>
            {/* Dark Mode */}
            <View
              style={[
                styles.settingItem,
                { borderBottomColor: colors.divider },
              ]}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🌙</Text>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Dark Mode
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Comfortable night viewing
                  </Text>
                </View>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={isDark ? colors.primary : '#FFFFFF'}
              />
            </View>

            {/* Sound */}
            <View
              style={[
                styles.settingItem,
                { borderBottomColor: colors.divider },
              ]}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🔊</Text>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Alarm Sound
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Play sound when reaching destination
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={() => toggleSetting('soundEnabled')}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={settings.soundEnabled ? colors.primary : '#FFFFFF'}
              />
            </View>

            {/* Vibration */}
            <View
              style={[
                styles.settingItem,
                { borderBottomColor: colors.divider },
              ]}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>📳</Text>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Vibration
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Vibrate when alarm triggers
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={() => toggleSetting('vibrationEnabled')}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={
                  settings.vibrationEnabled ? colors.primary : '#FFFFFF'
                }
              />
            </View>

            {/* Auto Stop */}
            <View
              style={[
                styles.settingItem,
                { borderBottomWidth: 0 },
              ]}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>⏱️</Text>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Auto-Stop Alarm
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textTertiary },
                    ]}
                  >
                    Automatically stop after 30 seconds
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.autoStop}
                onValueChange={() => toggleSetting('autoStop')}
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={settings.autoStop ? colors.primary : '#FFFFFF'}
              />
            </View>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={[styles.appName, { color: colors.textSecondary }]}>
              Distance Alarm v1.0.0
            </Text>
            <Text style={[styles.appCredits, { color: colors.textTertiary }]}>
              Powered by OpenStreetMap 🌍
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingsList: {
    paddingHorizontal: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 28,
    paddingTop: 20,
  },
  appName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  appCredits: {
    fontSize: 12,
  },
});
