import React, { useState } from "react";
import { StyleSheet, TextInput, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from "expo-router";

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/components/button';

import request from "@/lib/request";

export default function LoginModal() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    async function loginUser(username: string, password: string) {
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
            // students accounts cant use this app
            if (result.data.role === 0) {
                Alert.alert("You don't have access");
            } else {
                await SecureStore.setItemAsync("token", result.data.token);
                return router.replace("/");
            };
        } else {
            Alert.alert(result.error);
        };
    };

    async function loginSubmit() {
        if (!username || !password) return Alert.alert("Missing username or password");
        await loginUser(username, password);
    };

    return (
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
            headerImage={
                <IconSymbol size={310} color="#808080" name="login" style={styles.headerImage} />
            }>
            <ThemedView>
                <ThemedText type="title">Login</ThemedText>

                <ThemedText type="subtitle">Username</ThemedText>
                <TextInput value={username} onChangeText={setUsername} style={{ backgroundColor: "#555", borderRadius: 10, color: "#ffffff", fontSize: 18 }} autoComplete="username" textContentType="username" autoCapitalize="none" importantForAutofill="yes" returnKeyType="next" />

                <ThemedText type="subtitle">Password</ThemedText>
                <TextInput value={password} onChangeText={setPassword} secureTextEntry={true} style={{ backgroundColor: "#555", borderRadius: 10, color: "#ffffff", fontSize: 18 }} autoComplete="password" textContentType="password" importantForAutofill="yes" returnKeyType="done" />

                <Button onPress={loginSubmit}>Login</Button>
            </ThemedView>
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
        gap: 8,
    },
});
