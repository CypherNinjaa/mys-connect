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
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { MemberCardSkeleton } from '../../components/ui/SkeletonLoader';

const CITIES = ['All', 'Jaipur', 'Jodhpur', 'Kota', 'Udaipur', 'Ranchi'];

export default function MemberDirectoryScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCity, setActiveCity] = useState('All');
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMembers = async () => {
    try {
      const token = (await getToken()) || undefined;
      const res = await ApiService.getMembers(token, search, activeCity);
      setMembers(res?.members || []);
    } catch (err) {
      console.error('Fetch members error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      void fetchMembers();
    }, 300); // 300ms debounce for search
    return () => clearTimeout(timer);
  }, [search, activeCity, isSignedIn]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchMembers();
  };

  return (
    <View style={styles.container}>
      {/* Search Input Bar — Wireframe 04 */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search-outline" size={20} color="#718096" style={styles.searchIcon} />
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

      {/* City Filter Chips — Wireframe 04 */}
      <View style={styles.cityChipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityChipsScroll}>
          {CITIES.map((city) => (
            <TouchableOpacity
              key={city}
              style={[styles.cityChip, activeCity === city && styles.cityChipActive]}
              onPress={() => setActiveCity(city)}
            >
              <Text style={[styles.cityChipText, activeCity === city && styles.cityChipTextActive]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Members Directory List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary[500]]} />}
      >
        {loading ? (
          <>
            <MemberCardSkeleton />
            <MemberCardSkeleton />
            <MemberCardSkeleton />
            <MemberCardSkeleton />
          </>
        ) : members.length > 0 ? (
          members.map((member) => {
            const profile = member.profile;
            const cityName = profile?.city?.name || 'Ranchi';
            const stateName = profile?.state || 'Jharkhand';
            const occupation = profile?.occupation || 'Member';

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
                  <Text style={styles.memberName}>{member.fullName || 'Amit Maheshwari'}</Text>
                  <Text style={styles.memberLocation}>
                    {cityName}, {stateName}
                  </Text>
                  <Text style={styles.memberOccupation}>{occupation}</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No members found</Text>
            <Text style={styles.emptySub}>Try searching with a different name or city filter</Text>
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
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
  },
  cityChipsContainer: {
    paddingVertical: 10,
  },
  cityChipsScroll: {
    paddingHorizontal: Spacing.md,
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cityChipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  cityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  cityChipTextActive: {
    color: Colors.neutral[0],
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 24,
  },
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: Colors.secondary[500],
    fontSize: 18,
    fontWeight: '800',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  memberLocation: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  memberOccupation: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 1,
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
