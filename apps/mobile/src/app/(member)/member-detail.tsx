import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) { router.back(); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    async function fetch() {
      try {
        const token = (await getToken()) || undefined;
        const data = await ApiService.getMemberById(token, id);
        setMember(data);
      } catch (err) {
        console.error('Fetch member detail error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) void fetch();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="person-outline" size={48} color={Colors.neutral[400]} />
        <Text style={styles.emptyText}>Member not found</Text>
      </View>
    );
  }

  const profile = member.profile || {};
  const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Member';
  const cityName = profile.city?.name || '';

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[0]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Profile</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(profile.firstName?.[0] || '') + (profile.lastName?.[0] || '')}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.role}>{member.role || 'MEMBER'}</Text>
          {cityName ? <Text style={styles.city}>{cityName}</Text> : null}
        </View>

        {profile.phone && (
          <InfoRow
            icon="call-outline"
            label="Phone"
            value={profile.phone}
            onPress={() => Linking.openURL(`tel:${profile.phone}`)}
          />
        )}
        {member.email && (
          <InfoRow
            icon="mail-outline"
            label="Email"
            value={member.email}
            onPress={() => Linking.openURL(`mailto:${member.email}`)}
          />
        )}
        {profile.address && <InfoRow icon="location-outline" label="Address" value={profile.address} />}
        {profile.occupation && <InfoRow icon="briefcase-outline" label="Occupation" value={profile.occupation} />}
        {profile.organization && <InfoRow icon="business-outline" label="Organization" value={profile.organization} />}
        {profile.bio && (
          <View style={styles.bioCard}>
            <Text style={styles.bioLabel}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary[500]} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  emptyText: { fontSize: 14, color: Colors.text.tertiary, marginTop: 12 },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary[500], paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.neutral[0] },
  content: { paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: Colors.neutral[0], marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  avatarPlaceholder: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primary[500],
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarInitials: { color: Colors.neutral[0], fontSize: 28, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text.primary },
  role: { fontSize: 12, color: Colors.primary[500], fontWeight: '600', marginTop: 4 },
  city: { fontSize: 13, color: Colors.text.secondary, marginTop: 2 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0],
    paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDF2F7',
  },
  infoIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(128,0,32,0.08)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },
  infoValue: { fontSize: 14, color: Colors.text.primary, marginTop: 2 },
  bioCard: {
    backgroundColor: Colors.neutral[0], padding: Spacing.md, marginTop: 12,
    borderTopWidth: 1, borderTopColor: '#EDF2F7',
  },
  bioLabel: { fontSize: 12, color: Colors.text.tertiary, fontWeight: '600', marginBottom: 6 },
  bioText: { fontSize: 14, color: Colors.text.secondary, lineHeight: 20 },
});
