import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { COLORS } from '@/constants/theme';

const RECHECK_MS = 60_000; // don't hit the update server more than once a minute

/**
 * Toast shown at the top of the screen when an over-the-air update (eas update) is found.
 *   1. "Downloading update…"            while the new version is being fetched
 *   2. "Update ready" + [Restart]       once it is stored and can be applied
 * Does nothing in Expo Go / dev mode, where expo-updates is disabled.
 */
export function UpdateToast() {
  const insets = useSafeAreaInsets();
  const { isUpdatePending, isDownloading, isUpdateAvailable, downloadProgress } = Updates.useUpdates();
  const [dismissed, setDismissed] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const lastCheck = useRef(0);
  const [slide] = useState(() => new Animated.Value(0)); // 0 = hidden, 1 = shown

  // Re-check for updates whenever the app returns to the foreground.
  useEffect(() => {
    if (!Updates.isEnabled) return;
    const check = async () => {
      if (Date.now() - lastCheck.current < RECHECK_MS) return;
      lastCheck.current = Date.now();
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // offline or server unreachable — stay silent, the app is offline-first
      }
    };
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') check(); });
    return () => sub.remove();
  }, []);

  const mode: 'downloading' | 'ready' | null = isUpdatePending
    ? 'ready'
    : isDownloading || isUpdateAvailable
      ? 'downloading'
      : null;
  const visible = Updates.isEnabled && mode !== null && !(mode === 'ready' && dismissed);

  useEffect(() => {
    Animated.spring(slide, { toValue: visible ? 1 : 0, useNativeDriver: true, bounciness: 6 }).start();
  }, [visible, slide]);

  const restart = async () => {
    setRestarting(true);
    try {
      await Updates.reloadAsync();
    } catch {
      setRestarting(false);
    }
  };

  const pct = typeof downloadProgress === 'number' ? ` ${Math.round(downloadProgress * 100)}%` : '';

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.wrap,
        { top: insets.top + 8, opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }] },
      ]}
    >
      <View style={styles.toast}>
        <Ionicons name={mode === 'ready' ? 'gift' : 'cloud-download'} size={22} color="#fff" />
        <View style={styles.textCol}>
          <Text style={styles.title}>{mode === 'ready' ? 'Update ready! 🍊' : `Downloading update…${pct}`}</Text>
          <Text style={styles.sub}>{mode === 'ready' ? 'Restart to get the latest version.' : 'You can keep using the app.'}</Text>
        </View>
        {mode === 'ready' && (
          <>
            <TouchableOpacity style={styles.later} onPress={() => setDismissed(true)} disabled={restarting}>
              <Text style={styles.laterText}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.restart} onPress={restart} disabled={restarting}>
              <Text style={styles.restartText}>{restarting ? '…' : 'Restart'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 1000, elevation: 10 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.navy, borderRadius: 18,
    paddingVertical: 12, paddingHorizontal: 14, borderWidth: 2, borderColor: COLORS.primary,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  textCol: { flex: 1 },
  title: { color: '#fff', fontWeight: '800', fontSize: 14 },
  sub: { color: COLORS.border, fontSize: 11, marginTop: 1 },
  later: { paddingHorizontal: 8, paddingVertical: 6 },
  laterText: { color: COLORS.border, fontWeight: '700', fontSize: 13 },
  restart: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  restartText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});