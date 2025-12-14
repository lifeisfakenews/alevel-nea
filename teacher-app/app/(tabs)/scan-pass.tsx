"use client";

import React, { useEffect, useState } from "react";
import { Image } from 'expo-image';
import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Redirect, useRouter } from "expo-router";
import { useFocusEffect } from '@react-navigation/native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/button';
import QrScanner from "@/components/scanner";

import request from "@/lib/request";
import { type User, type Pass } from "@/lib/types";
import DESTINATIONS from "@/lib/locations/destinations";

export default function ScanPassScreen() {
    const [user, setUser] = useState<User | null>(null);
    const [pass, setPass] = useState<Pass | null>(null);
    const [student, setStudent] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(() => {
        async function fetchUser() {
            const result = await request<User>("users/@me", "GET");
            if (result.success) setUser(result.data);
            else setUser(null);

            setLoading(false);
        }
        fetchUser();
    });

    async function onBarcodeScanned(data: string) {
        const pass_request = await request<Pass>(`passes/${data}`, "GET");
        if (pass_request.success) setPass(pass_request.data);
        else Alert.alert(pass_request.error);

        if (!pass_request.success) return; 
        const student_request = await request<User>(`users/${pass_request.data.user_id}`, "GET");
        if (student_request.success) setStudent(student_request.data);
        else Alert.alert(student_request.error);
    }

    if (loading) return <ThemedText>Loading...</ThemedText>;    
    if (!user) return <Redirect href="/login" />;

    if (!pass) return <ParallaxScrollView
            headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
            headerImage={
                <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
            }>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="subtitle">Pass Verification</ThemedText>
                <ThemedText>Please scan a pass QR code to verify it</ThemedText>
            </ThemedView>
            <QrScanner onBarcodeScanned={onBarcodeScanned} />
      </ParallaxScrollView>

    return (
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
            headerImage={
                <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
            }>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="subtitle">Pass Verification</ThemedText>
            </ThemedView>
            <ThemedView style={styles.passContainer} key={pass._id}>
                <ThemedText type="subtitle">{DESTINATIONS.find(x => x.id === pass.destination)?.name ?? pass.destination}</ThemedText>
                <ThemedText type="default">{pass.origin} • {Math.round(pass.duration / (1000 * 60))} minutes</ThemedText>
                <ThemedText type="default">{student?.name ?? pass.user_id}</ThemedText>
                <ThemedText type="small">
                    Created {new Date(pass.created_at).toLocaleString()} • 
                    {pass.completed_at ? "" : <ThemedText type="link"> Active</ThemedText>}
                </ThemedText>
            </ThemedView>

            <Button onPress={() => setPass(null)}>Scan another pass</Button>
      </ParallaxScrollView>
    ); 
}

const styles = StyleSheet.create({
    titleContainer: {
        gap: 8,
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
