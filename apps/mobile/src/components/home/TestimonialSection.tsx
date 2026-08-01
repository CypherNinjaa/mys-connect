import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';

export interface TestimonyItem {
  id: string;
  authorName: string;
  designation?: string | null;
  content: string;
  imageUrl?: string | null;
  sortOrder?: number;
}

interface TestimonialSectionProps {
  testimonies: TestimonyItem[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Match exact content width of Home Screen (paddingHorizontal: 16 on home)
const CAROUSEL_WIDTH = SCREEN_WIDTH - 32;

export function TestimonialSection({ testimonies }: TestimonialSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedTestimony, setSelectedTestimony] = useState<TestimonyItem | null>(null);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const userInteractionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = testimonies || [];

  // Auto Infinite Carousel - slides every 3.5s, pauses when user touches/scrolls
  useEffect(() => {
    if (items.length <= 1 || isUserInteracting) return;

    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % items.length;
        try {
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        } catch {
          // Ignore range errors
        }
        return nextIndex;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [items.length, isUserInteracting]);

  // Clean up user interaction timer on unmount
  useEffect(() => {
    return () => {
      if (userInteractionTimerRef.current) {
        clearTimeout(userInteractionTimerRef.current);
      }
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    if (slideSize > 0) {
      const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
      if (index >= 0 && index < items.length && index !== activeIndex) {
        setActiveIndex(index);
      }
    }
  };

  const handleScrollBeginDrag = () => {
    setIsUserInteracting(true);
    if (userInteractionTimerRef.current) {
      clearTimeout(userInteractionTimerRef.current);
    }
  };

  const handleScrollEndDrag = () => {
    // Resume auto-scroll 5 seconds after user finishes dragging
    if (userInteractionTimerRef.current) {
      clearTimeout(userInteractionTimerRef.current);
    }
    userInteractionTimerRef.current = setTimeout(() => {
      setIsUserInteracting(false);
    }, 5000);
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="chatbox-ellipses" size={18} color="#6B1D2A" />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Leadership Quotes & Stories</Text>
            <Text style={styles.sectionSubtitle}>Words of inspiration from MYS leaders</Text>
          </View>
        </View>
      </View>

      {/* Auto Infinite FlatList Carousel */}
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        snapToInterval={CAROUSEL_WIDTH}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: CAROUSEL_WIDTH,
          offset: CAROUSEL_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => {
          const isLongText = item.content.length > 180;
          const displayContent = isLongText
            ? `${item.content.substring(0, 180)}...`
            : item.content;

          return (
            <View style={styles.cardContainer}>
              <View style={styles.card}>
                {/* Top Author Header */}
                <View style={styles.authorHeaderRow}>
                  <View style={styles.authorRow}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitial}>{item.authorName[0] || 'U'}</Text>
                      </View>
                    )}

                    <View style={styles.authorInfo}>
                      <Text style={styles.authorName} numberOfLines={1}>
                        {item.authorName}
                      </Text>
                      {item.designation && (
                        <Text style={styles.authorDesignation} numberOfLines={1}>
                          {item.designation}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.quoteIconBadge}>
                    <Ionicons name="chatbox-ellipses" size={22} color="#D4A017" />
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Quote Content */}
                <Text style={styles.quoteText}>{displayContent}</Text>

                {isLongText && (
                  <TouchableOpacity
                    onPress={() => setSelectedTestimony(item)}
                    activeOpacity={0.7}
                    style={styles.readMoreBtn}
                  >
                    <Text style={styles.readMoreText}>Read Full Message</Text>
                    <Ionicons name="chevron-forward" size={14} color="#6B1D2A" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Paginated Dots */}
      {items.length > 1 && (
        <View style={styles.dotsContainer}>
          {items.map((_, idx) => (
            <View
              key={idx}
              style={[styles.dot, idx === activeIndex ? styles.activeDot : styles.inactiveDot]}
            />
          ))}
        </View>
      )}

      {/* Full Message Modal */}
      {selectedTestimony && (
        <Modal
          visible={Boolean(selectedTestimony)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedTestimony(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Ionicons name="chatbox-ellipses" size={28} color="#D4A017" />
                <TouchableOpacity
                  onPress={() => setSelectedTestimony(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#718096" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalQuoteText}>{selectedTestimony.content}</Text>
              </ScrollView>

              <View style={styles.modalAuthorRow}>
                {selectedTestimony.imageUrl ? (
                  <Image source={{ uri: selectedTestimony.imageUrl }} style={styles.modalAvatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{selectedTestimony.authorName[0] || 'U'}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName}>{selectedTestimony.authorName}</Text>
                  {selectedTestimony.designation && (
                    <Text style={styles.authorDesignation}>{selectedTestimony.designation}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setSelectedTestimony(null)}
                style={styles.modalDoneBtn}
              >
                <Text style={styles.modalDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEB2B2',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 1,
  },
  cardContainer: {
    width: CAROUSEL_WIDTH,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  quoteIconBadge: {
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 14,
    color: '#2D3748',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B1D2A',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 14,
  },
  authorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#D4A017',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(107,29,42,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(107,29,42,0.2)',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6B1D2A',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A202C',
  },
  authorDesignation: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4A017',
    marginTop: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#6B1D2A',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#CBD5E0',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 10,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalScrollView: {
    marginVertical: 14,
    maxHeight: 260,
  },
  modalQuoteText: {
    fontSize: 15,
    color: '#2D3748',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  modalAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#D4A017',
  },
  modalDoneBtn: {
    backgroundColor: '#6B1D2A',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
