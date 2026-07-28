import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  BackHandler,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DownloadItem {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  fileType: 'pdf' | 'doc' | 'xls' | 'img' | 'other';
  fileSize?: string;
  category: string;
}

// Placeholder downloads — in production these come from API
const STATIC_DOWNLOADS: DownloadItem[] = [
  {
    id: '1',
    title: 'MYS Constitution',
    description: 'Official constitution and bylaws of Maheshwari Yuva Sangathan, Ranchi.',
    fileUrl: 'https://mysranchi.org/downloads/constitution.pdf',
    fileType: 'pdf',
    fileSize: '2.4 MB',
    category: 'Documents',
  },
  {
    id: '2',
    title: 'Membership Form',
    description: 'Application form for new member registration.',
    fileUrl: 'https://mysranchi.org/downloads/membership-form.pdf',
    fileType: 'pdf',
    fileSize: '540 KB',
    category: 'Forms',
  },
  {
    id: '3',
    title: 'Annual Report 2024-25',
    description: 'Yearly activity report and financial summary.',
    fileUrl: 'https://mysranchi.org/downloads/annual-report-2024.pdf',
    fileType: 'pdf',
    fileSize: '5.1 MB',
    category: 'Reports',
  },
  {
    id: '4',
    title: 'Event Calendar 2025-26',
    description: 'Upcoming events and important dates.',
    fileUrl: 'https://mysranchi.org/downloads/calendar-2025.pdf',
    fileType: 'pdf',
    fileSize: '1.2 MB',
    category: 'Documents',
  },
];

const FILE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pdf: 'document-text',
  doc: 'document',
  xls: 'grid',
  img: 'image',
  other: 'attach',
};

const FILE_COLORS: Record<string, string> = {
  pdf: '#E53E3E',
  doc: '#3182CE',
  xls: '#38A169',
  img: '#805AD5',
  other: '#718096',
};

export default function DownloadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [downloads] = useState<DownloadItem[]>(STATIC_DOWNLOADS);
  const [refreshing, setRefreshing] = useState(false);

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

  const categories = [...new Set(downloads.map((d) => d.category))];

  const handleDownload = (item: DownloadItem) => {
    Linking.openURL(item.fileUrl).catch(() => {
      // Could not open URL
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[0]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Downloads</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 500);
            }}
            colors={[Colors.primary[500]]}
          />
        }
      >
        {downloads.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="download-outline" size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No Downloads Available</Text>
            <Text style={styles.emptyDesc}>Check back later for downloadable documents.</Text>
          </View>
        ) : (
          categories.map((cat) => (
            <View key={cat} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{cat}</Text>
              {downloads
                .filter((d) => d.category === cat)
                .map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.downloadCard}
                    onPress={() => handleDownload(item)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.fileIcon,
                        { backgroundColor: `${FILE_COLORS[item.fileType] || FILE_COLORS.other}15` },
                      ]}
                    >
                      <Ionicons
                        name={FILE_ICONS[item.fileType] || FILE_ICONS.other}
                        size={22}
                        color={FILE_COLORS[item.fileType] || FILE_COLORS.other}
                      />
                    </View>
                    <View style={styles.downloadInfo}>
                      <Text style={styles.downloadTitle}>{item.title}</Text>
                      <Text style={styles.downloadDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                      {item.fileSize && (
                        <Text style={styles.fileSize}>{item.fileSize}</Text>
                      )}
                    </View>
                    <Ionicons name="download-outline" size={20} color={Colors.primary[500]} />
                  </TouchableOpacity>
                ))}
            </View>
          ))
        )}
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
  content: { padding: Spacing.md, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginTop: 12 },
  emptyDesc: { fontSize: 13, color: Colors.text.tertiary, marginTop: 4 },
  categorySection: { marginBottom: 20 },
  categoryTitle: {
    fontSize: 12, fontWeight: '700', color: Colors.text.tertiary, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  downloadCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0],
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EDF2F7', elevation: 1,
  },
  fileIcon: {
    width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  downloadInfo: { flex: 1 },
  downloadTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  downloadDesc: { fontSize: 12, color: Colors.text.secondary, marginTop: 2, lineHeight: 16 },
  fileSize: { fontSize: 11, color: Colors.text.tertiary, marginTop: 4, fontWeight: '600' },
});
