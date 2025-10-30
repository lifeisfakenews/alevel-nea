"use client";

import React, { useEffect, useState } from "react";
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Redirect, useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import request from "@/lib/request";
import { type User, type Pass } from "@/lib/types";

export default function PassesScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [passes, setPasses] = useState<Pass[]>([]);
    const [loading, setLoading] = useState(true);
    
    useFocusEffect(() => {
        async function fetchUser() {
            const result = await request<User>("users/@me", "GET");
            if (result.success) setUser(result.data);
            else setUser(null);

            const passes_result = await request<Pass[]>("passes", "GET");
            if (passes_result.success) setPasses(passes_result.data);
            else setPasses([]);

            setLoading(false);
        }
        fetchUser();
    });

    if (loading) return <ThemedText>Loading...</ThemedText>;
    
    if (!user) return <Redirect href="/login" />;

    if (!passes.length) return <ThemedText>No passes created</ThemedText>;

    return (
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
            headerImage={
                <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
            }>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="subtitle">Your passes ({passes.length ?? 0})</ThemedText>
            </ThemedView>
            {passes.reverse().map(pass => <ThemedView style={styles.stepContainer} key={pass._id}>
                <ThemedText type="subtitle">{pass.location}</ThemedText>
                <ThemedText type="default">{Math.round(pass.duration / (1000 * 60))} minutes</ThemedText>
                <ThemedText type="small">
                    Created {new Date(pass.created_at).toLocaleString()} • 
                    {pass.state === "active" ? <ThemedText type="link">Active</ThemedText> : ""}
                </ThemedText>
            </ThemedView>)}
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
