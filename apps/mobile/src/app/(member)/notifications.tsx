import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { SkeletonItem } from '../../components/ui/SkeletonLoader';

export default function NotificationsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
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
  }, [getToken, isSignedIn]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
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

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Notifications Inbox</Text>
        {notifications.some((n) => n.status !== 'READ') && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markReadText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary[500]]} />}
      >
        {loading ? (
          <>
            <SkeletonItem width="100%" height={70} borderRadius={12} style={{ marginBottom: 10 }} />
            <SkeletonItem width="100%" height={70} borderRadius={12} style={{ marginBottom: 10 }} />
            <SkeletonItem width="100%" height={70} borderRadius={12} style={{ marginBottom: 10 }} />
          </>
        ) : notifications.length > 0 ? (
          notifications.map((notif) => {
            const isUnread = notif.status !== 'READ';
            const dateStr = notif.createdAt
              ? new Date(notif.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            return (
              <View
                key={notif.id}
                style={[styles.notifCard, isUnread && styles.unreadCard]}
              >
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="notifications"
                    size={20}
                    color={isUnread ? Colors.primary[500] : Colors.neutral[500]}
                  />
                </View>

                <View style={styles.notifBody}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.notifTitle, isUnread && styles.unreadText]}>
                      {notif.title}
                    </Text>
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifMessage}>{notif.body}</Text>
                  <Text style={styles.notifDate}>{dateStr}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySub}>You will receive alerts for events, notices, and approvals here</Text>
          </View>
        )}
      </ScrollView>
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
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary[500],
  },
  scrollContent: {
    padding: Spacing.md,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: Spacing.md,
    marginBottom: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  unreadCard: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEB2B2',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
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
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  unreadText: {
    fontWeight: '800',
    color: Colors.primary[900],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[500],
    marginLeft: 6,
  },
  notifMessage: {
    fontSize: 13,
    color: Colors.text.secondary,
    marginTop: 4,
    lineHeight: 18,
  },
  notifDate: {
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
});
