import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const total = String(params.total ?? "0");
  const paid = String(params.paidNum ?? "0");
  const change = String(params.change ?? "0");

  const orderId = String(params.orderId ?? "");
  const billNo = String(params.billNo ?? "");
  const tableNo = String(params.tableNo ?? "");
  const section = String(params.section ?? "");
  const orderType = String(params.orderType ?? "");
  const method = String(params.method ?? "");

  const handleDone = () => {
    router.replace({
      pathname: "/category",
      params: { section },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ImageBackground
        source={require("../assets/images/mesh_bg.png")}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <View style={styles.container}>
          <BlurView intensity={40} tint="dark" style={styles.card}>
            <Ionicons name="checkmark-circle" size={80} color="#22c55e" />

            <Text style={styles.title}>Payment Successful</Text>

            <Text style={styles.orderText}>Bill #{billNo || orderId}</Text>

            <Text style={styles.sub}>
              {orderType === "DINE_IN"
                ? `Table ${tableNo} • ${section}`
                : `Takeaway • ${section}`}
            </Text>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Payment Method</Text>
              <Text style={styles.value}>{method}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total</Text>
              <Text style={styles.value}>${total}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Paid</Text>
              <Text style={styles.value}>${paid}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Change</Text>
              <Text style={styles.value}>${change}</Text>
            </View>

            <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },

  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "900",
    marginTop: 10,
  },

  orderText: {
    color: "#22c55e",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },

  sub: {
    color: "#94a3b8",
    marginBottom: 16,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    width: "100%",
    marginVertical: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10,
  },

  label: {
    color: "#94a3b8",
  },

  value: {
    color: "#fff",
    fontWeight: "800",
  },

  doneBtn: {
    marginTop: 20,
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },

  doneText: {
    color: "#052b12",
    fontWeight: "900",
    fontSize: 16,
  },
});
