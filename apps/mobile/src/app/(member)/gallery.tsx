import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { SkeletonItem } from '../../components/ui/SkeletonLoader';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.md * 3) / 2;

type Category = 'All' | 'Events' | 'Celebrations' | 'Others';

export default function GalleryScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlbums = async () => {
    try {
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          const res = await ApiService.getAlbums(token);
          setAlbums(res || []);
        }
      }
    } catch (err) {
      console.error('Fetch albums error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      void fetchAlbums();
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchAlbums();
  };

  const handleOpenAlbum = async (album: any) => {
    setSelectedAlbum(album);
    setLoadingPhotos(true);
    try {
      const token = await getToken();
      if (token) {
        const fullAlbum = await ApiService.getAlbumById(token, album.id);
        setAlbumPhotos(fullAlbum?.photos || []);
      }
    } catch {
      setAlbumPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Category Tabs Header — Matching Wireframe 08 */}
      <View style={styles.tabContainer}>
        {(['All', 'Events', 'Celebrations', 'Others'] as Category[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tabButton, activeCategory === cat && styles.tabButtonActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Album Grid — 2 Columns per Wireframe 08 */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary[500]]} />}
      >
        {loading ? (
          <View style={styles.gridRow}>
            <SkeletonItem width={CARD_WIDTH} height={140} borderRadius={12} style={{ marginBottom: 12 }} />
            <SkeletonItem width={CARD_WIDTH} height={140} borderRadius={12} style={{ marginBottom: 12 }} />
            <SkeletonItem width={CARD_WIDTH} height={140} borderRadius={12} style={{ marginBottom: 12 }} />
            <SkeletonItem width={CARD_WIDTH} height={140} borderRadius={12} style={{ marginBottom: 12 }} />
          </View>
        ) : albums.length > 0 ? (
          <View style={styles.gridRow}>
            {albums.map((album) => (
              <TouchableOpacity
                key={album.id}
                style={styles.albumCard}
                onPress={() => handleOpenAlbum(album)}
              >
                <Image
                  source={
                    album.coverImageUrl
                      ? { uri: album.coverImageUrl }
                      : require('../../../assets/images/mys-logo.jpg')
                  }
                  style={styles.albumCover}
                />
                <View style={styles.albumMeta}>
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {album.title}
                  </Text>
                  <Text style={styles.photoCount}>
                    {album._count?.photos || 0} Photos
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No photo albums yet</Text>
            <Text style={styles.emptySub}>Event photos will appear here after community celebrations</Text>
          </View>
        )}
      </ScrollView>

      {/* Album Photos Viewer Modal */}
      <Modal visible={Boolean(selectedAlbum)} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedAlbum(null)}>
              <Ionicons name="close" size={26} color={Colors.neutral[0]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedAlbum?.title}
            </Text>
            <View style={{ width: 26 }} />
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {loadingPhotos ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#A0AEC0' }}>Loading album photos...</Text>
              </View>
            ) : albumPhotos.length > 0 ? (
              <View style={styles.photoGrid}>
                {albumPhotos.map((photo) => (
                  <Image key={photo.id} source={{ uri: photo.imageUrl }} style={styles.photoThumb} />
                ))}
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#A0AEC0' }}>No photos uploaded in this album yet.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary[500],
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.neutral[0],
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  albumCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  albumCover: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.neutral[200],
  },
  albumMeta: {
    padding: 10,
  },
  albumTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  photoCount: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1A202C',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
    backgroundColor: '#2D3748',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoThumb: {
    width: (width - 32) / 2,
    height: 140,
    borderRadius: 8,
  },
});
