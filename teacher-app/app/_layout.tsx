import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { registerForPushNotifications } from '@/lib/notifications';
import request from '@/lib/request';
import { User } from '@/lib/types';

export const unstable_settings = {
  anchor: '(tabs)',
};

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

Notifications.setNotificationCategoryAsync("grouping_alert", [
    {
        identifier: "detail",
        buttonTitle: "View Details",
        options: { opensAppToForeground: true }
    },
    {
        identifier: "resolve",
        buttonTitle: "Mark Resolved",
        options: { opensAppToForeground: false }
    }
]).then(() => console.log("Successfully registered notification category"));

if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("alerts_attempt_thrice", {
        name: "Alerts (3)",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#06c1c1",
    });
}

export default function RootLayout() {
    const colorScheme = useColorScheme();

    useEffect(() => {
        async function fetchToken() {
            const token = await registerForPushNotifications();

            const result = await request<User>("users/@me/push-token", "POST", {
                push_token: token,
            });

            if (result.success) console.log("Successfully registered for push notifications");
        }
        fetchToken();
    }, []);

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}
