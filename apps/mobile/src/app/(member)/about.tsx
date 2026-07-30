import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  BackHandler,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, APP } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const VALUES = [
  { icon: 'people-outline' as const, title: 'Community', desc: 'Building strong bonds among Maheshwari families in Ranchi and beyond.' },
  { icon: 'school-outline' as const, title: 'Education', desc: 'Supporting academic excellence and skill development for youth.' },
  { icon: 'heart-outline' as const, title: 'Service', desc: 'Dedicated to social welfare, charity, and community upliftment.' },
  { icon: 'trophy-outline' as const, title: 'Culture', desc: 'Preserving and celebrating our rich Maheshwari heritage and traditions.' },
];

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(member)/settings');
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

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[0]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.orgName}>{APP.orgName}</Text>
          <Text style={styles.city}>{APP.city}</Text>
          <Text style={styles.motto}>{APP.mottoHindi}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Story</Text>
          <Text style={styles.body}>
            Maheshwari Yuva Sangathan (MYS) Ranchi is a vibrant community organization
            dedicated to bringing together Maheshwari youth for social, cultural, and
            educational activities. Founded with the vision of strengthening community
            bonds, MYS Ranchi organizes events, seminars, sports activities, and
            cultural programs throughout the year.
          </Text>
          <Text style={styles.body}>
            Our mission is to foster unity, encourage personal development, and create
            a supportive network for Maheshwari families in Ranchi and surrounding areas.
            We believe in the power of community and strive to make a positive impact
            through collective action and shared values.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Values</Text>
          {VALUES.map((v, i) => (
            <View key={i} style={styles.valueRow}>
              <View style={styles.valueIcon}>
                <Ionicons name={v.icon} size={22} color={Colors.primary[500]} />
              </View>
              <View style={styles.valueContent}>
                <Text style={styles.valueTitle}>{v.title}</Text>
                <Text style={styles.valueDesc}>{v.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What We Do</Text>
          <View style={styles.bulletList}>
            {[
              'Annual cultural festivals and celebrations',
              'Youth leadership and skill development programs',
              'Sports tournaments and fitness initiatives',
              'Charitable drives and social welfare activities',
              'Educational scholarships and mentorship',
              'Networking events and business forums',
            ].map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success.main} style={{ marginRight: 8 }} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>{APP.name}</Text>
          <Text style={styles.footerTagline}>{APP.tagline}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary[500], paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.neutral[0] },
  content: { paddingBottom: 40 },
  heroCard: {
    backgroundColor: Colors.primary[500], paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center',
  },
  orgName: {
    fontSize: 22, fontWeight: '800', color: Colors.neutral[0], textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  city: { fontSize: 14, color: Colors.secondary[300], marginTop: 4, fontWeight: '600' },
  motto: { fontSize: 16, color: Colors.secondary[400], marginTop: 8, fontWeight: '600' },
  section: { backgroundColor: Colors.neutral[0], padding: Spacing.md, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.text.primary, marginBottom: 12 },
  body: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22, marginBottom: 10 },
  valueRow: {
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16,
  },
  valueIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(128,0,32,0.08)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  valueContent: { flex: 1 },
  valueTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  valueDesc: { fontSize: 13, color: Colors.text.secondary, marginTop: 2, lineHeight: 18 },
  bulletList: { gap: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bulletText: { fontSize: 14, color: Colors.text.secondary, flex: 1, lineHeight: 20 },
  footerCard: {
    alignItems: 'center', paddingVertical: 24, marginTop: 10,
    backgroundColor: Colors.neutral[0],
  },
  footerText: { fontSize: 16, fontWeight: '800', color: Colors.primary[500] },
  footerTagline: { fontSize: 12, color: Colors.text.tertiary, marginTop: 4 },
});
