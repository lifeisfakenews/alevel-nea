import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

export async function registerForPushNotifications() {
    let token;

    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("alerts_attempt_thrice", {
            name: "Alerts (3)",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#06c1c1",
        });
    }

    if (Device.isDevice) {
        const permission = await Notifications.getPermissionsAsync();
        let status = permission.status;
        if (status !== "granted") {
            const permission_request = await Notifications.requestPermissionsAsync();
            status = permission_request.status;
        }
        if (status !== "granted") throw new Error("Failed to get push token for push notification!");

        const project_id = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (!project_id) throw new Error("Project ID not found");

        const { data } = await Notifications.getExpoPushTokenAsync({
            projectId: project_id
        });
        token = data;
    } else {
        throw new Error("Must use physical device for Push Notifications");
    }

    return token;
};