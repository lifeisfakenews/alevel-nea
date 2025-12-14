import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { CameraView, Camera } from "expo-camera";
import { ThemedView } from "./themed-view";

export default function QrScanner({ onBarcodeScanned }: { onBarcodeScanned?: (data: string) => void }) {
    const [has_permission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        async function getCameraPermission() {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        }

        getCameraPermission();
    }, []);

    if (has_permission === null) return <Text>Requesting camera permission...</Text>;
    if (has_permission === false) return <Text>No access to camera</Text>;

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        setScanned(true);
        if (onBarcodeScanned) onBarcodeScanned(data);
        else alert(data);
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.cameraWrapper}>
                <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} barcodeScannerSettings={{barcodeTypes: ["qr"]}} style={StyleSheet.absoluteFillObject} />
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    cameraWrapper: {
        position: "relative",
        width: "100%",
        aspectRatio: 1,
    }
});