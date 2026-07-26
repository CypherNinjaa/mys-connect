import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { buildCloudinaryUrl } from '../../utils/cloudinary';

export interface GalleryItemData {
  id: string;
  albumId?: string;
  albumTitle?: string;
  title?: string;
  category: 'Events' | 'Celebrations' | 'Others' | string;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt?: string;
}

interface GalleryCardProps {
  item: GalleryItemData;
  onPress: (item: GalleryItemData) => void;
}

export function GalleryCard({ item, onPress }: GalleryCardProps) {
  const [loadingImage, setLoadingImage] = useState(true);

  // Cloudinary optimized thumbnail (w_400, h_400, c_fill, f_auto, q_auto)
  const optimizedThumbnailUrl = buildCloudinaryUrl(item.thumbnailUrl || item.imageUrl, {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  });

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.88}>
      <View style={styles.imageContainer}>
        {loadingImage && (
          <View style={styles.skeletonPlaceholder}>
            <ActivityIndicator color="#6B1D2A" size="small" />
          </View>
        )}
        <Image
          source={{ uri: optimizedThumbnailUrl }}
          style={styles.image}
          resizeMode="cover"
          onLoadEnd={() => setLoadingImage(false)}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,

    // Soft border & drop shadow matching wireframe 100%
    borderWidth: 1,
    borderColor: '#F0F4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 165,
    backgroundColor: '#EDF2F7',
    position: 'relative',
  },
  skeletonPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
