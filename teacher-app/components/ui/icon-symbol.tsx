import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ComponentProps } from "react";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

export function IconSymbol({ name, size = 24, color }: { name: IconName; size?: number; color?: string }) {
    return <MaterialIcons name={name} size={size} color={color} />;
}