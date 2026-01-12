# Scrobbler for Discogs Mobile

React Native mobile app for syncing Discogs vinyl collections with Last.fm.

## Phase 1: Setup Complete ✅

- ✅ Expo project initialized with TypeScript
- ✅ Core dependencies installed (React Navigation, Redux Toolkit, NativeWind)
- ✅ OAuth dependencies (expo-auth-session, expo-crypto, expo-secure-store)
- ✅ Storage configured (@react-native-async-storage/async-storage)
- ✅ NativeWind configured with custom color scheme
- ✅ Deep linking configured (scheme: `scrobbler-for-discogs://`)

## Development

```bash
# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

## Deep Linking

The app uses the custom URL scheme: `scrobbler-for-discogs://`

- iOS Bundle ID: `com.scrobbler.discogs`
- Android Package: `com.scrobbler.discogs`

## Architecture

This app reuses ~85% of business logic from the web version:
- Redux store (state management)
- Services layer (API calls)
- Utility functions (formatting, fuzzy search, etc.)
- Custom hooks (collection management, queue logic)

## Next Steps

- Phase 2: Copy utility functions and create storage adapters
- Phase 3: Implement OAuth flows with expo-auth-session
- Phase 4: Build UI components
