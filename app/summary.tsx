import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DiscountModal from "../components/DiscountModal";
import { findActiveOrder } from "../stores/activeOrdersStore";
import { useCartStore } from "../stores/cartStore";
import { getOrderContext } from "../stores/orderContextStore";

export default function SummaryScreen() {
  const router = useRouter();

  const context = getOrderContext();
  const activeOrder = context ? findActiveOrder(context) : undefined;

  const [showDiscount, setShowDiscount] = useState(false);

  const cart = useMemo(() => {
    return activeOrder ? activeOrder.items : [];
  }, [activeOrder]);

  const discountInfo = useCartStore((s) => {
    const id = s.currentContextId;
    return id ? s.discounts[id] : null;
  });

  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();

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

  /* 🔥 DISCOUNT LOGIC (CORRECT) */
  const discountAmount = useMemo(() => {
    if (!discountInfo?.applied) return 0;

    if (discountInfo.type === "percentage") {
      return (subtotal * discountInfo.value) / 100;
    } else {
      return discountInfo.value;
    }
  }, [discountInfo, subtotal]);

  const discountedSubtotal = subtotal - discountAmount;

  const gst = discountedSubtotal * GST_RATE;

  const grandTotal = discountedSubtotal + gst;

  /* ================= GUARD ================= */

  if (!context) return null;

  if (!activeOrder) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>Loading order...</Text>
      </View>
    );
  }

  /* ================= UI ================= */

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require("../assets/images/a4.jpg")}
        style={{ width: SCREEN_W, height: SCREEN_H }}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          <View
            style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.35)" }]}
          >
            {/* HEADER */}
            <View style={styles.headerBar}>
              <Pressable style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>

              <TouchableOpacity
                style={[
                  styles.backBtn,
                  { backgroundColor: "rgba(34,197,94,0.15)" },
                ]}
                onPress={() => router.push("/kds")}
              >
                <Text style={[styles.backBtnText, { color: "#22c55e" }]}>
                  KDS Demo n
                </Text>
              </TouchableOpacity>

              {/* 🔥 DISCOUNT BUTTON */}
              <TouchableOpacity
                style={[
                  styles.backBtn,
                  { backgroundColor: "rgba(255,215,0,0.15)" },
                ]}
                onPress={() => setShowDiscount(true)}
              >
                <Text style={[styles.backBtnText, { color: "#ffd700" }]}>
                  Discount
                </Text>
              </TouchableOpacity>

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

            {/* LIST */}
            <View style={styles.listContainer}>
              <FlatList
                data={cart}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item, index) => item.id + index}
                renderItem={({ item }) => (
                  <View style={styles.row}>
                    <View style={styles.rowContent}>
                      <Text style={styles.name} numberOfLines={1}>
                        {item.name}
                      </Text>

                      <View style={styles.subInfoRow}>
                        <Text style={styles.qty}>Qty: {item.qty}</Text>
                        {(item.spicy && item.spicy !== "Medium") ||
                        (item.oil && item.oil !== "Normal") ||
                        (item.salt && item.salt !== "Normal") ||
                        (item.sugar && item.sugar !== "Normal") ||
                        item.note ? (
                          <Text style={styles.sub} numberOfLines={1}>
                            {[
                              item.spicy && item.spicy !== "Medium"
                                ? `Spicy: ${item.spicy}`
                                : "",
                              item.oil && item.oil !== "Normal"
                                ? `Oil: ${item.oil}`
                                : "",
                              item.salt && item.salt !== "Normal"
                                ? `Salt: ${item.salt}`
                                : "",
                              item.sugar && item.sugar !== "Normal"
                                ? `Sugar: ${item.sugar}`
                                : "",
                              item.note ? `Note: ${item.note}` : "",
                            ]
                              .filter(Boolean)
                              .join(" | ")}
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

            {/* TOTALS */}
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

              {/* 🔥 DISCOUNT DISPLAY */}
              {discountInfo?.applied && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: "#ff4444" }]}>
                    Discount
                  </Text>
                  <Text style={[styles.summaryValue, { color: "#ff4444" }]}>
                    -${discountAmount.toFixed(2)}
                  </Text>
                </View>
              )}

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

            {/* BUTTON */}
            <View style={styles.bottomFixed}>
              <Pressable
                style={styles.proceedBtn}
                onPress={() => router.push("/payment")}
              >
                <Ionicons
                  name="card-outline"
                  size={24}
                  color="#052b12"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.proceedText}>Proceed to Payment</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* DISCOUNT MODAL */}
      <DiscountModal
        visible={showDiscount}
        onClose={() => setShowDiscount(false)}
        currentTotal={subtotal}
      />
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    paddingTop: 10,
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
    fontSize: 14,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 24,
    fontWeight: "bold",
  },

  listContainer: {
    flex: 1,
    marginTop: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    paddingHorizontal: 16,
    height: 70,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
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
    flexDirection: "row",
    backgroundColor: "rgba(34,197,94,0.85)",
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
