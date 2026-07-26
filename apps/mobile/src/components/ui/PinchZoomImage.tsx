import React from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
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

  return (
    <View style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        <Animated.Image
          source={{ uri }}
          style={[styles.image, { width, height }, animatedStyle]}
          resizeMode="contain"
        />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    alignSelf: 'center',
  },
});
