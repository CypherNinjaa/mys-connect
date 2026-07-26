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

console.log(`[NETWORK CONFIG] Base API URL active: ${NETWORK_CONFIG.baseUrl}`);
