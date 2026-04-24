import * as Notifications from "expo-notifications";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Notification handler (must be at module level) ───────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Types ─────────────────────────────────────────────────────────────────────
type Task = {
  _id: string;
  title: string;
  description?: string;
  taskTime: string;
};

type ChatMessage = {
  id: string;
  sender: "ai" | "user";
  text: string;
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function TaskReminderScreen() {
  const { userId, name } = useLocalSearchParams<{
    userId?: string;
    name?: string;
  }>();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");
  const [fetchingTasks, setFetchingTasks] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text:
        "Hi " +
        (name || "there") +
        " 👋 Tell me about your task and when it should happen.\n\nExample: \"Remind me to attend team meeting on 2026-04-25 at 3:00 PM\"",
    },
  ]);

  useEffect(() => {
    requestNotificationPermission();
    if (userId) fetchTasks();
  }, []);

  // ─── Notification permission ─────────────────────────────────────────────────
  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Notifications Disabled",
        "Please enable notifications in settings to receive task reminders."
      );
    }
  };

  // ─── Schedule local notification 30 min before task ──────────────────────────
  const scheduleReminder = async (title: string, taskTime: string) => {
    const taskDate = new Date(taskTime);
    const reminderDate = new Date(taskDate.getTime() - 30 * 60 * 1000);
    const now = Date.now();

    if (reminderDate.getTime() <= now) {
      // Task is within 30 min or past — notify immediately
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Task Reminder",
          body: `"${title}" is coming up soon!`,
          sound: true,
        },
        trigger: null, // fire immediately
      });
      return;
    }

    const secondsUntilReminder = Math.round(
      (reminderDate.getTime() - now) / 1000
    );

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "⏰ Task Reminder",
        body: `"${title}" starts in 30 minutes`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilReminder,
        repeats: false,
      },
    });
  };

  // ─── Fetch existing tasks ─────────────────────────────────────────────────────
  const fetchTasks = async () => {
    if (!userId) return;
    setFetchingTasks(true);
    try {
      const res = await fetch(
        `http://192.168.1.5:5000/api/tasks/list/${userId}`
      );
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch {
      console.log("Failed to fetch tasks");
    } finally {
      setFetchingTasks(false);
    }
  };

  // ─── Append chat message ──────────────────────────────────────────────────────
  const appendMessage = (msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // ─── Create task ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    appendMessage({ id: `${Date.now()}-user`, sender: "user", text: trimmed });
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://192.168.1.5:5000/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId || "", userMessage: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        appendMessage({
          id: `${Date.now()}-ai`,
          sender: "ai",
          text: `❌ ${data.message || "Failed to create task. Please try again."}`,
        });
        return;
      }

      const task: Task = data.task;

      // Schedule the 30-min reminder
      await scheduleReminder(task.title, task.taskTime);

      appendMessage({
        id: `${Date.now()}-ai`,
        sender: "ai",
        text: `✅ Task created!\n\n📌 *${task.title}*\n⏰ ${new Date(task.taskTime).toLocaleString()}\n\n🔔 You'll be reminded 30 minutes before.`,
      });

      await fetchTasks();
      setActiveTab("list");
    } catch {
      appendMessage({
        id: `${Date.now()}-ai`,
        sender: "ai",
        text: "❌ Could not connect to server. Please check your connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render task card ─────────────────────────────────────────────────────────
  const renderTask = ({ item }: { item: Task }) => {
    const taskDate = new Date(item.taskTime);
    const isPast = taskDate.getTime() < Date.now();

    return (
      <View style={[styles.taskCard, isPast && styles.taskCardPast]}>
        <View style={styles.taskCardLeft}>
          <View style={[styles.taskDot, isPast && styles.taskDotPast]} />
        </View>
        <View style={styles.taskCardBody}>
          <Text style={[styles.taskTitle, isPast && styles.taskTitlePast]}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={styles.taskDesc}>{item.description}</Text>
          ) : null}
          <View style={styles.taskTimeBadge}>
            <Text style={styles.taskTimeText}>
              ⏰ {taskDate.toLocaleString()}
            </Text>
          </View>
          {isPast && <Text style={styles.taskPastLabel}>Completed</Text>}
        </View>
      </View>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Reminder</Text>
        <Text style={styles.headerSub}>Smart task scheduling</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "create" && styles.tabActive]}
          onPress={() => setActiveTab("create")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "create" && styles.tabTextActive,
            ]}
          >
            Create Task
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "list" && styles.tabActive]}
          onPress={() => {
            setActiveTab("list");
            fetchTasks();
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "list" && styles.tabTextActive,
            ]}
          >
            My Tasks {tasks.length > 0 ? `(${tasks.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB: CREATE */}
      {activeTab === "create" && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <View style={styles.chatContainer}>
            {/* CHAT MESSAGES */}
            <ScrollView
              ref={scrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg) => {
                const isAI = msg.sender === "ai";
                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.msgRow,
                      isAI ? styles.msgLeft : styles.msgRight,
                    ]}
                  >
                    {isAI && (
                      <View style={styles.aiAvatar}>
                        <Text style={styles.aiAvatarText}>AI</Text>
                      </View>
                    )}
                    <View
                      style={[
                        styles.bubble,
                        isAI ? styles.aiBubble : styles.userBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bubbleText,
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
                <View style={[styles.msgRow, styles.msgLeft]}>
                  <View style={styles.aiAvatar}>
                    <Text style={styles.aiAvatarText}>AI</Text>
                  </View>
                  <View
                    style={[
                      styles.bubble,
                      styles.aiBubble,
                      styles.loadingBubble,
                    ]}
                  >
                    <ActivityIndicator size="small" color="#A78BFA" />
                    <Text style={styles.loadingText}>Creating task...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* INPUT BAR */}
            <View style={styles.inputBar}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="e.g. Remind me to call client at 5 PM tomorrow"
                placeholderTextColor="#4B5563"
                style={styles.inputField}
                multiline
                returnKeyType="send"
                onSubmitEditing={handleCreate}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!input.trim() || loading) && styles.sendBtnDisabled,
                ]}
                onPress={handleCreate}
                disabled={!input.trim() || loading}
                activeOpacity={0.8}
              >
                <Text style={styles.sendBtnText}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* TAB: LIST */}
      {activeTab === "list" && (
        <View style={styles.flex}>
          {fetchingTasks ? (
            <View style={styles.center}>
              <ActivityIndicator color="#7C3AED" size="large" />
              <Text style={styles.fetchingText}>Loading tasks...</Text>
            </View>
          ) : tasks.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>No tasks yet</Text>
              <Text style={styles.emptyDesc}>
                Switch to Create Task tab to add your first reminder
              </Text>
            </View>
          ) : (
            <FlatList
              data={[...tasks].sort(
                (a, b) =>
                  new Date(a.taskTime).getTime() -
                  new Date(b.taskTime).getTime()
              )}
              keyExtractor={(item) => item._id}
              renderItem={renderTask}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1020" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  headerSub: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 3,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#121A2F",
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2A44",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#7C3AED" },
  tabText: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: "#FFFFFF" },

  // Chat
  chatContainer: {
    flex: 1,
    marginHorizontal: 16,
    backgroundColor: "#121A2F",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1F2A44",
    overflow: "hidden",
    marginBottom: 12,
  },
  chatScroll: { flex: 1 },
  chatContent: { padding: 14, paddingBottom: 6 },
  msgRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-end",
  },
  msgLeft: { justifyContent: "flex-start" },
  msgRight: { justifyContent: "flex-end" },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#312E81",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 2,
  },
  aiAvatarText: { color: "#A78BFA", fontSize: 10, fontWeight: "800" },
  bubble: {
    maxWidth: "78%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  aiBubble: { backgroundColor: "#1C2742", borderBottomLeftRadius: 4 },
  userBubble: { backgroundColor: "#7C3AED", borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  aiText: { color: "#E5E7EB" },
  userText: { color: "#FFFFFF" },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  loadingText: { color: "#A78BFA", fontSize: 13, fontWeight: "600" },

  // Input
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#1F2A44",
    gap: 10,
  },
  inputField: {
    flex: 1,
    backgroundColor: "#0D1426",
    color: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#25304D",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 48,
    maxHeight: 100,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#2D2050", opacity: 0.6 },
  sendBtnText: { color: "#FFFFFF", fontSize: 20, fontWeight: "700" },

  // Task List
  listContent: { padding: 16, paddingBottom: 32 },
  taskCard: {
    flexDirection: "row",
    backgroundColor: "#121A2F",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F2A44",
  },
  taskCardPast: { opacity: 0.55 },
  taskCardLeft: { paddingTop: 4, paddingRight: 12 },
  taskDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#7C3AED",
  },
  taskDotPast: { backgroundColor: "#374151" },
  taskCardBody: { flex: 1 },
  taskTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  taskTitlePast: { color: "#6B7280" },
  taskDesc: {
    color: "#9CA3AF",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  taskTimeBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#1C2742",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  taskTimeText: { color: "#A78BFA", fontSize: 12, fontWeight: "600" },
  taskPastLabel: {
    marginTop: 6,
    color: "#4B5563",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Empty state
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyDesc: {
    color: "#6B7280",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  fetchingText: { color: "#6B7280", marginTop: 12, fontSize: 14 },
});
