import React, { useState } from "react";
import { StyleSheet, TextInput, Alert, TouchableOpacity, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Redirect, useRouter } from "expo-router";
import NfcManager, {NfcTech, Ndef} from 'react-native-nfc-manager';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/components/button';
import { Fonts } from '@/constants/theme';

import request from "@/lib/request";

export default function LoginModal() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [idScanState, setIdScanState] = useState(false);

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
            // non students accounts cant use this app
            if (result.data.role !== 0) {
                Alert.alert("You don't have access");
            } else {
                await SecureStore.setItemAsync("token", result.data.token);
                return router.replace("/");
            };
        } else {
            Alert.alert(result.error);
        };
    };

    async function readStudentIDCard() {
        try {
            setIdScanState(true);
            // Search for an NFC tag
            await NfcManager.requestTechnology(NfcTech.Ndef);
            const tag = await NfcManager.getTag();
            if (tag && tag.ndefMessage) {//check it has contents
                const record = tag.ndefMessage[0];
                /* @ts-ignore because record is untyped */
                const decoded_content = Ndef.text.decodePayload(record.payload);
                const [username, password] = decoded_content.split(":");
                await loginUser(username, password);
            }
        } catch (e:any) {
            Alert.alert("Failed to scan card", e.toString());
        } finally {
            // stop the nfc scanning
            NfcManager.cancelTechnologyRequest();
            setIdScanState(false);
        }
    }

    async function loginSubmit() {
        if (!username || !password) return Alert.alert("Missing username or password");
        await loginUser(username, password);
    };

    return (
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
            headerImage={
                <IconSymbol size={310} color="#808080" name="chevron.left.forwardslash.chevron.right" style={styles.headerImage} />
            }>
            <ThemedView style={styles.titleContainer}>
                <ThemedText type="title" style={{ fontFamily: Fonts.rounded }}>Login</ThemedText>
                <Button onPress={readStudentIDCard} disabled={idScanState}>{idScanState ? "Scan student ID" : "Login with student ID"}</Button>
            </ThemedView>
            <ThemedView>
                <ThemedText>Or, use your username and password</ThemedText>

                <ThemedText type="subtitle">Username</ThemedText>
                <TextInput value={username} onChangeText={setUsername} style={{ backgroundColor: "#555", borderRadius: 10, color: "#ffffff", fontSize: 18 }} />

                <ThemedText type="subtitle">Password</ThemedText>
                <TextInput value={password} onChangeText={setPassword} secureTextEntry={true} style={{ backgroundColor: "#555", borderRadius: 10, color: "#ffffff", fontSize: 18 }} />

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
