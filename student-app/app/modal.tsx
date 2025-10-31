import { Link, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import QRCode from 'react-native-qrcode-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ModalScreen() {
    const { passId } = useLocalSearchParams<{passId?: string}>();

    return <ThemedView style={styles.container}>
        <QRCode value={passId} size={256} />
        <ThemedText type="small">Scan to verify pass</ThemedText>
        <Link href="/" dismissTo style={styles.link}>
            <ThemedText type="link">Go to home screen</ThemedText>
        </Link>
    </ThemedView>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
