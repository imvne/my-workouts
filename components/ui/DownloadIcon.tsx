import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

type Props = { color?: string; size?: number; direction?: 'down' | 'up' };

/** Flèche (bas = télécharger, haut = importer) au-dessus d'un plateau, dessinée en Views. */
export function DownloadIcon({ color = colors.pinkDeep, size = 20, direction = 'down' }: Props) {
  const stroke = 2;
  const up = direction === 'up';
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <View style={{ height: size * 0.6, alignItems: 'center', justifyContent: up ? 'flex-start' : 'flex-end' }}>
        {up && (
          <View
            style={{
              width: size * 0.42,
              height: size * 0.42,
              borderLeftWidth: stroke,
              borderTopWidth: stroke,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginBottom: -size * 0.3,
            }}
          />
        )}
        <View style={{ width: stroke, height: size * 0.5, backgroundColor: color, borderRadius: 1 }} />
        {!up && (
          <View
            style={{
              width: size * 0.42,
              height: size * 0.42,
              borderRightWidth: stroke,
              borderBottomWidth: stroke,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginTop: -size * 0.34,
            }}
          />
        )}
      </View>
      <View
        style={[
          styles.tray,
          { width: size * 0.8, height: size * 0.3, borderColor: color, borderWidth: stroke, marginTop: size * 0.08 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tray: {
    borderTopWidth: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
