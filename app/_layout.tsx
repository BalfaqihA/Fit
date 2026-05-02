import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/auth';
import { CommunityProvider } from '@/contexts/community';
import { OnboardingProvider } from '@/contexts/onboarding';
import { PlanProvider } from '@/contexts/plan';
import { ThemeProvider } from '@/contexts/theme';
import { UserProfileProvider } from '@/contexts/user-profile';
import { WorkoutSessionProvider } from '@/contexts/workout-session';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useUserProfile } from '@/hooks/use-user-profile';
import {
  dismissNotificationSoftPrompt,
  requestNotificationPermissionOnce,
  scheduleWeeklyWeighIn,
  shouldShowNotificationSoftPrompt,
} from '@/lib/notifications';

function ThemedStatusBar() {
  const { colorScheme } = useTheme();
  return <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />;
}

function WeighInScheduler() {
  const { user } = useAuth();
  const { profile, hydrated } = useUserProfile();
  const armed = useRef(false);

  useEffect(() => {
    if (!user || !hydrated || armed.current) return;
    if (!profile.weightKg) return; // wait for onboarding to set baseline
    armed.current = true;

    const enable = async () => {
      const granted = await requestNotificationPermissionOnce();
      if (granted) await scheduleWeeklyWeighIn();
    };

    (async () => {
      const showSoftPrompt = await shouldShowNotificationSoftPrompt();
      if (!showSoftPrompt) {
        // Either previously granted, previously asked, or OS won't allow asking again.
        // Still try the no-op path in case permission was granted out-of-band.
        await enable();
        return;
      }

      Alert.alert(
        'Stay on track',
        'Get a weekly nudge to log your weight so your dashboard stays accurate. You can turn this off anytime in Settings.',
        [
          {
            text: 'Not now',
            style: 'cancel',
            onPress: () => {
              dismissNotificationSoftPrompt();
            },
          },
          {
            text: 'Enable',
            onPress: async () => {
              await dismissNotificationSoftPrompt();
              await enable();
            },
          },
        ],
      );
    })();
  }, [user, hydrated, profile.weightKg]);

  return null;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const { COLORS } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    // segments[0] is undefined at "/" (welcome screen, app/index.tsx).
    const root = segments[0] as string | undefined;
    const isRootIndex = !root;
    const isAuthRoute = root === 'auth';

    if (!user) {
      // Not signed in: only the welcome screen and /auth/* are allowed.
      if (!isRootIndex && !isAuthRoute) {
        router.replace('/auth/login');
      }
      return;
    }

    // Signed in: bounce away from the welcome and /auth/* screens.
    if (isRootIndex || isAuthRoute) {
      router.replace('/(tabs)');
    }
  }, [user, initializing, segments, router]);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.bg,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserProfileProvider>
          <PlanProvider>
            <OnboardingProvider>
              <CommunityProvider>
                <WorkoutSessionProvider>
                  <AuthGate>
                    <WeighInScheduler />
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen name="auth" />
                      <Stack.Screen name="onboarding" />
                      <Stack.Screen name="workout" />
                      <Stack.Screen name="community" />
                      <Stack.Screen name="dashboard" />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                    </Stack>
                  </AuthGate>
                  <ThemedStatusBar />
                </WorkoutSessionProvider>
              </CommunityProvider>
            </OnboardingProvider>
          </PlanProvider>
        </UserProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
