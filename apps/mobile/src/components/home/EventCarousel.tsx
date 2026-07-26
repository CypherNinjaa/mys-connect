import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeaturedEvent } from '../../services/homeService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_WIDTH = SCREEN_WIDTH - 32;

interface EventCarouselProps {
  events: FeaturedEvent[];
  onRegisterPress?: (event: FeaturedEvent) => void;
}

export function EventCarousel({ events, onRegisterPress }: EventCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Display max 4 items in carousel
  const displayEvents = (events || []).slice(0, 4);

  // Infinite smooth auto-scroll every 4 seconds
  useEffect(() => {
    if (displayEvents.length <= 1) return;

    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % displayEvents.length;
        try {
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        } catch {
          // Ignore index scroll out-of-range bounds
        }
        return nextIndex;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [displayEvents.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    if (slideSize > 0) {
      const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
      if (index >= 0 && index < displayEvents.length && index !== activeIndex) {
        setActiveIndex(index);
      }
    }
  };

  if (displayEvents.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyCard}>
          <Ionicons name="calendar-outline" size={32} color="#A0AEC0" />
          <Text style={styles.emptyCardText}>No featured events available right now.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displayEvents}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={CAROUSEL_WIDTH}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: CAROUSEL_WIDTH,
          offset: CAROUSEL_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <View style={styles.leftContent}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {item.title}
                </Text>

                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={15} color="#6B1D2A" style={styles.icon} />
                  <Text style={styles.infoText}>{item.date}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={15} color="#6B1D2A" style={styles.icon} />
                  <Text style={styles.infoText} numberOfLines={2}>
                    {item.venue}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.registerBtn}
                  onPress={() => onRegisterPress?.(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.registerBtnText}>{item.actionText || 'Register Now'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rightContent}>
                <Image source={{ uri: item.image }} style={styles.bannerImage} resizeMode="cover" />
              </View>
            </View>
          </View>
        )}
      />

      {/* Pagination Dots */}
      <View style={styles.paginationRow}>
        {displayEvents.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              idx === activeIndex ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: -54,
    marginBottom: 20,
  },
  cardContainer: {
    width: CAROUSEL_WIDTH,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F4F8',
    elevation: 3,
  },
  emptyCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginTop: 8,
  },
  leftContent: {
    flex: 1,
    paddingRight: 10,
    justifyContent: 'space-between',
  },
  rightContent: {
    width: '42%',
    height: 148,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F7FAFC',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 8,
    lineHeight: 23,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#4A5568',
    flex: 1,
  },
  registerBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#6B1D2A',
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  registerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B1D2A',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#6B1D2A',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#CBD5E0',
  },
});
