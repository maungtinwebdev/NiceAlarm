import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { OSM_SEARCH_URL } from '../constants/config';

export default function SearchBar({ onPlaceSelected, isTracking }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchTimeout = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: results.length > 0 && isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [results, isFocused]);

  const searchPlaces = async (text) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.length < 3) {
      setResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${OSM_SEARCH_URL}?q=${encodeURIComponent(text)}&format=json&limit=6&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'DistanceAlarmApp/1.0',
              Accept: 'application/json',
            },
          },
        );
        const data = await response.json();
        setResults(
          data.map((item) => ({
            id: item.place_id.toString(),
            name: item.display_name,
            shortName: item.name || item.display_name.split(',')[0],
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
            type: item.type,
          })),
        );
      } catch (error) {
        console.warn('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 600);
  };

  const handleSelect = (place) => {
    setQuery(place.shortName);
    setResults([]);
    Keyboard.dismiss();
    onPlaceSelected(place);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  if (isTracking) return null;

  return (
    <View style={[styles.container, { zIndex: 100 }]}>
      {/* Search Input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: isFocused ? colors.primary : colors.borderLight,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <Text style={[styles.searchIcon, { color: colors.textTertiary }]}>🔍</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Search for a place..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={searchPlaces}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
        {query.length > 0 && !loading && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
            <Text style={[styles.clearText, { color: colors.textTertiary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results List */}
      {results.length > 0 && isFocused && (
        <Animated.View
          style={[
            styles.resultsList,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
              shadowColor: colors.shadowDark,
              opacity: fadeAnim,
            },
          ]}
        >
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.resultItem,
                  {
                    borderBottomColor: colors.divider,
                    borderBottomWidth: index < results.length - 1 ? 1 : 0,
                  },
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.resultIcon]}>📍</Text>
                <View style={styles.resultTextContainer}>
                  <Text
                    style={[styles.resultName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.shortName}
                  </Text>
                  <Text
                    style={[styles.resultAddress, { color: colors.textTertiary }]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 6,
  },
  clearText: {
    fontSize: 16,
    fontWeight: '700',
  },
  resultsList: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: 280,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  resultIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 12,
  },
});
