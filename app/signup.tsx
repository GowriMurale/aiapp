import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Sender = "ai" | "user";

type Message = {
  id: string;
  sender: Sender;
  text: string;
};

export default function AISignupScreen() {
  const scrollRef = useRef<ScrollView>(null);

  const [chatStarted, setChatStarted] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: "Welcome 👋 I'll help you create your account. Tap the message box and send your name, email, password, and phone number.",
    },
  ]);

  const placeholder = useMemo(() => {
    return chatStarted
      ? "Type your signup details..."
      : "Tap here to start AI signup...";
  }, [chatStarted]);

  const appendMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleFocus = () => {
    if (!chatStarted) {
      setChatStarted(true);
      appendMessage({
        id: Date.now().toString(),
        sender: "ai",
        text: "Please send your full name, email, password, and phone in one message.",
      });
    }
  };

  const validateInputMessage = (text: string) => {
    const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const phoneMatch = text.match(/\b\d{10,15}\b/);
    const passwordMatch = text.match(/password is\s+([^\s,]+)/i);
    const nameMatch = text.match(/name is\s+([a-zA-Z\s.'-]+)/i);

    if (!nameMatch) return "Please include your full name (e.g. name is John)";
    if (!emailMatch) return "Please include a valid email address";
    if (!passwordMatch)
      return "Please include your password like: password is MyPass123!";

    const password = passwordMatch[1];
    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]).{8,64}$/;

    if (!strongPassword.test(password))
      return "Password must have uppercase, lowercase, number, special character, and be at least 8 characters";
    if (!phoneMatch) return "Please include a valid phone number";

    return null;
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const validationError = validateInputMessage(trimmed);
    if (validationError) {
      appendMessage({
        id: `${Date.now()}-ai`,
        sender: "ai",
        text: validationError,
      });
      return;
    }

    appendMessage({
      id: `${Date.now()}-user`,
      sender: "user",
      text: trimmed,
    });

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://192.168.1.35:5002/api/auth/ai-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        appendMessage({
          id: `${Date.now()}-ai`,
          sender: "ai",
          text: `${data.message || "Registration failed"}${data.error ? `: ${data.error}` : ""}`,
        });
        return;
      }

      appendMessage({
        id: `${Date.now()}-ai`,
        sender: "ai",
        text: `Account created successfully for ${data.user.fullName} ✅`,
      });

      setTimeout(() => {
        router.replace({
          pathname: "/home",
          params: {
            name: data.user.fullName,
            userId: data.user._id || data.user.id || "",
          },
        });
      }, 700);
    } catch {
      Alert.alert("Connection Error", "Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Sign Up</Text>
            <Text style={styles.subtitle}>
              Create your account through a smart chat experience
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>Conversation</Text>
              <View style={styles.onlineDot} />
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => {
                const isAI = msg.sender === "ai";
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isAI ? styles.leftRow : styles.rightRow,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isAI ? styles.aiBubble : styles.userBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isAI ? styles.aiText : styles.userText,
                        ]}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {loading && (
                <View style={[styles.messageRow, styles.leftRow]}>
                  <View
                    style={[
                      styles.messageBubble,
                      styles.aiBubble,
                      styles.loaderBubble,
                    ]}
                  >
                    <ActivityIndicator color="#A78BFA" />
                    <Text style={styles.typingText}>AI is processing...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.inputWrapper}>
              <TextInput
                value={input}
                onChangeText={setInput}
                onFocus={handleFocus}
                placeholder={placeholder}
                placeholderTextColor="#7C8799"
                multiline
                style={styles.input}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  loading && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                activeOpacity={0.85}
                disabled={loading}
              >
                <Text style={styles.sendButtonText}>
                  {loading ? "..." : "Send"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bottomHint}>
            <Text style={styles.bottomHintText}>
              Tip: "My name is Gowri, my email is gowri@mail.com, my password
              is Pass@1234, my phone is 9876543210"
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0B1020" },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
  },
  header: { paddingTop: 10, marginBottom: 18 },
  title: { color: "#FFFFFF", fontSize: 30, fontWeight: "800" },
  subtitle: { color: "#9CA3AF", fontSize: 14, marginTop: 8, lineHeight: 20 },
  card: {
    flex: 1,
    backgroundColor: "#121A2F",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1F2A44",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  cardTitle: { color: "#E5E7EB", fontSize: 16, fontWeight: "700" },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  chatArea: { flex: 1 },
  chatContent: { paddingBottom: 14 },
  messageRow: { marginBottom: 12, flexDirection: "row" },
  leftRow: { justifyContent: "flex-start" },
  rightRow: { justifyContent: "flex-end" },
  messageBubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  aiBubble: { backgroundColor: "#1C2742", borderTopLeftRadius: 6 },
  userBubble: { backgroundColor: "#7C3AED", borderTopRightRadius: 6 },
  messageText: { fontSize: 15, lineHeight: 21 },
  aiText: { color: "#E5E7EB" },
  userText: { color: "#FFFFFF" },
  loaderBubble: { flexDirection: "row", alignItems: "center", gap: 10 },
  typingText: { color: "#C4B5FD", fontSize: 14, fontWeight: "600" },
  inputWrapper: { marginTop: 10, flexDirection: "row", alignItems: "flex-end" },
  input: {
    flex: 1,
    minHeight: 56,
    maxHeight: 120,
    backgroundColor: "#0D1426",
    color: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#25304D",
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 15,
    marginRight: 10,
    fontSize: 15,
  },
  sendButton: {
    height: 56,
    minWidth: 72,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.7 },
  sendButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  bottomHint: { marginTop: 14, paddingHorizontal: 6 },
  bottomHintText: {
    color: "#6B7280",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
