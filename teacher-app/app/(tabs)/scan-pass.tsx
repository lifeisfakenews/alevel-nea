"use client";

import React, { useEffect, useState } from "react";
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Redirect, useRouter } from "expo-router";
import { useFocusEffect } from '@react-navigation/native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import request from "@/lib/request";
import { type User, type Pass } from "@/lib/types";
import QrScanner from "@/components/scanner";

export default function HomeScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [pass, setPass] = useState<Pass | null>(null);
    const [loading, setLoading] = useState(true);
    
    const router = useRouter();

    if (loading) return <ThemedText>Loading...</ThemedText>;    
    if (!user) return <Redirect href="/login" />;


    useFocusEffect(() => {
        async function fetchUser() {
            const result = await request<User>("users/@me", "GET");
            if (result.success) setUser(result.data);
            else setUser(null);

            setLoading(false);
        }
        fetchUser();
    });


    if (!pass) return <ParallaxScrollView
            headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
            headerImage={
                <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
            }>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="subtitle">Pass Verification</ThemedText>
                <ThemedText>Please scan a pass QR code to verify it</ThemedText>
                <QrScanner />
            </ThemedView>
      </ParallaxScrollView>

    return (
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
            headerImage={
                <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
            }>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="subtitle">Pass details here</ThemedText>
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
