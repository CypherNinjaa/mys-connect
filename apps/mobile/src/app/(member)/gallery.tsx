import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Modal,
  Platform,
  BackHandler,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCustomAlert } from '../../context/CustomAlertContext';
import { ApiService } from '../../services/api';
import { GalleryCacheManager } from '../../services/galleryCacheManager';
import { useCacheChannel } from '../../hooks/useCacheChannel';
import { GalleryCard, GalleryItemData } from '../../components/gallery/GalleryCard';
import { SkeletonItem } from '../../components/ui/SkeletonLoader';
import { downloadCloudinaryImage, buildCloudinaryUrl } from '../../utils/cloudinary';
import { PinchZoomImage } from '../../components/ui/PinchZoomImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CategoryTab = 'All' | 'Events' | 'Celebrations' | 'Others';

const CATEGORY_TABS: CategoryTab[] = ['All', 'Events', 'Celebrations', 'Others'];

export default function GalleryScreen() {
  const { getToken } = useAuth();
  const { showAlert } = useCustomAlert();
  const router = useRouter();

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [allGalleryItems, setAllGalleryItems] = useState<GalleryItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);

  // Full-Screen Viewer State
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isModalZoomed, setIsModalZoomed] = useState(false);

  const categoryPagerRef = useRef<FlatList>(null);
  const modalFlatListRef = useRef<FlatList>(null);

  const activeCategory = CATEGORY_TABS[activeCategoryIndex] || 'All';

  // Smart Back Navigation Handler
  const handleBackNavigation = useCallback(() => {
    if (viewerVisible) {
      setViewerVisible(false);
      setIsModalZoomed(false);
      return true;
    }
    if (isSearching) {
      setIsSearching(false);
      setSearchQuery('');
      setDebouncedQuery('');
      return true;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(member)/home');
    }
    return true;
  }, [viewerVisible, isSearching, router]);

  // Android Hardware Back Listener
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackNavigation);
    return () => subscription.remove();
  }, [handleBackNavigation]);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial Data Fetch & Client Cache Retrieval
  const loadGalleryData = useCallback(
    async (isForceRefresh = false) => {
      if (!isForceRefresh) {
        const cached = GalleryCacheManager.getCachedData();
        if (cached && cached.items && cached.items.length > 0) {
          setAllGalleryItems(cached.items);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      if (isForceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setHasError(false);
      setErrorMessage(null);
      setCooldownMessage(null);

      try {
        const token = (await getToken()) || undefined;
        const res = await ApiService.getGallery(token, undefined, undefined, 1, 100);

        if (res && Array.isArray(res.items) && res.items.length > 0) {
          setAllGalleryItems(res.items);
          GalleryCacheManager.setCachedData({ items: res.items, albums: res.albums || [] });
        } else {
          const sampleItems: GalleryItemData[] = [
            {
              id: 'g-1',
              title: 'Executive Committee Meeting',
              category: 'Events',
              imageUrl:
                'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
            },
            {
              id: 'g-2',
              title: 'Mahesh Navami Aarti',
              category: 'Celebrations',
              imageUrl:
                'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
            },
            {
              id: 'g-3',
              title: 'Blood Donation Drive Volunteers',
              category: 'Others',
              imageUrl:
                'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=800&q=80',
            },
            {
              id: 'g-4',
              title: 'Diwali Sneh Milan Musical Night',
              category: 'Celebrations',
              imageUrl:
                'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
            },
            {
              id: 'g-5',
              title: 'Youth Leadership Keynote Session',
              category: 'Events',
              imageUrl:
                'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
            },
            {
              id: 'g-6',
              title: 'Annual General Assembly',
              category: 'Events',
              imageUrl:
                'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
            },
          ];
          setAllGalleryItems(sampleItems);
          GalleryCacheManager.setCachedData({ items: sampleItems, albums: [] });
        }
      } catch (err: any) {
        console.error('Fetch gallery error:', err);
        setHasError(true);
        setErrorMessage(err.message || 'Could not load gallery images');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken]
  );

  useEffect(() => {
    // Awaited inside the effect rather than called from its body, so the loader's
    // setState calls land after the first paint instead of cascading.
    async function run() {
      await loadGalleryData(false);
    }
    void run();
  }, [loadGalleryData]);

  // Realtime: an admin finished a Cloudinary upload and the socket inserted the
  // new photos into the cache. Re-read it — no refetch, no page reload.
  useCacheChannel('gallery', () => {
    const cached = GalleryCacheManager.getCachedData();
    if (cached?.items) setAllGalleryItems(cached.items);
  });

  // Rate-Limited Manual Pull-to-Refresh
  const handleRefresh = () => {
    const { allowed, remainingSeconds } = GalleryCacheManager.canManualRefresh();
    if (!allowed) {
      setRefreshing(false);
      setCooldownMessage(`Already up to date. Please wait ${remainingSeconds}s before refreshing again.`);
      setTimeout(() => setCooldownMessage(null), 3000);
      return;
    }

    GalleryCacheManager.recordManualRefresh();
    void loadGalleryData(true);
  };

  // Switch category tab index cleanly
  const handleTabClick = (index: number) => {
    setActiveCategoryIndex(index);
    categoryPagerRef.current?.scrollToIndex({ index, animated: true });
  };

  // Helper to filter items for any specific category
  const getFilteredItemsForCategory = useCallback(
    (category: CategoryTab) => {
      return allGalleryItems.filter((item) => {
        let matchesCategory = true;
        if (category !== 'All') {
          matchesCategory = item.category?.toLowerCase() === category.toLowerCase();
        }

        if (!matchesCategory) return false;

        if (debouncedQuery.trim()) {
          const q = debouncedQuery.toLowerCase();
          return item.title?.toLowerCase().includes(q) || item.category?.toLowerCase().includes(q);
        }

        return true;
      });
    },
    [allGalleryItems, debouncedQuery]
  );

  const activeFilteredItems = useMemo(() => {
    return getFilteredItemsForCategory(activeCategory);
  }, [getFilteredItemsForCategory, activeCategory]);

  const handleCardPress = (item: GalleryItemData) => {
    const idx = activeFilteredItems.findIndex((g) => g.id === item.id);
    setSelectedIndex(idx >= 0 ? idx : 0);
    setIsModalZoomed(false);
    setViewerVisible(true);
  };

  const handleDownloadPhoto = async (photo: GalleryItemData) => {
    try {
      const fullResUrl = buildCloudinaryUrl(photo.imageUrl, { quality: 'auto', format: 'auto' });
      await downloadCloudinaryImage(fullResUrl, `mys_gallery_${photo.id}.jpg`);
    } catch (err: any) {
      showAlert({ title: 'Download Error', message: err.message || 'Could not download photo', type: 'error' });
    }
  };

  const currentPhoto = activeFilteredItems[selectedIndex] || activeFilteredItems[0];
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6B1D2A" />

      {/* Maroon Header matching wireframe */}
      <View style={[styles.headerContainer, { paddingTop: statusBarHeight + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleBackNavigation}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Gallery</Text>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              if (isSearching) {
                setIsSearching(false);
                setSearchQuery('');
                setDebouncedQuery('');
              } else {
                setIsSearching(true);
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name={isSearching ? 'close' : 'search'} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Collapsible Search Input */}
        {isSearching && (
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search-outline" size={18} color="#718096" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by photo title or album..."
              placeholderTextColor="#A0AEC0"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setDebouncedQuery('');
                }}
              >
                <Ionicons name="close-circle" size={18} color="#A0AEC0" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Category Tab Segment Bar */}
      <View style={styles.tabBarWrapper}>
        <View style={styles.tabBarContainer}>
          {CATEGORY_TABS.map((tab, idx) => {
            const isActive = activeCategoryIndex === idx;
            return (
              <TouchableOpacity
                key={tab}
                style={styles.tabItem}
                onPress={() => handleTabClick(idx)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                  {tab}
                </Text>
                {isActive && <View style={styles.activeUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Refresh Cooldown Notification Toast */}
      {cooldownMessage && (
        <View style={styles.cooldownBanner}>
          <Ionicons name="information-circle" size={18} color="#2B6CB0" style={{ marginRight: 6 }} />
          <Text style={styles.cooldownText}>{cooldownMessage}</Text>
        </View>
      )}

      {/* Error Banner */}
      {hasError && (
        <TouchableOpacity
          style={styles.errorBanner}
          onPress={() => loadGalleryData(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="alert-circle-outline" size={20} color="#C53030" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorBannerTitle}>Unable to load gallery</Text>
            <Text style={styles.errorBannerSub}>
              {errorMessage || 'Network connection issue. Tap to retry.'}
            </Text>
          </View>
          <Ionicons name="refresh" size={18} color="#C53030" />
        </TouchableOpacity>
      )}

      {/* 100% Sensitive Horizontal Paging Category Swiper */}
      <View style={styles.body}>
        {loading ? (
          <View style={styles.skeletonGridContainer}>
            <View style={styles.skeletonRow}>
              <SkeletonItem width="48.5%" height={165} borderRadius={16} />
              <SkeletonItem width="48.5%" height={165} borderRadius={16} />
            </View>
            <View style={styles.skeletonRow}>
              <SkeletonItem width="48.5%" height={165} borderRadius={16} />
              <SkeletonItem width="48.5%" height={165} borderRadius={16} />
            </View>
          </View>
        ) : (
          <FlatList
            ref={categoryPagerRef}
            data={CATEGORY_TABS}
            keyExtractor={(item) => item}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const newIdx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              if (newIdx !== activeCategoryIndex) {
                setActiveCategoryIndex(newIdx);
              }
            }}
            renderItem={({ item: category }) => {
              const categoryItems = getFilteredItemsForCategory(category);
              return (
                <View style={styles.categoryPage}>
                  <FlatList
                    data={categoryItems}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                      <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#6B1D2A']}
                        tintColor="#6B1D2A"
                      />
                    }
                    renderItem={({ item }) => (
                      <GalleryCard item={item} onPress={handleCardPress} />
                    )}
                    ListEmptyComponent={
                      !hasError ? (
                        <View style={styles.emptyStateBox}>
                          <Ionicons name="images-outline" size={48} color="#CBD5E0" />
                          <Text style={styles.emptyTitle}>No photos found</Text>
                          <Text style={styles.emptySub}>
                            {debouncedQuery
                              ? `No images matching "${debouncedQuery}".`
                              : `There are currently no photos in the "${category}" category.`}
                          </Text>
                        </View>
                      ) : null
                    }
                  />
                </View>
              );
            }}
          />
        )}
      </View>

      {/* Full-Screen Gallery Image Viewer Modal with Dynamic Swiper Lock for 100% Smooth Pinch Zoom */}
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSafeArea}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                onPress={() => setViewerVisible(false)}
                style={styles.modalActionBtn}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.modalTitleText} numberOfLines={1}>
                {currentPhoto?.title || 'Gallery Photo'}
              </Text>

              <TouchableOpacity
                onPress={() => currentPhoto && handleDownloadPhoto(currentPhoto)}
                style={styles.modalActionBtn}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              >
                <Ionicons name="download-outline" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Horizontal Image Swiper (Disabled during zoom to eliminate gesture conflicts) */}
            <FlatList
              ref={modalFlatListRef}
              data={activeFilteredItems}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              scrollEnabled={!isModalZoomed}
              initialScrollIndex={selectedIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setSelectedIndex(idx);
              }}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.slideItem}>
                  <PinchZoomImage
                    uri={buildCloudinaryUrl(item.imageUrl, {
                      quality: 'auto',
                      format: 'auto',
                      width: 1200,
                      height: 1200,
                      crop: 'fit',
                    })}
                    onZoomStateChange={setIsModalZoomed}
                  />
                </View>
              )}
            />

            {/* Modal Footer */}
            {currentPhoto && (
              <View style={styles.modalFooterBox}>
                <View style={styles.footerRow}>
                  <Text style={styles.modalCaptionTitle} numberOfLines={1}>
                    {currentPhoto.title}
                  </Text>
                  <Text style={styles.counterText}>
                    {selectedIndex + 1} / {activeFilteredItems.length}
                  </Text>
                </View>
                <View style={styles.badgeRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{currentPhoto.category}</Text>
                  </View>
                </View>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6B1D2A',
  },
  headerContainer: {
    backgroundColor: '#6B1D2A',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A202C',
  },
  tabBarWrapper: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabLabel: {
    color: '#6B1D2A',
    fontWeight: '800',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 2,
    width: '40%',
    height: 3,
    backgroundColor: '#6B1D2A',
    borderRadius: 2,
  },
  body: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  categoryPage: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  listContent: {
    paddingBottom: 40,
  },
  skeletonGridContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BEE3F8',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cooldownText: {
    fontSize: 12.5,
    color: '#2B6CB0',
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 14,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9B2C2C',
  },
  errorBannerSub: {
    fontSize: 11.5,
    color: '#C53030',
    marginTop: 2,
  },
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#F0F4F8',
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3748',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#718096',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Modal Safe Area & Swiper Styling */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.96)',
  },
  modalSafeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 10,
  },
  modalActionBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalTitleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  slideItem: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooterBox: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalCaptionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 10,
  },
  counterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  badgeRow: {
    flexDirection: 'row',
  },
  categoryBadge: {
    backgroundColor: '#6B1D2A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
