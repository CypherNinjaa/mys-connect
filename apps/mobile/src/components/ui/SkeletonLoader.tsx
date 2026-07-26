import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonItem({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function MemberCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonItem width={50} height={50} borderRadius={25} />
      <View style={styles.cardContent}>
        <SkeletonItem width="60%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
        <SkeletonItem width="40%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
        <SkeletonItem width="30%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function EventCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonItem width={54} height={54} borderRadius={12} />
      <View style={styles.cardContent}>
        <SkeletonItem width="75%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
        <SkeletonItem width="50%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
        <SkeletonItem width="40%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.profileContainer}>
      <View style={styles.profileHeader}>
        <SkeletonItem width={84} height={84} borderRadius={42} style={{ marginBottom: 12 }} />
        <SkeletonItem width="50%" height={20} borderRadius={6} style={{ marginBottom: 8 }} />
        <SkeletonItem width="35%" height={14} borderRadius={4} />
      </View>
      <View style={styles.cardSection}>
        <SkeletonItem width="100%" height={80} borderRadius={12} style={{ marginBottom: 12 }} />
        <SkeletonItem width="100%" height={120} borderRadius={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E2E8F0',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  profileContainer: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cardSection: {
    marginTop: 12,
  },
});
