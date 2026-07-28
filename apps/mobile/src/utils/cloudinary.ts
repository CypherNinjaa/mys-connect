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
 * Uses safe legacy import fallback for Expo SDK 52/53/54 compatibility.
 */
export async function downloadCloudinaryImage(imageUrl: string, filename = 'mys_download.jpg') {
  if (!imageUrl) throw new Error('No image URL provided');

  let FileSystemModule: any = null;
  let SharingModule: any = null;

  try {
    FileSystemModule = require('expo-file-system/legacy');
  } catch {
    try {
      FileSystemModule = require('expo-file-system');
    } catch {}
  }

  try {
    SharingModule = require('expo-sharing');
  } catch {}

  const cacheDir = FileSystemModule?.cacheDirectory || FileSystemModule?.documentDirectory || '';
  const fileUri = `${cacheDir}${filename}`;

  let savedUri = imageUrl;

  if (FileSystemModule && typeof FileSystemModule.downloadAsync === 'function') {
    const downloadRes = await FileSystemModule.downloadAsync(imageUrl, fileUri);
    if (downloadRes && downloadRes.status === 200) {
      savedUri = downloadRes.uri;
    }
  }

  if (SharingModule && typeof SharingModule.isAvailableAsync === 'function') {
    const isAvailable = await SharingModule.isAvailableAsync();
    if (isAvailable) {
      await SharingModule.shareAsync(savedUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Save or Share Image',
      });
      return savedUri;
    }
  }

  return savedUri;
}
