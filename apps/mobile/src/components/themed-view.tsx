import { View, type ViewProps } from 'react-native';
import { Colors } from '../constants/theme';

export type ThemedViewProps = ViewProps & {
  backgroundColor?: string;
};

export function ThemedView({ style, backgroundColor, ...otherProps }: ThemedViewProps) {
  return <View style={[{ backgroundColor: backgroundColor || Colors.background.primary }, style]} {...otherProps} />;
}
