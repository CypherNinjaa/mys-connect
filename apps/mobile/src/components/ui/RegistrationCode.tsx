import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';

/**
 * Characters that look like one another in most fonts.
 *
 * The server mints codes from an alphabet that excludes every one of these, so
 * a fresh code can never contain them. They are still checked here because a
 * ticket issued before that rule existed — or backfilled by hand — can, and a
 * volunteer reading such a code aloud at the gate needs the warning more than
 * anyone.
 */
const AMBIGUOUS = new Set(['O', '0', 'I', '1', 'L']);

const MONOSPACE = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

type CodeSize = 'sm' | 'md' | 'lg';

const SIZES: Record<CodeSize, { fontSize: number; padH: number; padV: number; gap: number }> = {
  sm: { fontSize: 14, padH: 2, padV: 1, gap: 0 },
  md: { fontSize: 20, padH: 3, padV: 2, gap: 1 },
  lg: { fontSize: 26, padH: 4, padV: 3, gap: 1 },
};

export interface RegistrationCodeProps {
  /** The code as issued, e.g. `MYS-A3K9-7QW2`. Renders a placeholder when absent. */
  code?: string | null;
  size?: CodeSize;
  /** Show the "letters / digits" key and the excluded-character note. */
  showLegend?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A registration code rendered one character at a time, letters and digits in
 * different colours.
 *
 * Read aloud at a gate, `MYS-B8QD-4NRZ` is a string of near-homophones. Colour
 * splits it into two visual classes so the member and the volunteer can agree
 * on what they are looking at without spelling out every character.
 */
export function RegistrationCode({
  code,
  size = 'md',
  showLegend = false,
  style,
}: RegistrationCodeProps) {
  const metrics = SIZES[size];

  const characters = useMemo(() => (code ? Array.from(code.toUpperCase()) : []), [code]);

  if (characters.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.placeholder, { fontSize: metrics.fontSize - 6 }]}>
          Code not issued
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.codeRow}>
        {characters.map((char, index) => {
          const isSeparator = char === '-';
          const isDigit = char >= '0' && char <= '9';
          const isAmbiguous = AMBIGUOUS.has(char);

          return (
            <Text
              // Characters repeat inside a code, so the index is the identity here.
              key={`${char}-${index}`}
              style={[
                styles.char,
                {
                  fontSize: metrics.fontSize,
                  paddingHorizontal: metrics.padH,
                  paddingVertical: metrics.padV,
                  marginHorizontal: metrics.gap,
                },
                isSeparator && styles.separator,
                !isSeparator && (isDigit ? styles.digit : styles.letter),
                isAmbiguous && styles.ambiguous,
              ]}
            >
              {char}
            </Text>
          );
        })}
      </View>

      {showLegend && (
        <View style={styles.legendWrap}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#6B1D2A' }]} />
            <Text style={styles.legendText}>Letters</Text>
            <View style={[styles.legendDot, { backgroundColor: '#2B6CB0', marginLeft: 14 }]} />
            <Text style={styles.legendText}>Digits</Text>
          </View>
          <Text style={styles.legendNote}>
            Codes never contain O, 0, I, 1 or L — so there is nothing to mix up.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  char: {
    fontFamily: MONOSPACE,
    fontWeight: '800',
    borderRadius: 4,
    overflow: 'hidden',
  },
  letter: {
    color: '#6B1D2A',
  },
  digit: {
    color: '#2B6CB0',
  },
  separator: {
    color: '#A0AEC0',
    fontWeight: '600',
  },
  ambiguous: {
    color: '#975A16',
    backgroundColor: '#FEFCBF',
  },
  placeholder: {
    color: '#A0AEC0',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  legendWrap: {
    marginTop: 10,
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
  },
  legendNote: {
    fontSize: 10.5,
    color: '#A0AEC0',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 15,
  },
});
