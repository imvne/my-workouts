import { useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderHandlers,
  type PanResponderInstance,
} from 'react-native';

import { colors } from '@/constants/theme';

type Props<T> = {
  items: T[];
  keyOf: (item: T) => string;
  onMove: (from: number, to: number) => void;
  /** `handle` est null quand le tri est désactivé (liste filtrée par ex.). */
  renderItem: (item: T, index: number, handle: GestureResponderHandlers | null) => ReactNode;
  enabled?: boolean;
};

/** Liste réordonnable : on attrape la poignée et on fait glisser l'élément. */
export function DragList<T>({ items, keyOf, onMove, renderItem, enabled = true }: Props<T>) {
  const layouts = useRef<Record<string, { y: number; h: number }>>({});
  const responders = useRef<Record<string, PanResponderInstance>>({});
  const dy = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState<string | null>(null);

  // Les gestes vivent plus longtemps qu'un rendu : on lit l'état courant via des refs.
  const latest = useRef({ items, keyOf, onMove });
  latest.current = { items, keyOf, onMove };

  const finish = (key: string, delta: number) => {
    const { items: list, keyOf: k, onMove: move } = latest.current;
    const keys = list.map(k);
    const from = keys.indexOf(key);
    const me = layouts.current[key];
    if (from >= 0 && me) {
      const center = me.y + me.h / 2 + delta;
      let to = 0;
      keys.forEach((other, i) => {
        const l = layouts.current[other];
        if (i !== from && l && l.y + l.h / 2 < center) to++;
      });
      if (to !== from) move(from, to);
    }
    dy.setValue(0);
    setDragging(null);
  };

  const responderFor = (key: string) =>
    (responders.current[key] ??= PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dy.setValue(0);
        setDragging(key);
      },
      onPanResponderMove: (_, g) => dy.setValue(g.dy),
      onPanResponderRelease: (_, g) => finish(key, g.dy),
      onPanResponderTerminate: (_, g) => finish(key, g.dy),
    }));

  return (
    <View>
      {items.map((item, index) => {
        const key = keyOf(item);
        const active = dragging === key;
        return (
          <Animated.View
            key={key}
            onLayout={(e) => {
              layouts.current[key] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
            }}
            style={active ? [styles.dragging, { transform: [{ translateY: dy }] }] : undefined}
          >
            {renderItem(item, index, enabled ? responderFor(key).panHandlers : null)}
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Poignée « molette » : 2 × 3 points. */
export function Grip({ handlers }: { handlers: GestureResponderHandlers | null }) {
  if (!handlers) return <View style={styles.gripSpacer} />;
  return (
    <View {...handlers} accessibilityLabel="Déplacer" style={[styles.grip, webGrab]}>
      {[0, 1, 2].map((r) => (
        <View key={r} style={styles.gripRow}>
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      ))}
    </View>
  );
}

// Propriétés web (curseur, pas de sélection ni de scroll pendant le glisser).
const webGrab = { cursor: 'grab', userSelect: 'none', touchAction: 'none' } as object;

const styles = StyleSheet.create({
  dragging: {
    zIndex: 10,
    backgroundColor: colors.white,
    opacity: 0.96,
    boxShadow: '0 6px 16px rgba(24, 24, 27, 0.12)',
  },
  grip: { width: 22, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 3 },
  gripSpacer: { width: 8 },
  gripRow: { flexDirection: 'row', gap: 3 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textLight },
});
