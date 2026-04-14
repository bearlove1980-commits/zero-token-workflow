import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * 進捗バー。progress は 0.0 〜 1.0。
 */
export default function ProgressBar({ progress, label }) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={styles.wrapper}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.label}>
        {label ?? `${Math.round(pct * 100)}%`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
  },
  track: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#2b6cb0',
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    color: '#555',
    textAlign: 'right',
  },
});
