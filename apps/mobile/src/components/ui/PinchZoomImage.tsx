import React, { useRef } from 'react';
import { View, Animated, PanResponder, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PinchZoomImageProps {
  uri: string;
  width?: number;
  height?: number;
}

export function PinchZoomImage({ uri, width = SCREEN_WIDTH, height = SCREEN_HEIGHT * 0.7 }: PinchZoomImageProps) {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Saved offset values
  const currentScale = useRef(1);
  const initialPinchDistance = useRef<number | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.numberActiveTouches === 2 || currentScale.current > 1.05;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          // @ts-ignore
          x: pan.x._value || 0,
          // @ts-ignore
          y: pan.y._value || 0,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          // Pinch Zoom gesture logic for Android & iOS
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (initialPinchDistance.current === null) {
            initialPinchDistance.current = distance;
          } else {
            const factor = distance / initialPinchDistance.current;
            const newScale = Math.max(1, Math.min(4, currentScale.current * factor));
            scale.setValue(newScale);
          }
        } else if (touches.length === 1 && currentScale.current > 1.05) {
          // Pan image when zoomed in
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        initialPinchDistance.current = null;

        // @ts-ignore
        const finalScale = scale._value || 1;
        currentScale.current = finalScale;

        if (finalScale < 1) {
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
          currentScale.current = 1;
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Animated.Image
        source={{ uri }}
        style={[
          styles.image,
          { width, height },
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: scale },
            ],
          },
        ]}
        resizeMode="contain"
      />
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
