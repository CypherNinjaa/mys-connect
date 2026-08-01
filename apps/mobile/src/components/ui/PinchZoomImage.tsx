import React, { useState } from 'react';
import { StyleSheet, Dimensions, View, Text, ActivityIndicator } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  clamp,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PinchZoomImageProps {
  uri: string;
  width?: number;
  height?: number;
  onZoomStateChange?: (isZoomed: boolean) => void;
}

export function PinchZoomImage({
  uri,
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT * 0.7,
  onZoomStateChange,
}: PinchZoomImageProps) {
  // A remote image that is still in flight, or that failed outright, would
  // otherwise leave an indistinguishable black rectangle — the same symptom as
  // the collapsed-layout bug. Track both so the viewer can say which it is.
  const [isLoading, setIsLoading] = useState(true);
  const [hasFailed, setHasFailed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const notifyZoomState = (isZoomed: boolean) => {
    if (onZoomStateChange) {
      onZoomStateChange(isZoomed);
    }
  };

  // Double Tap Gesture to toggle zoom (1x <-> 2.5x)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_event, success) => {
      'worklet';
      if (success) {
        if (scale.value > 1.2) {
          scale.value = withTiming(1, { duration: 250 });
          savedScale.value = 1;
          translateX.value = withTiming(0, { duration: 250 });
          translateY.value = withTiming(0, { duration: 250 });
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
          if (onZoomStateChange) runOnJS(notifyZoomState)(false);
        } else {
          scale.value = withTiming(2.5, { duration: 250 });
          savedScale.value = 2.5;
          if (onZoomStateChange) runOnJS(notifyZoomState)(true);
        }
      }
    });

  // Smooth Pinch-to-Zoom Gesture (1x - 4x)
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      'worklet';
      if (onZoomStateChange) runOnJS(notifyZoomState)(true);
    })
    .onUpdate((event) => {
      'worklet';
      const newScale = savedScale.value * event.scale;
      scale.value = clamp(newScale, 0.8, 4.5);
    })
    .onEnd(() => {
      'worklet';
      if (scale.value < 1.05) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        if (onZoomStateChange) runOnJS(notifyZoomState)(false);
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
        if (onZoomStateChange) runOnJS(notifyZoomState)(true);
      } else {
        savedScale.value = scale.value;
        if (onZoomStateChange) runOnJS(notifyZoomState)(scale.value > 1.05);
      }
    });

  // Pan Gesture (only active when zoomed in > 1x)
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onUpdate((event) => {
      'worklet';
      if (savedScale.value > 1.05) {
        const boundX = (width * (savedScale.value - 1)) / 2;
        const boundY = (height * (savedScale.value - 1)) / 2;
        translateX.value = clamp(savedTranslateX.value + event.translationX, -boundX, boundX);
        translateY.value = clamp(savedTranslateY.value + event.translationY, -boundY, boundY);
      }
    })
    .onEnd(() => {
      'worklet';
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Compose Gestures
  const composedGesture = Gesture.Race(
    doubleTapGesture,
    Gesture.Simultaneous(pinchGesture, panGesture)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (hasFailed) {
    return (
      <View style={styles.container}>
        <View style={styles.stateBox}>
          <Ionicons name="cloud-offline-outline" size={44} color="#A0AEC0" />
          <Text style={styles.stateTitle}>Image unavailable</Text>
          <Text style={styles.stateSub}>Check your connection and try again.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.Image
          source={{ uri }}
          style={[styles.image, { width, height }, animatedStyle]}
          resizeMode="contain"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasFailed(true);
          }}
        />
      </GestureDetector>

      {isLoading && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // `flex: 1` rather than `height: '100%'`. A percentage height resolves
    // against the parent's *resolved* height, and inside a horizontal FlatList
    // the content container has none — so '100%' collapsed this view to zero
    // and the image silently disappeared.
    flex: 1,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    alignSelf: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateBox: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  stateTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  stateSub: {
    marginTop: 4,
    fontSize: 12.5,
    color: '#A0AEC0',
    textAlign: 'center',
  },
});
