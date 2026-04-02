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
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../constants/Fonts";
import { SafeAreaView } from "react-native-safe-area-context";

type ActiveField = "user" | "pass" | "staff";

export default function TimeEntry() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isMobile = width < 768;

  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [staffName, setStaffName] = useState("");
  const [active, setActive] = useState<ActiveField>("user");

  const [shiftStarted, setShiftStarted] = useState(false);
  const [onBreak, setOnBreak] = useState(false);

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = time.toLocaleDateString("en-GB", { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
  const clockStr = time.toLocaleTimeString("en-GB", { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

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
      console.log({ userId, password, staffName });
      return;
    }

    setValue(value + key);
  };

  const renderKey = (k: string) => {
    const isSpecial = ["Bksp", "Clear", "Space", "Ent"].includes(k);
    const isEnt = k === "Ent";
    
    return (
      <TouchableOpacity
        key={k}
        activeOpacity={0.7}
        style={[
          styles.key,
          isSpecial && styles.specialKey,
          isEnt && styles.entKey,
          { width: k === "Space" || k === "Bksp" || k === "Clear" || k === "Ent" ? "23%" : "23%" }
        ]}
        onPress={() => handleKeyPress(k)}
      >
        {k === "Bksp" ? (
          <Ionicons name="backspace-outline" size={24} color="#fff" />
        ) : (
          <Text style={[styles.keyText, isEnt && styles.entKeyText]}>{k}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground
      source={require("../assets/images/mesh_bg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.overlay}>
          {/* HEADER */}
          <BlurView intensity={30} tint="dark" style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.brandContainer}>
              <Text style={styles.title}>
                SMART <Text style={{ color: "#4ade80" }}>TIME</Text>
              </Text>
              <Text style={styles.subtitle}>Staff Attendance Portal</Text>
            </View>

            <View style={styles.timeContainer}>
              <Text style={styles.dateText}>{dateStr}</Text>
              <Text style={styles.clockText}>{clockStr}</Text>
            </View>
          </BlurView>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { flexDirection: isMobile ? "column" : "row" },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* LOGIN FORM */}
            <View style={styles.formContainer}>
              <BlurView intensity={60} tint="dark" style={styles.form}>
                <Text style={styles.sectionTitle}>STAFF CREDENTIALS</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>User ID</Text>
                  <View style={[styles.inputWrapper, active === "user" && styles.activeInput]}>
                    <Ionicons name="person-outline" size={18} color={active === "user" ? "#4ade80" : "#94a3b8"} />
                    <TextInput
                      style={styles.input}
                      value={userId}
                      onChangeText={setUserId}
                      onFocus={() => setActive("user")}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      placeholder="Enter ID"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Access PIN</Text>
                  <View style={[styles.inputWrapper, active === "pass" && styles.activeInput]}>
                    <Ionicons name="lock-closed-outline" size={18} color={active === "pass" ? "#4ade80" : "#94a3b8"} />
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setActive("pass")}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      placeholder="••••"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Staff Name</Text>
                  <View style={[styles.inputWrapper, active === "staff" && styles.activeInput]}>
                    <Ionicons name="id-card-outline" size={18} color={active === "staff" ? "#4ade80" : "#94a3b8"} />
                    <TextInput
                      style={styles.input}
                      value={staffName}
                      onChangeText={setStaffName}
                      onFocus={() => setActive("staff")}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      placeholder="Display Name"
                    />
                  </View>
                </View>

                {/* ACTION BUTTONS */}
                <View style={styles.actionRow}>
                  {!shiftStarted ? (
                    <TouchableOpacity
                      style={[styles.mainActionBtn, styles.clockInBtn]}
                      onPress={() => setShiftStarted(true)}
                    >
                      <Ionicons name="log-in" size={32} color="#fff" />
                      <Text style={styles.actionBtnText}>CLOCK IN</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.shiftActions}>
                      <TouchableOpacity
                        style={[styles.mainActionBtn, styles.clockOutBtn]}
                        onPress={() => {
                          setShiftStarted(false);
                          setOnBreak(false);
                        }}
                      >
                        <Ionicons name="log-out" size={32} color="#fff" />
                        <Text style={styles.actionBtnText}>CLOCK OUT</Text>
                      </TouchableOpacity>

                      {!onBreak ? (
                        <TouchableOpacity
                          style={[styles.subActionBtn, styles.breakInBtn]}
                          onPress={() => setOnBreak(true)}
                        >
                          <Ionicons name="cafe-outline" size={24} color="#fff" />
                          <Text style={styles.subActionBtnText}>START BREAK</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[styles.subActionBtn, styles.breakOutBtn]}
                          onPress={() => setOnBreak(false)}
                        >
                          <Ionicons name="play-outline" size={24} color="#fff" />
                          <Text style={styles.subActionBtnText}>RESUME WORK</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </BlurView>
            </View>

            {/* KEYPAD */}
            <View style={styles.keypadContainer}>
              <BlurView intensity={40} tint="dark" style={styles.keypad}>
                {keypad.map((k) => renderKey(k))}
              </BlurView>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    padding: 20,
    backgroundColor: "rgba(10, 15, 30, 0.4)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.black,
    color: "#fff",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  timeContainer: {
    alignItems: "flex-end",
  },
  dateText: {
    color: "#94a3b8",
    fontFamily: Fonts.semiBold,
    fontSize: 12,
  },
  clockText: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 18,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    width: "100%",
  },
  formContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 450,
  },
  form: {
    padding: 30,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sectionTitle: {
    color: "#4ade80",
    fontFamily: Fonts.black,
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: 25,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: "#64748b",
    fontFamily: Fonts.bold,
    marginBottom: 8,
    fontSize: 12,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    height: 56,
  },
  activeInput: {
    borderColor: "rgba(74, 222, 128, 0.3)",
    backgroundColor: "rgba(74, 222, 128, 0.05)",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    marginLeft: 12,
  },
  actionRow: {
    marginTop: 30,
    alignItems: "center",
  },
  mainActionBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  clockInBtn: {
    backgroundColor: "#22c55e",
  },
  clockOutBtn: {
    backgroundColor: "#ef4444",
  },
  actionBtnText: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 14,
    marginTop: 8,
  },
  shiftActions: {
    alignItems: "center",
    gap: 20,
  },
  subActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 20,
    gap: 10,
    borderWidth: 1,
  },
  breakInBtn: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  breakOutBtn: {
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderColor: "rgba(168, 85, 247, 0.3)",
  },
  subActionBtnText: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 13,
  },
  keypadContainer: {
    flex: 1,
    width: "100%",
    maxWidth: 450,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 20,
    borderRadius: 30,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  key: {
    height: 70,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  specialKey: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  entKey: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    borderColor: "rgba(74, 222, 128, 0.3)",
  },
  keyText: {
    color: "#fff",
    fontFamily: Fonts.extraBold,
    fontSize: 22,
  },
  entKeyText: {
    color: "#4ade80",
    fontSize: 16,
    fontFamily: Fonts.black,
  },
});
;