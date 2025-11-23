"use client";

import React, { useEffect, useState } from "react";
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Redirect, useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/button';

import DESTINATIONS from "@/lib/locations/destinations";
import CLASSROOMS from "@/lib/locations/classrooms";

import request from "@/lib/request";
import { type User, type Pass } from "@/lib/types";
import CountdownTimer from "@/components/countdown";

export default function HomeScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [passes, setPasses] = useState<Pass[]>([]);
    const [loading, setLoading] = useState(true);

    const router = useRouter();

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

    async function completePass(pass_id: string) {
        const result = await request<Pass>(`passes/${pass_id}/complete`, "POST");
        if (result.success) {
            const index = passes.findIndex(x => x._id === pass_id);
            const new_passes = [...passes];
            new_passes[index] = result.data;
            setPasses(new_passes);
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
                <ThemedText type="subtitle">Welcome, {user.name}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.stepContainer}>
                <Button onPress={() => router.replace("/create_pass")}>Create Pass</Button>
                <Button onPress={async() => {
                    await SecureStore.deleteItemAsync("token")
                    router.replace("/login");
                }}>Logout</Button>
            </ThemedView>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="subtitle">Active Pass</ThemedText>
            </ThemedView>
            {passes.reverse().filter(x => !x.completed_at).map(pass => <TouchableOpacity onPress={() => router.replace(`/modal?passId=${pass._id}`)} key={pass._id}>
                <ThemedView style={styles.passContainer}>
                    <ThemedText type="subtitle">{DESTINATIONS.find(x => x.id === pass.destination)?.name ?? pass.destination}</ThemedText>
                    <ThemedText type="default">{pass.origin} • {Math.round(pass.duration / (1000 * 60))} minutes • <CountdownTimer end_time={new Date(pass.created_at).getTime() + pass.duration} /></ThemedText>
                    <ThemedText type="small">Expires {new Date(new Date(pass.created_at).getTime() + pass.duration).toLocaleTimeString()}</ThemedText>
                    <Button onPress={async() => await completePass(pass._id)}>Complete</Button>
                </ThemedView>
            </TouchableOpacity>) ?? <ThemedText>No active pass</ThemedText>}
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
