import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Abstract storage interface that works on both web and mobile platforms
 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Standard storage for non-sensitive data (collection cache, metadata, queue)
 * Uses AsyncStorage for React Native
 */
export const storage: StorageAdapter = {
  getItem: AsyncStorage.getItem,
  setItem: AsyncStorage.setItem,
  removeItem: AsyncStorage.removeItem,
};

/**
 * Secure storage for sensitive credentials (OAuth tokens, session keys)
 * Uses Expo SecureStore which encrypts data at rest
 */
export const secureStorage: StorageAdapter = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
};

/**
 * Helper to clear all storage (useful for logout or debugging)
 */
export const clearAllStorage = async (): Promise<void> => {
  await AsyncStorage.clear();
  // Note: SecureStore doesn't have a clearAll, need to remove keys individually
};
