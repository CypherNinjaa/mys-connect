import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getDevHostIp = (): string => {
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

  return Platform.OS === 'android' ? '192.168.1.4' : 'localhost';
};

const DEV_IP = getDevHostIp();
const PORT = 3004;

const resolveBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (!__DEV__) {
    return 'https://api.mysranchi.org/api/v1';
  }
  if (DEV_IP.startsWith('http://') || DEV_IP.startsWith('https://')) {
    return DEV_IP;
  }
  return `http://${DEV_IP}:${PORT}/api/v1`;
};

export const NETWORK_CONFIG = {
  devIp: DEV_IP,
  port: PORT,
  baseUrl: resolveBaseUrl(),
  timeoutMs: 25000, // 25s timeout
} as const;

console.log(`[NETWORK CONFIG] Base API URL active: ${NETWORK_CONFIG.baseUrl}`);
