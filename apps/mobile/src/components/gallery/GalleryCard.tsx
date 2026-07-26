import React, { useState, useEffect, useRef } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
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

// Global cache for loaded image URLs to prevent white flickering on re-render
const loadedImageUrls = new Set<string>();

export const GalleryCard = React.memo(function GalleryCard({ item, onPress }: GalleryCardProps) {
  const optimizedThumbnailUrl = buildCloudinaryUrl(item.thumbnailUrl || item.imageUrl, {
    width: 400,
    height: 400,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  });

  const isAlreadyLoaded = loadedImageUrls.has(optimizedThumbnailUrl);
  const [loadingImage, setLoadingImage] = useState(!isAlreadyLoaded);
  const fadeAnim = useRef(new Animated.Value(0.4)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    // Smooth entry animation on mount/filter
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [item.id, fadeAnim, scaleAnim]);

  const handleImageLoad = () => {
    loadedImageUrls.add(optimizedThumbnailUrl);
    setLoadingImage(false);
  };

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.88} style={styles.touchable}>
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
            onLoadEnd={handleImageLoad}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,

    // Soft border & drop shadow
    borderWidth: 1,
    borderColor: '#F0F4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  touchable: {
    width: '100%',
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
