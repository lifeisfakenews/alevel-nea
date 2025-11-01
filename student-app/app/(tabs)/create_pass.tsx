"use client";

import React, { useEffect, useState } from "react";
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Redirect, useRouter } from "expo-router";
import { useFocusEffect } from '@react-navigation/native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/button';

import request from "@/lib/request";
import { type User, type Pass } from "@/lib/types";

export default function CreatePassScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [location, setLocation] = useState("");
    const [duration, setDuration] = useState("");

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

    async function formSubmit() {
        if (!location || !duration) return Alert.alert("Missing location or duration");

        const result = await request<Pass>("passes", "PUT", {
            location: location,
            duration: parseInt(duration) * 60 * 1000,
        });

        if (result.success) {
            router.replace("/");
        } else {
            Alert.alert(result.error);
        };
    }
    
    return (
        <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
            headerImage={
                <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
            }>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="subtitle">Create a Pass</ThemedText>
            </ThemedView>
            <ThemedView style={styles.stepContainer}>
                <ThemedText type="subtitle">Location</ThemedText>
                <TextInput value={location} onChangeText={setLocation} style={{ backgroundColor: "#555", color: "#ffffff", borderRadius: 10,fontSize: 18 }} />

                <ThemedText type="subtitle">Duration (minutes)</ThemedText>
                <TextInput inputMode="numeric" value={duration} onChangeText={setDuration} style={{ backgroundColor: "#555", borderRadius: 10, color: "#ffffff", fontSize: 18 }} />

                <Button onPress={formSubmit}>Create Pass</Button>
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
