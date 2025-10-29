import React, { useState } from "react";
import { StyleSheet, TextInput, Alert, TouchableOpacity } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

import request from "@/lib/request";

export default function TabTwoScreen() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    async function loginSubmit() {
        if (!username || !password) return Alert.alert("Missing username or password");

        type PartialUser = {
            token: string;
            username: string;
            name: string;
            role: number;
        }

        const result = await request<PartialUser>("users/login", "POST", {
            username: username,
            password: password,
        });

        if (result.success) {
            // non students accounts cant use this app
            if (result.data.role !== 0) {
                Alert.alert("You don't have access");
            } else {
                await SecureStore.setItemAsync("token", result.data.token);
                Alert.alert("Successfully logged in");
            };
        } else {
            Alert.alert(result.error);
        };
    }

    return (
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
            headerImage={
                <IconSymbol size={310} color="#808080" name="chevron.left.forwardslash.chevron.right" style={styles.headerImage} />
            }>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>Login</ThemedText>
            </ThemedView>
            <ThemedText>Login to get started.</ThemedText>

            <ThemedText type="subtitle">Username</ThemedText>
            <TextInput value={username} onChangeText={setUsername} style={{ backgroundColor: "#222", color: "#ffffff", fontSize: 18 }} />

            <ThemedText type="subtitle">Password</ThemedText>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry={true} style={{ backgroundColor: "#222", color: "#ffffff", fontSize: 18 }} />

            <TouchableOpacity onPress={loginSubmit}>
                <ThemedText type="link">Login</ThemedText>
            </TouchableOpacity>
      </ParallaxScrollView>
    );
}

const styles = StyleSheet.create({
    headerImage: {
        color: '#808080',
        bottom: -90,
        left: -35,
        position: 'absolute',
    },
    titleContainer: {
        flexDirection: 'row',
        gap: 8,
    },
});
