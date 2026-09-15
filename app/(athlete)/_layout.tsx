import { Stack } from 'expo-router';

import { colors, fonts } from '@/constants/theme';

export default function AthleteLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.bodyBold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mon bloc' }} />
      <Stack.Screen name="history" options={{ title: 'Historique' }} />
      <Stack.Screen name="session/[id]/index" options={{ title: 'Séance' }} />
      <Stack.Screen
        name="session/[id]/run"
        options={{ title: 'En cours', headerBackVisible: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
