import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Single Source of Truth for Mobile -> Backend Network Configuration
 */
const getDevHostIp = (): string => {
  // 1. Try Expo Metro Bundler host IP (e.g. 192.168.1.X)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // 2. Fallback for Android Emulator vs iOS Simulator vs Localhost
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
};

const DEV_IP = getDevHostIp();
const PORT = 3004;

export const NETWORK_CONFIG = {
  devIp: DEV_IP,
  port: PORT,
  baseUrl: __DEV__
    ? `http://${DEV_IP}:${PORT}/api/v1`
    : 'https://api.mysranchi.org/api/v1',
  timeoutMs: 10000, // 10s timeout
} as const;

console.log(`[NETWORK CONFIG] Base API URL set to: ${NETWORK_CONFIG.baseUrl}`);
