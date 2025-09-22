// app/screens/auth/login.tsx
import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, Alert, StyleSheet } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Colors } from "../../../constants/Colors";

export default function LoginScreen() {
    const router = useRouter();
    const [username, setUsername] = useState("user");
    const [password, setPassword] = useState("user");

    const handleLogin = () => {
        if (username === "user" && password === "user") {
            //Alert.alert("Login successful!");
            router.replace("../imaging");
        } else {
            Alert.alert("Invalid username or password");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
            />

            <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                <Text style={{ color: Colors.light.tint }}>← Back</Text>
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
});
