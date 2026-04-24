import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  const { name, userId } = useLocalSearchParams<{ name?: string; userId?: string }>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.name}>{name || "User"} 🎉</Text>
          <Text style={styles.desc}>
            Your account has been created successfully. Start managing your
            tasks with AI-powered reminders.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              router.replace({
                pathname: "/taskreminder",
                params: { userId: userId || "", name: name || "" },
              })
            }
          >
            <Text style={styles.buttonText}>Go to Task Reminder →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0B1020",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  heroCard: {
    backgroundColor: "#121A2F",
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1F2A44",
  },
  welcome: {
    color: "#9CA3AF",
    fontSize: 15,
    marginBottom: 8,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 12,
  },
  desc: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#7C3AED",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
