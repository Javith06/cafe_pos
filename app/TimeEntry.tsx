import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "@/constants/Fonts";
import { AttendanceView } from "@/components/AttendanceView";

type TimeEntryMode = "login" | "attendance";

export default function TimeEntry() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isMobile = width < 700;

  const [mode, setMode] = useState<TimeEntryMode>("login");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [staffName, setStaffName] = useState("");
  const [active, setActive] = useState<"user" | "pass" | "staff">("user");

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const date = time.toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  const clock = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const keypad = [
    "1", "2", "3", "Bksp",
    "4", "5", "6", "Space",
    "7", "8", "9", "Clear",
    "0", "00", ".", "Ent",
  ];

  const getValue = () => {
    if (active === "user") return userId;
    if (active === "pass") return password;
    return staffName;
  };

  const setValue = (val: string) => {
    if (active === "user") setUserId(val);
    if (active === "pass") setPassword(val);
    if (active === "staff") setStaffName(val);
  };

  const handleKeyPress = (key: string) => {
    let value = getValue();

    if (key === "Bksp") {
      setValue(value.slice(0, -1));
      return;
    }

    if (key === "Clear") {
      setValue("");
      return;
    }

    if (key === "Space") {
      setValue(value + " ");
      return;
    }

    if (key === "Ent") {
      handleSubmit();
      return;
    }

    setValue(value + key);
  };

  const handleSubmit = () => {
    if (!userId.trim() || !password.trim() || !staffName.trim()) {
      Alert.alert("⚠️ Missing Information", "Please fill in all fields: User ID, Password, and Staff Name", [{ text: "OK" }]);
      return;
    }

    // Switch to attendance view
    setMode("attendance");
  };

  // If in attendance mode, show the attendance view
  if (mode === "attendance") {
    return (
      <ImageBackground
        source={require("../assets/images/mesh_bg.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <SafeAreaView style={styles.container}>
          {/* HEADER */}
          <BlurView intensity={50} tint="dark" style={styles.header}>
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => setMode("login")}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerTitle}>
              <Text style={styles.headerTitleMain}>Attendance Tracking</Text>
              <Text style={styles.headerSubtitle}>{staffName}</Text>
            </View>
          </BlurView>

          <AttendanceView 
            employeeId={userId} 
            employeeName={staffName}
            onClose={() => router.back()}
          />
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/images/mesh_bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <BlurView intensity={50} tint="dark" style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitle}>
            <Text style={styles.headerTitleMain}>Staff Time Entry</Text>
            <Text style={styles.headerSubtitle}>{date}</Text>
          </View>

          <View style={styles.headerTime}>
            <Ionicons name="time-outline" size={20} color="#4ade80" />
            <Text style={styles.headerClock}>{clock}</Text>
          </View>
        </BlurView>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isMobile}
        >
          <View style={[styles.content, { flexDirection: isMobile ? "column" : "row" }]}>
            {/* LOGIN FORM CARD */}
            <BlurView intensity={50} tint="dark" style={styles.formCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="person-circle-outline" size={24} color="#4ade80" />
                <Text style={styles.cardTitle}>Staff Information</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>👤 User ID</Text>
                <TextInput
                  style={[styles.input, active === "user" && styles.inputActive]}
                  placeholder="Enter your user ID"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={userId}
                  onChangeText={setUserId}
                  onFocus={() => setActive("user")}
                  editable={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>🔒 Password</Text>
                <TextInput
                  style={[styles.input, active === "pass" && styles.inputActive]}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setActive("pass")}
                  editable={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>👥 Staff Name</Text>
                <TextInput
                  style={[styles.input, active === "staff" && styles.inputActive]}
                  placeholder="Enter your name"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={staffName}
                  onChangeText={setStaffName}
                  onFocus={() => setActive("staff")}
                  editable={false}
                />
              </View>

              {/* NUMERIC KEYPAD */}
              <View style={styles.keypadGrid}>
                {keypad.map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[
                      styles.key,
                      (k === "Ent") && styles.keyEnter,
                      (k === "Clear" || k === "Bksp") && styles.keyAction,
                    ]}
                    onPress={() => handleKeyPress(k)}
                  >
                    <Text style={styles.keyText}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </BlurView>
          </View>
        </ScrollView>

        {/* FOOTER ACTION BUTTON */}
        <BlurView intensity={50} tint="dark" style={styles.footer}>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
          >
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>Sign In</Text>
          </TouchableOpacity>
        </BlurView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginVertical: 16,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    flex: 1,
  },
  headerTitleMain: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: "#94a3b8",
    marginTop: 2,
  },
  headerTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.25)",
  },
  headerClock: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#4ade80",
  },

  /* SCROLL CONTENT */
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  content: {
    gap: 16,
    justifyContent: "center",
    paddingBottom: 20,
  },

  /* CARD STYLES */
  formCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: 450,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignSelf: "center",
  },
  keypadCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: 450,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignSelf: "center",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#fff",
    letterSpacing: 0.3,
  },

  /* INPUT GROUP */
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: "#94a3b8",
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 13,
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.medium,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  inputActive: {
    borderColor: "#4ade80",
    backgroundColor: "rgba(74, 222, 128, 0.08)",
  },

  /* STATUS SECTION */
  statusSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: "#94a3b8",
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  statusRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeActive: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    borderColor: "rgba(74, 222, 128, 0.3)",
  },
  badgeInactive: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  statusText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: "#fff",
    letterSpacing: 0.4,
  },
  badgeBreak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  breakText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: "#f59e0b",
    letterSpacing: 0.4,
  },

  /* ACTION BUTTONS */
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    justifyContent: "center",
  },
  inBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#22c55e",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  outBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  breakInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  breakOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    color: "#fff",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  /* KEYPAD */
  keypadGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  key: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    activeOpacity: 0.7,
  },
  keyAction: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  keyEnter: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    borderColor: "rgba(74, 222, 128, 0.25)",
  },
  keyText: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: 14,
    letterSpacing: 0.3,
  },

  /* FOOTER */
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#4ade80",
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    fontFamily: Fonts.bold,
    fontSize: 14,
    color: "#000",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});