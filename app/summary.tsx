import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Dimensions,
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { findActiveOrder } from "./activeOrdersStore";
import { getOrderContext } from "./orderContextStore";

export default function SummaryScreen() {
  const router = useRouter();

  const context = getOrderContext();
  const activeOrder = context ? findActiveOrder(context) : undefined;

  const cart = useMemo(() => {
    return activeOrder ? activeOrder.items : [];
  }, [activeOrder]);

  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

  /* ================= CALCULATIONS ================= */

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0),
    [cart],
  );

  const GST_RATE = 0.09;
  const gst = subtotal * GST_RATE;
  const grandTotal = subtotal + gst;

  /* ================= GUARD ================= */

  if (!context || !activeOrder) {
    router.replace("/(tabs)/category");
    return null;
  }

  /* ================= UI ================= */

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require("../assets/images/003.jpg")}
        style={{ width: SCREEN_W, height: SCREEN_H }}
        resizeMode="cover"
      >
        <View style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.35)" }]}>
          <View style={styles.headerBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
            
            <View style={styles.headerInfo}>
              {context.orderType === "DINE_IN" ? (
                <Text style={styles.contextText}>
                  DINE-IN | {context.section} | Table {context.tableNo}
                </Text>
              ) : (
                <Text style={styles.contextText}>
                  TAKEAWAY | Order {context.takeawayNo}
                </Text>
              )}
              <Text style={styles.title}>ORDER SUMMARY</Text>
            </View>
          </View>

          <View style={styles.listContainer}>
            <FlatList
              data={cart}
              showsVerticalScrollIndicator={false}
              keyExtractor={(item, index) => item.id + index}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <View style={styles.rowContent}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    
                    <View style={styles.subInfoRow}>
                      <Text style={styles.qty}>Qty: {item.qty}</Text>
                      {(item.spicy && item.spicy !== "Medium") || (item.oil && item.oil !== "Normal") || (item.salt && item.salt !== "Normal") || (item.sugar && item.sugar !== "Normal") || item.note ? (
                        <Text style={styles.sub} numberOfLines={1}>
                          {[
                            item.spicy && item.spicy !== "Medium" ? `Spicy: ${item.spicy}` : "",
                            item.oil && item.oil !== "Normal" ? `Oil: ${item.oil}` : "",
                            item.salt && item.salt !== "Normal" ? `Salt: ${item.salt}` : "",
                            item.sugar && item.sugar !== "Normal" ? `Sugar: ${item.sugar}` : "",
                            item.note ? `Note: ${item.note}` : ""
                          ].filter(Boolean).join(" | ")}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <Text style={styles.price}>
                    ${((item.price || 0) * item.qty).toFixed(2)}
                  </Text>
                </View>
              )}
            />
          </View>

          <View style={styles.totalsContainer}>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Items</Text>
              <Text style={styles.summaryValue}>{totalItems}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST (9%)</Text>
              <Text style={styles.summaryValue}>${gst.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.grandLabel}>Grand Total</Text>
              <Text style={styles.grandValue}>${grandTotal.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.bottomFixed}>
            <Pressable
              style={styles.proceedBtn}
              onPress={() => router.push("/payment")}
            >
              <Text style={styles.proceedText}>Proceed to Payment</Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  headerBar: {
    flexDirection: "row",
    height: 70,
    alignItems: "center",
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    height: 40,
    justifyContent: "center",
    borderRadius: 8,
    marginRight: 16,
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  contextText: {
    color: "#d7ff9a",
    fontWeight: "800",
    fontSize: 12,
  },
  title: {
    color: "#9ef01a",
    fontSize: 20,
    fontWeight: "bold",
  },

  listContainer: {
    flex: 1,
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 16,
    height: 65,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowContent: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  qty: {
    color: "#9ef01a",
    fontWeight: "bold",
    fontSize: 13,
    marginRight: 10,
  },
  sub: {
    color: "#ccc",
    fontSize: 12,
    flex: 1,
  },
  price: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },

  totalsContainer: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  summaryValue: {
    color: "#9ef01a",
    fontWeight: "900",
    fontSize: 14,
  },
  grandLabel: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },
  grandValue: {
    color: "#22c55e",
    fontWeight: "900",
    fontSize: 18,
  },

  bottomFixed: {
    width: "100%",
    paddingBottom: 10,
  },
  proceedBtn: {
    backgroundColor: "#22c55e",
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
  },
  proceedText: {
    color: "#052b12",
    fontWeight: "900",
    fontSize: 16,
  },
});
