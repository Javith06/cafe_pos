import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

type ActiveField = "user" | "pass" | "staff";

export default function TimeEntry() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isTablet = width < 900;

  const [userId, setUserId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");
  const [active, setActive] = useState<ActiveField>("user");

  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const date = time.toLocaleDateString("en-GB");
  const clock = time.toLocaleTimeString("en-GB");

  const keypad: string[] = [
    "1",
    "2",
    "3",
    "Bksp",
    "4",
    "5",
    "6",
    "Space",
    "7",
    "8",
    "9",
    "Clear",
    "0",
    "00",
    ".",
    "Ent",
  ];

  const getValue = (): string => {
    if (active === "user") return userId;
    if (active === "pass") return password;
    return staffName;
  };

  const setValue = (val: string): void => {
    if (active === "user") setUserId(val);
    if (active === "pass") setPassword(val);
    if (active === "staff") setStaffName(val);
  };

  const handleKeyPress = (key: string): void => {
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

  return (
    <ImageBackground
      source={require("../assets/images/11.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {/* HEADER */}
        <BlurView intensity={40} tint="dark" style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            SMART <Text style={{ color: "#e38b29" }}>Café</Text>
          </Text>

          <Text style={styles.time}>
            {date} {clock}
          </Text>
        </BlurView>

        {/* CONTENT */}
        <View
          style={[
            styles.content,
            { flexDirection: isTablet ? "column" : "row" },
          ]}
        >
          {/* LOGIN FORM */}
          <BlurView intensity={40} tint="dark" style={styles.form}>
            <Text style={styles.label}>User ID</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              onFocus={() => setActive("user")}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={() => setActive("pass")}
            />

            <Text style={styles.label}>Staff Name</Text>
            <TextInput
              style={styles.input}
              value={staffName}
              onChangeText={setStaffName}
              onFocus={() => setActive("staff")}
            />

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.inBtn}>
                <Text style={styles.btnText}>IN</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.outBtn}>
                <Text style={styles.btnText}>OUT</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.buttons, { marginTop: 15 }]}>
              <TouchableOpacity style={styles.breakInBtn}>
                <Text style={styles.btnText}>Break IN</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.breakOutBtn}>
                <Text style={styles.btnText}>Break OUT</Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* KEYPAD */}
          <BlurView intensity={40} tint="dark" style={styles.keypad}>
            {keypad.map((k) => (
              <TouchableOpacity
                key={k}
                style={styles.key}
                onPress={() => handleKeyPress(k)}
              >
                <Text style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </BlurView>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 20,
  },

  back: {
    color: "#fff",
    fontWeight: "700",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },

  time: {
    color: "#fff",
    fontWeight: "600",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
    width: "100%",
  },

  form: {
    width: "100%",
    maxWidth: 380,
    padding: 20,
    borderRadius: 18,
  },

  label: {
    color: "#fff",
    marginBottom: 6,
    marginTop: 10,
    fontSize: 14,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 16,
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 22,
  },

  inBtn: {
    backgroundColor: "#6ccf9f",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  outBtn: {
    backgroundColor: "#e58f8f",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  breakInBtn: {
    backgroundColor: "#60a5fa",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  breakOutBtn: {
    backgroundColor: "#c084fc",
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  btnText: {
    fontWeight: "800",
    fontSize: 14,
    textAlign: "center",
  },

  keypad: {
    width: "100%",
    maxWidth: 340,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
  },

  key: {
    width: "23%",
    height: 60,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  keyText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
