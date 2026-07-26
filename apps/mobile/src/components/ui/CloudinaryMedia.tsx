import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { buildCloudinaryUrl, downloadCloudinaryImage, CloudinaryTransformOptions } from '../../utils/cloudinary';
import { Colors } from '../../constants/theme';

interface CloudinaryMediaProps {
  imageUri?: string | null;
  fallbackInitials?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  transformOptions?: CloudinaryTransformOptions;
  allowUpload?: boolean;
  allowDownload?: boolean;
  onUploadSuccess?: (base64OrUri: string) => Promise<void> | void;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

export function CloudinaryMedia({
  imageUri,
  fallbackInitials = 'M',
  width = 120,
  height = 120,
  borderRadius = 60,
  transformOptions = { crop: 'fill', gravity: 'face', quality: 'auto' },
  allowUpload = false,
  allowDownload = false,
  onUploadSuccess,
  style,
  imageStyle,
}: CloudinaryMediaProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const optimizedUrl = imageUri ? buildCloudinaryUrl(imageUri, { width, height, ...transformOptions }) : null;

  const handlePickAndUpload = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Permission to access media library is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setIsUploading(true);
        const asset = result.assets[0];
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        if (onUploadSuccess) {
          await onUploadSuccess(base64Data);
        }
      }
    } catch (err: any) {
      console.error('Cloudinary upload picker error:', err);
      Alert.alert('Error', err.message || 'Failed to select image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!optimizedUrl) return;
    setIsDownloading(true);
    await downloadCloudinaryImage(optimizedUrl, `cloudinary_${Date.now()}.jpg`);
    setIsDownloading(false);
  };

  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={[styles.imageWrapper, { width, height, borderRadius }]}>
        {isUploading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator color={Colors.primary[500]} size="small" />
            <Text style={styles.statusText}>Uploading...</Text>
          </View>
        ) : optimizedUrl ? (
          <Image
            source={{ uri: optimizedUrl }}
            style={[styles.image, { width, height, borderRadius }, imageStyle]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.fallbackContainer, { borderRadius }]}>
            <Text style={[styles.initials, { fontSize: Math.min(width, height) * 0.4 }]}>
              {fallbackInitials[0]?.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Upload Badge Action */}
      {allowUpload && (
        <TouchableOpacity
          style={[styles.uploadBadge, { right: 0, bottom: 0 }]}
          onPress={handlePickAndUpload}
          disabled={isUploading}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Download Action */}
      {allowDownload && optimizedUrl && (
        <TouchableOpacity
          style={[styles.downloadBadge, { left: 0, bottom: 0 }]}
          onPress={handleDownload}
          disabled={isDownloading}
          activeOpacity={0.8}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="download" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    overflow: 'hidden',
    backgroundColor: '#EDF2F7',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: Colors.secondary[500],
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    color: Colors.primary[500],
    marginTop: 4,
    fontWeight: '600',
  },
  uploadBadge: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[500],
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  downloadBadge: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary[600],
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});
