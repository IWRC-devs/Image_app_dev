// app/screens/auth/register.tsx

import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import { Colors } from "../../../constants/Colors";
import { getCountriesFromFile } from "@/data/countries";
import { API_BASE_URL } from "@/constants/Config";

export default function RegisterScreen() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [countryId, setCountryId] = useState<number | null>(null);
    const [team, setTeam] = useState("");

    const [countries, setCountries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Load countries from local JSON
    useEffect(() => {
        async function load() {
            try {
                const data = await getCountriesFromFile();
                setCountries(data);
            } catch (err) {
                console.error("Error loading countries:", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // Basic validation
    const validateForm = () => {
        if (!username.trim()) return "Email is required";
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(username)) return "Enter a valid email address";

        if (!password.trim()) return "Password is required";
        if (password.length < 4) return "Password must be at least 4 characters";
        if (!countryId || countryId === 0)
            return "Please select a country";
        if (!team.trim())
            return "Team name is required";
        return null;
    };

    const handleRegister = async () => {
        const error = validateForm();
        if (error) {
            Alert.alert(error);
            return;
        }

        try {
            setLoading(true);

            const res = await fetch(`${API_BASE_URL}/api/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                    team_name: team,
                    country_id: countryId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Registration failed");
            }

            Alert.alert("Success", "User registered successfully", [
                { text: "OK", onPress: () => router.back() },
            ]);

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
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.title}>Register User</Text>

                {/* Email */}
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#888"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                />

                {/* Password */}
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                {/* Country Dropdown */}
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={countryId}
                        onValueChange={(value: React.SetStateAction<number | null>) => setCountryId(value)}
                        dropdownIconColor="#fff"
                        style={styles.picker}
                    >
                        <Picker.Item label="Select Country" value={null} />
                        {countries.map((c) => (
                            <Picker.Item
                                key={c.id}
                                label={c.name}
                                value={c.id}
                            />
                        ))}
                    </Picker>
                </View>

                {/* Group Name */}
                <TextInput
                    style={styles.input}
                    placeholder="Team Name"
                    placeholderTextColor="#888"
                    value={team}
                    onChangeText={setTeam}
                    autoCapitalize="none"
                />

                {/* Register Button */}
                <TouchableOpacity
                    style={[styles.button, loading && { opacity: 0.6 }]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <Text style={styles.buttonText}>Register</Text>
                    )}
                </TouchableOpacity>

                {/* Back Button */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
        backgroundColor: "#121212",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 30,
        textAlign: "center",
        color: "#fff",
    },
    input: {
        borderWidth: 1,
        borderColor: "#444",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 14,
        marginBottom: 18,
        color: "#fff",
        backgroundColor: "#1f1f1f",
        fontSize: 16,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: "#444",
        borderRadius: 8,
        marginBottom: 20,
        backgroundColor: "#1f1f1f",
    },
    picker: {
        color: "#fff",
    },
    button: {
        backgroundColor: "#4ade80",
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: "center",
    },
    buttonText: {
        color: "#000",
        fontSize: 18,
        fontWeight: "600",
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