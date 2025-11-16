import { TouchableOpacity, StyleSheet } from "react-native";

import { ThemedText } from "./themed-text";

interface ButtonProps {
    onPress: () => void;
    children: React.ReactNode;
    style?: any;
    disabled?: boolean;
}

export function Button({ onPress, children, style, disabled = false }: ButtonProps) {   
    return (
        <TouchableOpacity onPress={onPress} style={[styles.button, style, { opacity: disabled ? 0.5 : 1 }]} disabled={disabled}>
            <ThemedText>{children}</ThemedText>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        display: "flex",
        alignItems: "center",
        width: "100%",
        borderRadius: 10,
        padding: 10,
        marginBlock: 10,
        backgroundColor: "hsl(180, 94%, 39%)",
        color: "#fff",
        textAlign: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});