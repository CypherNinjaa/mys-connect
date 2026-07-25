/**
 * MYS CONNECT — Unified Theme Export
 * Single import point for the entire design system
 */

export { Colors } from './Colors';
export { Typography } from './Typography';
export { Spacing } from './Spacing';

/**
 * API Configuration
 */
export const API = {
  baseUrl: __DEV__
    ? 'http://localhost:3001/api/v1'
    : 'https://api.mysranchi.org/api/v1',
  timeout: 15000, // 15 seconds
} as const;

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
