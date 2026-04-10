// Intercept and hide terminal console spam for the unavoidable Expo Go notifications warning
// This must execute before any other imports!
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('expo-notifications: Android Push notifications')) return;
  originalError(...args);
};

console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('expo-notifications')) return;
  originalWarn(...args);
};
