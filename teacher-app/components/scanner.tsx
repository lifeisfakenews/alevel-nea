import React, { useState, useEffect } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { CameraView, Camera } from "expo-camera";

export default function QrScanner() {
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
        alert(`Scanned QR code: ${data}`);
    };

    return (
        <View style={styles.container}>
            <CameraView onBarCodeScanned={scanned ? undefined : handleBarCodeScanned} barcodeScannerSettings={{barcodeTypes: ["qr"]}} style={StyleSheet.absoluteFillObject} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    text: {
        position: "absolute",
        bottom: 80,
        backgroundColor: "white",
        padding: 10
    }
});