import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "../constants/Fonts";

type ActiveField = "user" | "pass" | "staff";

export default function TimeEntry() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 700;

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

  const date = time.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const clock = time.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const keypad = [
    "1","2","3","⌫",
    "4","5","6","Spc",
    "7","8","9","Clr",
    ".","0","00","↵",
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
    if (key === "⌫") { setValue(value.slice(0, -1)); return; }
    if (key === "Clr") { setValue(""); return; }
    if (key === "Spc") { setValue(value + " "); return; }
    if (key === "↵") { console.log({ userId, password, staffName }); return; }
    setValue(value + key);
  };

  const isSpecialKey = (k: string) => ["⌫","Clr","Spc","↵"].includes(k);

  return (
    <ImageBackground
      source={require("../assets/images/mesh_bg.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.darkOverlay} />

      <SafeAreaView style={styles.safe}>
        {/* ═══ HEADER ═══ */}
        <BlurView intensity={50} tint="dark" style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>SMART</Text>
            <Text style={styles.brandAccent}>CAFÉ</Text>
          </View>

          <View style={styles.clockBlock}>
            <Text style={styles.clockTime}>{clock}</Text>
            <Text style={styles.clockDate}>{date}</Text>
          </View>
        </BlurView>

        {/* ═══ BODY ═══ */}
        <ScrollView
          contentContainerStyle={[
            styles.body,
            { flexDirection: isMobile ? "column" : "row" },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── LOGIN FORM ── */}
          <BlurView intensity={45} tint="dark" style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIconWrap}>
                <Ionicons name="person-circle-outline" size={32} color="#22c55e" />
              </View>
              <Text style={styles.formTitle}>Staff Time Entry</Text>
              <Text style={styles.formSub}>Tap a field, then use the keypad</Text>
            </View>

            {/* User ID */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setActive("user")}
              style={[styles.fieldWrap, active === "user" && styles.fieldWrapActive]}
            >
              <View style={styles.fieldLabelRow}>
                <Ionicons name="id-card-outline" size={14} color={active === "user" ? "#22c55e" : "#64748b"} />
                <Text style={[styles.fieldLabel, active === "user" && styles.fieldLabelActive]}>User ID</Text>
              </View>
              <TextInput
                style={styles.fieldInput}
                value={userId}
                onChangeText={setUserId}
                onFocus={() => setActive("user")}
                placeholder="Enter user ID"
                placeholderTextColor="#334155"
                editable
              />
              {active === "user" && <View style={styles.activeCaret} />}
            </TouchableOpacity>

            {/* Password */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setActive("pass")}
              style={[styles.fieldWrap, active === "pass" && styles.fieldWrapActive]}
            >
              <View style={styles.fieldLabelRow}>
                <Ionicons name="lock-closed-outline" size={14} color={active === "pass" ? "#22c55e" : "#64748b"} />
                <Text style={[styles.fieldLabel, active === "pass" && styles.fieldLabelActive]}>Password</Text>
              </View>
              <TextInput
                style={styles.fieldInput}
                value={password.replace(/./g, "●")}
                onFocus={() => setActive("pass")}
                placeholder="••••••"
                placeholderTextColor="#334155"
                editable={false}
                pointerEvents="none"
              />
              {active === "pass" && <View style={styles.activeCaret} />}
            </TouchableOpacity>

            {/* Staff Name */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setActive("staff")}
              style={[styles.fieldWrap, active === "staff" && styles.fieldWrapActive]}
            >
              <View style={styles.fieldLabelRow}>
                <Ionicons name="person-outline" size={14} color={active === "staff" ? "#22c55e" : "#64748b"} />
                <Text style={[styles.fieldLabel, active === "staff" && styles.fieldLabelActive]}>Staff Name</Text>
              </View>
              <TextInput
                style={styles.fieldInput}
                value={staffName}
                onChangeText={setStaffName}
                onFocus={() => setActive("staff")}
                placeholder="Enter staff name"
                placeholderTextColor="#334155"
                editable
              />
              {active === "staff" && <View style={styles.activeCaret} />}
            </TouchableOpacity>

            {/* Status Pill */}
            <View style={styles.statusRow}>
              <View style={[styles.statusPill, { backgroundColor: shiftStarted ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)" }]}>
                <View style={[styles.statusDot, { backgroundColor: shiftStarted ? "#22c55e" : "#64748b" }]} />
                <Text style={[styles.statusText, { color: shiftStarted ? "#22c55e" : "#64748b" }]}>
                  {shiftStarted ? (onBreak ? "On Break" : "Shift Active") : "Not Clocked In"}
                </Text>
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <View style={styles.actionRow}>
              {!shiftStarted ? (
                <TouchableOpacity
                  style={styles.inBtn}
                  onPress={() => setShiftStarted(true)}
                >
                  <Ionicons name="log-in-outline" size={20} color="#052b12" />
                  <Text style={styles.actionBtnText}>CLOCK IN</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.outBtn}
                    onPress={() => { setShiftStarted(false); setOnBreak(false); }}
                  >
                    <Ionicons name="log-out-outline" size={18} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: "#fff" }]}>OUT</Text>
                  </TouchableOpacity>

                  {!onBreak ? (
                    <TouchableOpacity
                      style={styles.breakInBtn}
                      onPress={() => setOnBreak(true)}
                    >
                      <Ionicons name="pause-circle-outline" size={18} color="#052b12" />
                      <Text style={styles.actionBtnText}>BREAK</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.breakOutBtn}
                      onPress={() => setOnBreak(false)}
                    >
                      <Ionicons name="play-circle-outline" size={18} color="#fff" />
                      <Text style={[styles.actionBtnText, { color: "#fff" }]}>RESUME</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </BlurView>

          {/* ── KEYPAD ── */}
          <BlurView intensity={45} tint="dark" style={styles.keypadCard}>
            <View style={styles.keypadHeader}>
              <Text style={styles.keypadTitle}>
                {active === "user" ? "User ID" : active === "pass" ? "Password" : "Staff Name"}
              </Text>
              <Text style={styles.keypadValue} numberOfLines={1}>
                {active === "pass" ? getValue().replace(/./g, "●") || "—" : getValue() || "—"}
              </Text>
            </View>

            <View style={styles.keypadGrid}>
              {keypad.map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[
                    styles.keyBtn,
                    isSpecialKey(k) && styles.keyBtnSpecial,
                    k === "↵" && styles.keyBtnEnter,
                    k === "⌫" && styles.keyBtnDelete,
                  ]}
                  onPress={() => handleKeyPress(k)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.keyText,
                      isSpecialKey(k) && styles.keyTextSpecial,
                      k === "↵" && styles.keyTextEnter,
                    ]}
                  >
                    {k}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  safe: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(5,8,20,0.7)",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  backText: {
    color: "#fff",
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  brandName: {
    color: "#f1f5f9",
    fontFamily: Fonts.black,
    fontSize: 20,
    letterSpacing: 1,
  },
  brandAccent: {
    color: "#22c55e",
    fontFamily: Fonts.black,
    fontSize: 20,
    letterSpacing: 1,
  },
  clockBlock: {
    alignItems: "flex-end",
  },
  clockTime: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 18,
    letterSpacing: 1,
  },
  clockDate: {
    color: "#64748b",
    fontFamily: Fonts.medium,
    fontSize: 11,
    marginTop: 1,
  },

  /* Body */
  body: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "stretch",
    padding: 20,
    gap: 20,
  },

  /* Form Card */
  formCard: {
    flex: 1,
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  formHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  formIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(34,197,94,0.12)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  formTitle: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 18,
    letterSpacing: 0.5,
  },
  formSub: {
    color: "#475569",
    fontFamily: Fonts.medium,
    fontSize: 12,
    marginTop: 4,
  },

  /* Fields */
  fieldWrap: {
    backgroundColor: "rgba(15,23,42,0.8)",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    position: "relative",
  },
  fieldWrapActive: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.05)",
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  fieldLabel: {
    color: "#64748b",
    fontFamily: Fonts.semiBold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldLabelActive: {
    color: "#22c55e",
  },
  fieldInput: {
    color: "#fff",
    fontFamily: Fonts.extraBold,
    fontSize: 18,
    paddingVertical: 0,
  },
  activeCaret: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#22c55e",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },

  /* Status */
  statusRow: {
    alignItems: "center",
    marginVertical: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    letterSpacing: 0.3,
  },

  /* Action buttons */
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  inBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#22c55e",
    borderRadius: 14,
    paddingVertical: 16,
  },
  outBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.8)",
    borderRadius: 14,
    paddingVertical: 16,
  },
  breakInBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#f59e0b",
    borderRadius: 14,
    paddingVertical: 16,
  },
  breakOutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#8b5cf6",
    borderRadius: 14,
    paddingVertical: 16,
  },
  actionBtnText: {
    color: "#052b12",
    fontFamily: Fonts.black,
    fontSize: 14,
    letterSpacing: 0.5,
  },

  /* Keypad card */
  keypadCard: {
    flex: 1,
    maxWidth: 420,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  keypadHeader: {
    backgroundColor: "rgba(15,23,42,0.8)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    minHeight: 72,
    justifyContent: "center",
  },
  keypadTitle: {
    color: "#64748b",
    fontFamily: Fonts.semiBold,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  keypadValue: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 24,
    letterSpacing: 2,
  },
  keypadGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  keyBtn: {
    width: "22%",
    aspectRatio: 1.2,
    backgroundColor: "rgba(30,41,59,0.9)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  keyBtnSpecial: {
    backgroundColor: "rgba(51,65,85,0.9)",
    borderColor: "rgba(255,255,255,0.1)",
  },
  keyBtnDelete: {
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  keyBtnEnter: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderColor: "rgba(34,197,94,0.35)",
  },
  keyText: {
    color: "#f1f5f9",
    fontFamily: Fonts.black,
    fontSize: 20,
  },
  keyTextSpecial: {
    color: "#94a3b8",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  keyTextEnter: {
    color: "#22c55e",
    fontSize: 18,
  },
});