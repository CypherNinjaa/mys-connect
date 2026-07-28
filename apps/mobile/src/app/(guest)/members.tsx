import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { MemberCardSkeleton } from '../../components/ui/SkeletonLoader';

export default function GuestMembersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(guest)/home');
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  const fetchMembers = async () => {
    try {
      const res = await ApiService.getMembers(undefined, search);
      setMembers(res?.members || []);
    } catch (err) {
      console.error('Guest fetch members error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void fetchMembers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={20} color="#718096" style={{ marginRight: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor="#A0AEC0"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#718096" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMembers(); }} colors={[Colors.primary[500]]} />}
      >
        {loading ? (
          <>
            <MemberCardSkeleton />
            <MemberCardSkeleton />
            <MemberCardSkeleton />
          </>
        ) : members.length > 0 ? (
          members.map((member) => {
            const profile = member.profile;
            const cityName = profile?.city?.name || '';
            return (
              <View key={member.id} style={styles.memberCard}>
                <View style={styles.avatarCircle}>
                  {member.avatarUrl ? (
                    <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitials}>
                      {member.fullName ? member.fullName[0].toUpperCase() : 'M'}
                    </Text>
                  )}
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.fullName || 'Member'}</Text>
                  {cityName ? <Text style={styles.memberLocation}>{cityName}</Text> : null}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No members found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text.primary },
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: 24, paddingTop: 12 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: Spacing.md,
    marginBottom: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { color: Colors.secondary[500], fontSize: 16, fontWeight: '800' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
  memberLocation: { fontSize: 12, color: Colors.text.secondary, marginTop: 2 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginTop: 12 },
});
