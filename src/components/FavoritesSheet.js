import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function FavoritesSheet({
  favorites,
  onSelect,
  onRemove,
  isTracking,
  visible,
  onClose,
}) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          shadowColor: colors.shadowDark,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          ⭐ Saved Places
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={[styles.closeText, { color: colors.textTertiary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📍</Text>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No saved places yet
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
            Tap the ⭐ button after selecting a destination
          </Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.item,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.borderLight,
                },
              ]}
              onPress={() => {
                if (!isTracking) {
                  onSelect(item);
                  onClose();
                }
              }}
              activeOpacity={0.7}
              disabled={isTracking}
              onLongPress={() => {
                Alert.alert(
                  'Remove Favorite',
                  `Remove "${item.name}" from saved places?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => onRemove(item.id),
                    },
                  ],
                );
              }}
            >
              <Text style={styles.itemIcon}>📌</Text>
              <View style={styles.itemContent}>
                <Text
                  style={[styles.itemName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={[styles.itemCoords, { color: colors.textTertiary }]}>
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
              </View>
              <Text style={[styles.itemArrow, { color: colors.textTertiary }]}>
                ›
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 8,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 20,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemCoords: {
    fontSize: 12,
  },
  itemArrow: {
    fontSize: 28,
    fontWeight: '300',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
