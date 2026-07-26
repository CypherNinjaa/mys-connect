import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Modal,
  BackHandler,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { EventCardSkeleton } from '../../components/ui/SkeletonLoader';

type Category = 'ALL' | 'GENERAL' | 'IMPORTANT' | 'CIRCULAR';

export default function NoticesScreen() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>('ALL');
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);

  // Android Hardware Back Navigation Handler
  useEffect(() => {
    const onBackPress = () => {
      if (selectedNotice) {
        setSelectedNotice(null);
        return true;
      }
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [selectedNotice, router]);

  const fetchNotices = async () => {
    try {
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          const res = await ApiService.getNotices(token, activeCategory);
          setNotices(res || []);
        }
      }
    } catch (err) {
      console.error('Fetch notices error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      setLoading(true);
      void fetchNotices();
    } else {
      setLoading(false);
    }
  }, [activeCategory, isSignedIn]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchNotices();
  };

  return (
    <View style={styles.container}>
      {/* Category Tabs Header — Matching Wireframe 09 */}
      <View style={styles.tabContainer}>
        {(['ALL', 'GENERAL', 'IMPORTANT', 'CIRCULAR'] as Category[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tabButton, activeCategory === cat && styles.tabButtonActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.tabText, activeCategory === cat && styles.tabTextActive]}>
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notices List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary[500]]} />}
      >
        {loading ? (
          <>
            <EventCardSkeleton />
            <EventCardSkeleton />
          </>
        ) : notices.length > 0 ? (
          notices.map((notice) => {
            const dateStr = notice.publishedAt || notice.createdAt
              ? new Date(notice.publishedAt || notice.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Today';

            return (
              <TouchableOpacity
                key={notice.id}
                style={[styles.noticeCard, notice.isPinned && styles.pinnedNoticeCard]}
                onPress={() => setSelectedNotice(notice)}
              >
                <View style={styles.noticeIconWrapper}>
                  <Ionicons
                    name={notice.type === 'IMPORTANT' ? 'warning' : 'document-text'}
                    size={22}
                    color={notice.type === 'IMPORTANT' ? Colors.secondary[500] : Colors.primary[500]}
                  />
                </View>

                <View style={styles.noticeInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.noticeTitle} numberOfLines={1}>
                      {notice.title}
                    </Text>
                    {notice.isPinned && <Text style={styles.pinTag}>📌 Pinned</Text>}
                  </View>

                  <Text style={styles.noticeExcerpt} numberOfLines={2}>
                    {notice.content}
                  </Text>
                  <Text style={styles.noticeDate}>{dateStr}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No notices in this category</Text>
            <Text style={styles.emptySub}>Official organization circulars will be published here</Text>
          </View>
        )}
      </ScrollView>

      {/* Notice Detail Modal */}
      <Modal visible={Boolean(selectedNotice)} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedNotice?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedNotice(null)}>
                <Ionicons name="close-circle" size={24} color={Colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalDate}>
                Published: {selectedNotice?.publishedAt ? new Date(selectedNotice.publishedAt).toLocaleDateString('en-IN') : 'Recent'}
              </Text>
              <Text style={styles.modalText}>{selectedNotice?.content}</Text>
            </ScrollView>
          </View>
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
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: Spacing.md,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  pinnedNoticeCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary[500],
  },
  noticeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  noticeInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  pinTag: {
    fontSize: 11,
    color: Colors.secondary[600],
    fontWeight: '700',
    marginLeft: 6,
  },
  noticeExcerpt: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  noticeDate: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary[500],
    flex: 1,
    marginRight: 10,
  },
  modalBody: {
    marginTop: 12,
  },
  modalDate: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 22,
  },
});
