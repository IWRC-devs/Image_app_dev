// app/screens/auth/login.tsx
import React, { useState, useContext } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../../constants/Colors";
import { API_BASE_URL } from "@/constants/Config";
import { useUser } from "@/app/context/UserContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<any>({});

    // Validation
    const validateForm = () => {
        let newErrors: any = {};
        if (!username.trim()) newErrors.username = "Required";
        if (!password.trim()) newErrors.password = "Required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const { setUser } = useUser();

    // Login API call
    const handleLogin = async () => {
        const isValid = validateForm();
        if (!isValid) return;

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/api/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Login failed");
            }

            // Save user to AsyncStorage
            await AsyncStorage.setItem("user", JSON.stringify(data.user));
            
            // Save to context
            setUser({
                id: data.user.id,
                username: data.user.username,
                country_id: data.user.country_id,
                country_name: data.user.country_name,
                country_code: data.user.country_code,
                team_name: data.user.team_name,
            });



            // SUCCESS
            Alert.alert("Success", "Login successful");

            console.log("USER:", data.user);

            // Next: navigate to main app
            router.replace("../imaging");

        } catch (err: any) {
            Alert.alert("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <View style={styles.container}>
                <Text style={styles.title}>Login</Text>

                {/* Username */}
                <TextInput
                    style={[styles.input, errors.username && styles.inputError]}
                    placeholder="Username"
                    placeholderTextColor="#888"
                    value={username}
                    onChangeText={(text) => {
                        setUsername(text);
                        setErrors((prev: any) => ({ ...prev, username: null }));
                    }}
                    autoCapitalize="none"
                />
                {errors.username && (
                    <Text style={styles.errorText}>{errors.username}</Text>
                )}

                {/* Password */}
                <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="Password"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        setErrors((prev: any) => ({ ...prev, password: null }));
                    }}
                    secureTextEntry
                />
                {errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                )}

                {/* Login Button */}
                <TouchableOpacity
                    style={[styles.button, loading && { opacity: 0.6 }]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.buttonText}>Login</Text>
                    )}
                </TouchableOpacity>

                {/* Go to Register */}
                <TouchableOpacity
                    onPress={() => router.push("/screens/auth/register")}
                    style={styles.linkBtn}
                >
                    <Text style={styles.linkText}>Create an account</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
    inputError: {
        borderColor: "red",
    },
    errorText: {
        color: "red",
        marginBottom: 10,
        marginLeft: 4,
        fontSize: 12,
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
    linkBtn: {
        marginTop: 20,
        alignItems: "center",
    },
    linkText: {
        color: Colors.light.tint,
        fontSize: 16,
    },
});
