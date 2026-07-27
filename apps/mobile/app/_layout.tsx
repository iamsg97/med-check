import { ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { View } from "react-native";

import { MedicinesProvider } from "@/medicines/MedicinesProvider";
import { ThemeProvider, toNavigationTheme, useTheme } from "@/theme";

// The Sage Serenity screens draw their own header (title + actions), so the
// native stack header stays hidden and we only theme the scene background.
function ThemedStack() {
  const { colors, isDark } = useTheme();

  const navigationTheme = useMemo(
    () => toNavigationTheme(colors, isDark),
    [colors, isDark],
  );

  return (
    // React Navigation paints its container with the navigation theme's
    // background during transitions; without this the light default shows as a
    // flash when a modal is dismissed in dark mode.
    <NavigationThemeProvider value={navigationTheme}>
      {/* Backstop behind the navigator, so the window background can never
          show through mid-animation. */}
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="add-medicine" options={{ presentation: "modal" }} />
          <Stack.Screen name="medicine/[id]" options={{ presentation: "modal" }} />
        </Stack>
      </View>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <MedicinesProvider>
        <ThemedStack />
      </MedicinesProvider>
    </ThemeProvider>
  );
}
