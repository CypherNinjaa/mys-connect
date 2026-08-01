/**
 * MYS CONNECT — Unified Theme Export
 * Single import point for the entire design system
 */

import { NETWORK_CONFIG } from '../config/network.config';

export { Colors } from './Colors';
export { Typography } from './Typography';
export { Spacing } from './Spacing';

/**
 * API Configuration — Single Source from Network Config
 *
 * `baseUrl` is a getter rather than a copied string. In development the network
 * config probes several candidate addresses and may correct itself shortly after
 * startup; a snapshot taken at import time would pin the first guess forever and
 * every request would keep using an address already known to be unreachable.
 */
export const API = {
  get baseUrl(): string {
    return NETWORK_CONFIG.baseUrl;
  },
  get timeout(): number {
    return NETWORK_CONFIG.timeoutMs;
  },
};

/**
 * App Constants
 */
export const APP = {
  name: 'MYS CONNECT',
  tagline: 'Connecting Every Member, Digitally',
  orgName: 'Maheshwari Yuva Sangathan',
  city: 'Ranchi',
  mottoHindi: 'सेवा · त्याग · सदाचार',
} as const;

/**
 * Cache TTLs (in milliseconds)
 */
export const CACHE = {
  memberDirectory: 5 * 60 * 1000,    // 5 min
  events: 5 * 60 * 1000,             // 5 min
  notices: 10 * 60 * 1000,           // 10 min
  albums: 30 * 60 * 1000,            // 30 min
  profile: 15 * 60 * 1000,           // 15 min
} as const;

/**
 * Upload Limits
 */
export const UPLOAD = {
  maxImageSizeMB: 5,
  maxImagesPerAlbum: 50,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  avatarMaxSize: 2, // MB
} as const;
