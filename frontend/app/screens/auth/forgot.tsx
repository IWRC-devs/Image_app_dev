import { API_BASE_URL } from "@/constants/Config";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from "react-native";
import { Colors } from "../../../constants/Colors";

export default function ForgotScreen() {
    const [username, setUsername] = useState("");
    const router = useRouter();

    const handleForgot = async () => {
        if (!username.trim()) {
            Alert.alert("Enter your email");
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });

            const data = await res.json();

            Alert.alert("Info", data.message);
        } catch (err) {
            Alert.alert("Error", "Something went wrong");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Forgot Password</Text>

            {/* Email Input */}
            <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#888"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            {/* Button */}
            <TouchableOpacity style={styles.button} onPress={handleForgot}>
                <Text style={styles.buttonText}>Send Reset Link</Text>
            </TouchableOpacity>
            {/* Back Button */}
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        backgroundColor: "#121212", // or transparent if needed a background image
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 40,
        textAlign: "center",
        color: "#fff",
    },
    button: {
        backgroundColor: "#4ade80", // green button
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: "center",
    },
    buttonText: {
        color: "#000",
        fontSize: 18,
        fontWeight: "600",
    },
    input: {
        borderWidth: 1,
        borderColor: "#444",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 16,  // increase vertical padding
        marginBottom: 20,
        color: "#fff",
        backgroundColor: "#1f1f1f",
        fontSize: 16,          // optional: make text larger
    },
    backBtn: {
        marginTop: 20,
        alignItems: "center",
    },
    backText: {
        color: Colors.light.tint,
        fontSize: 16,
    },
});