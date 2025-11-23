"use client";

import React, { useEffect, useState } from "react";
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Redirect, useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/button';

import request from "@/lib/request";
import { type User, type Pass } from "@/lib/types";

export default function HomeScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

    useFocusEffect(() => {
        async function fetchUser() {
            const result = await request<User>("users/@me", "GET");
            if (result.success) setUser(result.data);
            else setUser(null);

            setLoading(false);
        }
        fetchUser();
    });

    if (loading) return <ThemedText>Loading...</ThemedText>;
    
    if (!user) return <Redirect href="/login" />;

    async function toggleDutyStatus() {
        const result = await request<User>("users/@me/duty-status", "POST", {
            on_duty: !user!.on_duty,
        });
        if (result.success) {
            setUser(result.data);
        } else {
            Alert.alert(result.error);
        };
    };

    async function triggerLocalTest() {
        console.log("Triggering local test");
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Local Test",
                body: "If you see buttons here, the issue is the server.",
                categoryIdentifier: "grouping_alert",
                data: { test: true },
            },
            trigger: {
                channelId: "alerts_attempt_thrice",
            },
        });
    }

    return (
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
            headerImage={
                <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
            }>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="subtitle">Welcome, {user.name}</ThemedText>
                <ThemedText type="defaultSemiBold">You are currently {user.on_duty ? "on duty" : "off duty"}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.stepContainer}>
                <Button onPress={() => toggleDutyStatus()}>{user.on_duty ? "Stop Duty" : "Start Duty"}</Button>
                <Button onPress={() => router.replace("/scan-pass")}>Verify Pass</Button>
                <Button onPress={triggerLocalTest}>Send Test Notification</Button>
                <Button onPress={async() => {
                    await SecureStore.deleteItemAsync("token")
                    setUser(null);
                    router.replace("/")
                }}>Logout</Button>
            </ThemedView>
      </ParallaxScrollView>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        gap: 8,
    },
    stepContainer: {
        gap: 8,
        marginBottom: 8,
    },
    passContainer: {
        backgroundColor: '#222',
        padding: 8,
        gap: 8,
        marginBottom: 8,
    },
    reactLogo: {
        height: 178,
        width: 290,
        bottom: 0,
        left: 0,
        position: 'absolute',
    },
});
