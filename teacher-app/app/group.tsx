import React, { useState, useEffect } from "react";
import { StyleSheet, TextInput, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from 'expo-image';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Button } from '@/components/button';

import { type Grouping } from "@/lib/types";
import request from "@/lib/request";
import DESTINATIONS from "@/lib/locations/destinations";

export default function GroupModal() {
    const { _id: group_id } = useLocalSearchParams<{_id?: string}>();
    const router = useRouter();

    const [group, setGroup] = useState<Grouping | null>(null);
    const [resolved, setResolved] = useState(false);

    useEffect(() => {
        async function fetchGroup() {
            const result = await request<Grouping>(`groupings/${group_id}`, "GET");
            if (result.success) {
                setGroup(result.data);
                setResolved((result.data.resolved_at && result.data.resolved_at !== null) ? true: false);
            } else setGroup(null);
        }
        fetchGroup();
    }, [group_id]);

    if (!group) return <ThemedText>Loading...</ThemedText>;

    return (
        <ParallaxScrollView
            headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
            headerImage={
                <Image source={require('@/assets/images/partial-react-logo.png')} style={styles.reactLogo} />
            }>
            <ThemedView>
                <ThemedText type="title">Group Details</ThemedText>
                <ThemedText type="subtitle">Location</ThemedText>
                <ThemedText type="default">{DESTINATIONS.find(x => x.id === group.location)?.name ?? group.location}</ThemedText>
                <ThemedText type="subtitle">Students</ThemedText>
                <ThemedText type="default">{group.students.join(", ")}</ThemedText>
                <ThemedText type="subtitle">Confidence</ThemedText>
                <ThemedText type="default">{group.confidence_score}/100</ThemedText>
                <Button onPress={async() => {
                    const result = await request<null>(`groupings/${group_id}/resolve`, "POST");
                    if (!result.success && result.error !== "Grouping already resolved") {
                        alert(result.error);
                    } else {
                        setResolved(true);
                    };
                }} disabled={resolved}>{resolved ? "Resolved" : "Resolve"}</Button>
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
    reactLogo: {
        height: 178,
        width: 290,
        bottom: 0,
        left: 0,
        position: 'absolute',
    },
    titleContainer: {
        gap: 8,
    },
});
