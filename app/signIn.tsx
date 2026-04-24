import { router } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://192.168.1.5:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      router.replace({
        pathname: "/home",
        params: { name: data.user.fullName }
      });
    } catch {
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Login to continue your journey
            </Text>
          </View>

          {/* CARD */}
          <View style={styles.card}>
            {/* EMAIL */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#7C8799"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* PASSWORD */}
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#7C8799"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {/* ERROR */}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* BUTTON */}
            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* SIGNUP LINK */}
            <TouchableOpacity
              onPress={() => router.push("/signup")}
            >
              <Text style={styles.link}>
                Don’t have an account? <Text style={styles.linkBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B1020"
  },
  container: {
    flex: 1,
    padding: 20
  },
  header: {
    marginTop: 40,
    marginBottom: 30
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15
  },
  logoText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold"
  },
  subtitle: {
    color: "#9CA3AF",
    marginTop: 6
  },
  card: {
    backgroundColor: "#121A2F",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1F2A44"
  },
  label: {
    color: "#CBD5E1",
    marginBottom: 6,
    marginTop: 12
  },
  input: {
    backgroundColor: "#0D1426",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#25304D"
  },
  button: {
    backgroundColor: "#22C55E",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  },
  error: {
    color: "#F87171",
    marginTop: 10
  },
  link: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 20
  },
  linkBold: {
    color: "#7C3AED",
    fontWeight: "bold"
  }
});