import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  BackHandler,
  Modal,
  Image,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { SkeletonItem } from '../../components/ui/SkeletonLoader';

export default function NotificationsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD' | 'URGENT'>('ALL');
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(member)/home');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  const fetchNotifications = async () => {
    try {
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          const res = await ApiService.getNotifications(token);
          setNotifications(res || []);
        }
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // The loader is awaited inside the effect rather than called from its body,
    // so its setState calls land after the first paint instead of cascading.
    async function run() {
      if (isSignedIn) {
        await fetchNotifications();
      } else {
        setLoading(false);
      }
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      const token = await getToken();
      if (token) {
        await ApiService.markAllNotificationsRead(token);
        await fetchNotifications();
      }
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleNotificationPress = async (notif: any) => {
    setSelectedNotif(notif);
    if (notif.status !== 'READ') {
      try {
        const token = await getToken();
        if (token) {
          await ApiService.markNotificationRead(token, notif.id);
          // Locally mark as read
          setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, status: 'READ' } : n))
          );
        }
      } catch (err) {
        console.error('Mark read error:', err);
      }
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (activeTab === 'UNREAD') return notif.status !== 'READ';
    if (activeTab === 'URGENT') {
      const p = notif.data?.priority || '';
      return p === 'URGENT' || p === 'HIGH' || notif.data?.type === 'EMERGENCY';
    }
    return true;
  });

  const unreadCount = notifications.filter((n) => n.status !== 'READ').length;

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.headerTitle}>Notifications Inbox</Text>
          {unreadCount > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn}>
            <Ionicons name="checkmark-done-outline" size={16} color={Colors.primary[500]} />
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs Bar */}
      <View style={styles.filterBar}>
        {[
          { key: 'ALL', label: 'All Alerts' },
          { key: 'UNREAD', label: `Unread (${unreadCount})` },
          { key: 'URGENT', label: 'Urgent' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={[styles.filterChip, activeTab === tab.key && styles.activeFilterChip]}
          >
            <Text style={[styles.filterChipText, activeTab === tab.key && styles.activeFilterChipText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary[500]]} />}
      >
        {loading ? (
          <>
            <SkeletonItem width="100%" height={75} borderRadius={14} style={{ marginBottom: 10 }} />
            <SkeletonItem width="100%" height={75} borderRadius={14} style={{ marginBottom: 10 }} />
            <SkeletonItem width="100%" height={75} borderRadius={14} style={{ marginBottom: 10 }} />
          </>
        ) : filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => {
            const isUnread = notif.status !== 'READ';
            const priority = notif.data?.priority || 'MEDIUM';
            const notifType = notif.data?.type || 'GENERAL';
            const isUrgent = priority === 'URGENT' || notifType === 'EMERGENCY';
            const isEvent = notifType === 'EVENT_ALERT';

            const dateStr = notif.createdAt
              ? new Date(notif.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            return (
              <TouchableOpacity
                key={notif.id}
                onPress={() => handleNotificationPress(notif)}
                activeOpacity={0.8}
                style={[
                  styles.notifCard,
                  isUnread && styles.unreadCard,
                  isUrgent && styles.urgentCard,
                ]}
              >
                {/* Icon Circle */}
                <View
                  style={[
                    styles.iconCircle,
                    isUrgent
                      ? styles.urgentIconCircle
                      : isEvent
                      ? styles.eventIconCircle
                      : isUnread
                      ? styles.unreadIconCircle
                      : styles.defaultIconCircle,
                  ]}
                >
                  <Ionicons
                    name={isUrgent ? 'warning' : isEvent ? 'calendar' : 'megaphone'}
                    size={18}
                    color={isUrgent ? '#C53030' : isEvent ? '#2B6CB0' : isUnread ? Colors.primary[500] : Colors.neutral[600]}
                  />
                </View>

                {/* Body */}
                <View style={styles.notifBody}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.notifTitle, isUnread && styles.unreadText]} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifMessage} numberOfLines={2}>
                    {notif.body}
                  </Text>
                  <View style={styles.footerRow}>
                    <Text style={styles.notifDate}>{dateStr}</Text>
                    {isUrgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentBadgeText}>URGENT</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="notifications-off-outline" size={44} color={Colors.neutral[400]} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'UNREAD'
                ? 'All caught up!'
                : activeTab === 'URGENT'
                ? 'No urgent alerts'
                : 'No notifications yet'}
            </Text>
            <Text style={styles.emptySub}>
              You will receive instant alerts for important notices, events, and approvals here.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Notification Detail Modal */}
      {selectedNotif && (
        <Modal
          visible={Boolean(selectedNotif)}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedNotif(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <Ionicons
                    name={
                      selectedNotif.data?.priority === 'URGENT'
                        ? 'warning'
                        : selectedNotif.data?.type === 'EVENT_ALERT'
                        ? 'calendar'
                        : 'megaphone'
                    }
                    size={24}
                    color="#6B1D2A"
                  />
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedNotif.title}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedNotif(null)} style={styles.closeIconBtn}>
                  <Ionicons name="close" size={20} color="#718096" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalDate}>
                Published:{' '}
                {selectedNotif.createdAt
                  ? new Date(selectedNotif.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Recently'}
              </Text>

              <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalBodyText}>{selectedNotif.body}</Text>
              </ScrollView>

              <View style={styles.modalFooter}>
                {selectedNotif.data?.eventId && (
                  <TouchableOpacity
                    onPress={() => {
                      const id = selectedNotif.data.eventId;
                      setSelectedNotif(null);
                      router.push(`/(member)/event-detail?id=${id}&from=notifications`);
                    }}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>View Event Details</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setSelectedNotif(null)} style={styles.closeModalBtn}>
                  <Text style={styles.closeModalBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  badgeCount: {
    backgroundColor: '#6B1D2A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary[500],
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EDF2F7',
  },
  activeFilterChip: {
    backgroundColor: '#6B1D2A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    borderRadius: 14,
    padding: Spacing.md,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unreadCard: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEB2B2',
  },
  urgentCard: {
    borderColor: '#E53E3E',
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  urgentIconCircle: { backgroundColor: '#FED7D7' },
  eventIconCircle: { backgroundColor: '#EBF8FF' },
  unreadIconCircle: { backgroundColor: 'rgba(107,29,42,0.1)' },
  defaultIconCircle: { backgroundColor: '#EDF2F7' },
  notifBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  unreadText: {
    fontWeight: '900',
    color: '#6B1D2A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6B1D2A',
    marginLeft: 6,
  },
  notifMessage: {
    fontSize: 13,
    color: '#4A5568',
    marginTop: 4,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  notifDate: {
    fontSize: 11,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  urgentBadge: {
    backgroundColor: '#E53E3E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
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
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
    paddingBottom: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
    flex: 1,
  },
  closeIconBtn: {
    padding: 4,
  },
  modalDate: {
    fontSize: 11,
    color: '#718096',
    marginVertical: 8,
    fontWeight: '600',
  },
  modalBodyScroll: {
    marginVertical: 10,
    maxHeight: 250,
  },
  modalBodyText: {
    fontSize: 14,
    color: '#2D3748',
    lineHeight: 22,
  },
  modalFooter: {
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  actionBtn: {
    backgroundColor: '#6B1D2A',
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  closeModalBtn: {
    backgroundColor: '#EDF2F7',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#4A5568',
    fontSize: 13,
    fontWeight: '700',
  },
});
