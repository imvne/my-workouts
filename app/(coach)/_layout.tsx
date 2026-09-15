import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function CoachLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Espace coach' }} />
    </Stack>
  );
}
