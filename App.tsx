import './global.css';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 bg-gray-900 items-center justify-center">
      <Text className="text-gray-100 text-xl font-semibold">
        Scrobbler for Discogs Mobile
      </Text>
      <Text className="text-gray-400 mt-2">
        Phase 1 Setup Complete! 🎵
      </Text>
      <StatusBar style="light" />
    </View>
  );
}
