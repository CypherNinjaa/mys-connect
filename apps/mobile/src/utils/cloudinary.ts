import { Alert } from 'react-native';

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'scale' | 'fit' | 'pad' | 'thumb' | 'auto';
  gravity?: 'auto' | 'face' | 'center';
  quality?: 'auto' | number;
  format?: 'auto' | 'jpg' | 'png' | 'webp';
}

/**
 * Builds an optimized Cloudinary delivery URL following Cloudinary transformation rules:
 * - c_fill,g_auto,w_X,h_Y for smart crop
 * - f_auto/q_auto at end for format & quality optimization
 */
export function buildCloudinaryUrl(
  urlOrPublicId: string,
  options: CloudinaryTransformOptions = {}
): string {
  if (!urlOrPublicId) return '';

  // If it's already a full Cloudinary URL, parse and inject transformations
  const cloudinaryPattern = /(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)/;
  const match = urlOrPublicId.match(cloudinaryPattern);

  const width = options.width || 400;
  const height = options.height || options.width || 400;
  const crop = options.crop || 'fill';
  const gravity = options.gravity || 'auto';
  const format = options.format || 'auto';
  const quality = options.quality || 'auto';

  const transformParams = `c_${crop},g_${gravity},w_${width},h_${height}/f_${format}/q_${quality}`;

  if (match) {
    const baseUrl = match[1];
    let publicPath = match[2];

    // Remove existing transformation prefix if any
    publicPath = publicPath.replace(/^(c_[^/]+\/|v\d+\/)+/, '');

    return `${baseUrl}${transformParams}/${publicPath}`;
  }

  // If passed only a publicId or raw URL
  if (urlOrPublicId.startsWith('http')) {
    return urlOrPublicId;
  }

  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'mys-connect';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformParams}/${urlOrPublicId}`;
}

/**
 * Downloads a transformed Cloudinary image to the local device and triggers sharing/save.
 * Uses safe dynamic requiring for Expo native file system & sharing modules.
 */
export async function downloadCloudinaryImage(imageUrl: string, filename = 'mys_download.jpg') {
  try {
    if (!imageUrl) throw new Error('No image URL provided');

    let FileSystem: typeof import('expo-file-system') | null = null;
    let Sharing: typeof import('expo-sharing') | null = null;

    try {
      FileSystem = require('expo-file-system');
    } catch {}

    try {
      Sharing = require('expo-sharing');
    } catch {}

    if (!FileSystem || typeof FileSystem.downloadAsync !== 'function') {
      Alert.alert('Download Not Supported', 'File download is not supported in this runtime environment.');
      return;
    }

    const fileSystemAny = FileSystem as any;
    const cacheDir = fileSystemAny.cacheDirectory || fileSystemAny.documentDirectory || '';
    const fileUri = `${cacheDir}${filename}`;
    const downloadRes = await FileSystem.downloadAsync(imageUrl, fileUri);

    if (downloadRes.status !== 200) {
      throw new Error('Failed to download image from server');
    }

    if (Sharing && typeof Sharing.isAvailableAsync === 'function') {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Save or Share Image',
        });
        return;
      }
    }

    Alert.alert('Downloaded 🎉', `Image saved to local storage: ${fileUri}`);
  } catch (err: any) {
    console.error('Download Cloudinary image error:', err);
    Alert.alert('Download Error', err.message || 'Could not download image');
  }
}
