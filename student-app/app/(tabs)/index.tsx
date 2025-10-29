"use client";

import React, { useEffect, useState } from "react";
import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';

import request from "@/lib/request";
import { type User } from "@/lib/types";

export default function HomeScreen() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        async function fetchUser() {
            const result = await request<User>("users/@me", "GET");
            if (result.success) setUser(result.data);
            else setUser(null);
        }

        fetchUser();
    }, []);

    return (
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
            headerImage={
                <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
            }>
            <ThemedView style={styles.titleContainer}>
                {user ? <ThemedText type="subtitle">Welcome, {user.name}</ThemedText> : <ThemedText type="subtitle">Not logged in</ThemedText>}
            </ThemedView>
            <ThemedView style={styles.stepContainer}>
                <TouchableOpacity>
                    <ThemedText type="link">Create Pass</ThemedText>
                </TouchableOpacity>
            </ThemedView>
      </ParallaxScrollView>
    );
}

const styles = StyleSheet.create({
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stepContainer: {
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
