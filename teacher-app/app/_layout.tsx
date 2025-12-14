import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Redirect, Stack, useRouter } from 'expo-router';
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

if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("alerts_attempt_thrice", {
        name: "Alerts (3)",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#06c1c1",
    });
}


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

export default function RootLayout() {
    const colorScheme = useColorScheme();

    const router = useRouter();
    
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

    useEffect(() => {
        const subscription = Notifications.addNotificationResponseReceivedListener(async(response) => {
            const action = response.actionIdentifier;
            const data = response.notification.request.content.data;

            if (action === "resolve") {
                const result = await request<null>(`groupings/${data._id}/resolve`, "POST");
                if (!result.success) {
                    // these are expected errors, the UI should just treat it like its been dismissed correctly
                    if (result.error === "Grouping already resolved" || result.error === "Grouping not found") {
                        await Notifications.dismissNotificationAsync(response.notification.request.identifier);
                    } else {
                        console.log("Failed to mark grouping resolved");
                    };
                } else {
                    console.log("Successfully marked grouping resolved");
                    await Notifications.dismissNotificationAsync(response.notification.request.identifier);
                };
            } else if (action === "detail") {
                //send the user to an info page
                router.push(`/group?_id=${data._id}`);
            };
        });
        return () => subscription.remove();
    }, []);

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="group" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
        </ThemeProvider>
    );
}
