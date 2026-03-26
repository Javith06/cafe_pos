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
import { findActiveOrder, useActiveOrdersStore } from "../stores/activeOrdersStore";
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

  const applyDiscount = useCartStore((s) => s.applyDiscount);
  const updateOrderDiscount = useActiveOrdersStore((s) => s.updateOrderDiscount);

  const handleFOC = () => {
    const discountData = {
      applied: true,
      type: "percentage" as const,
      value: 100,
    };
    applyDiscount(discountData);

    const currentContext = getOrderContext();
    if (currentContext) {
      updateOrderDiscount(currentContext, discountData);
    }
  };

  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const isLandscape = SCREEN_W > SCREEN_H;

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
            style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.4)" }]}
          >
            {/* HEADER */}
            <View style={styles.headerBar}>
              <Pressable style={styles.iconBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </Pressable>

              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  { backgroundColor: "rgba(34,197,94,0.15)", width: "auto", paddingHorizontal: 16 },
                ]}
                onPress={() => router.push("/kds")}
              >
                <Ionicons name="tv-outline" size={20} color="#22c55e" style={isLandscape ? { marginRight: 8 } : {}} />
                {isLandscape && (
                  <Text style={[styles.backBtnText, { color: "#22c55e" }]}>
                    KDS Demo
                  </Text>
                )}
              </TouchableOpacity>

              {/* 🔥 DISCOUNT BUTTON */}
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  { backgroundColor: "rgba(255,215,0,0.15)", width: "auto", paddingHorizontal: 16 },
                ]}
                onPress={() => setShowDiscount(true)}
              >
                <Ionicons name="pricetag-outline" size={20} color="#ffd700" style={isLandscape ? { marginRight: 8 } : {}} />
                {isLandscape && (
                  <Text style={[styles.backBtnText, { color: "#ffd700" }]}>
                    Discount
                  </Text>
                )}
              </TouchableOpacity>

              {/* 🔥 FOC BUTTON */}
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  { backgroundColor: "rgba(239, 68, 68, 0.15)", width: "auto", paddingHorizontal: 16 },
                ]}
                onPress={handleFOC}
              >
                <Ionicons name="gift-outline" size={20} color="#ef4444" style={isLandscape ? { marginRight: 8 } : {}} />
                {isLandscape && (
                  <Text style={[styles.backBtnText, { color: "#ef4444" }]}>
                    FOC
                  </Text>
                )}
              </TouchableOpacity>

              {/* CENTERED TITLE */}
              <View style={styles.headerTitleContainer} pointerEvents="none">
                <Text style={[styles.title, !isLandscape && { fontSize: 20 }]}>ORDER SUMMARY</Text>
                {context.orderType === "DINE_IN" ? (
                  <Text style={[styles.contextText, !isLandscape && { fontSize: 11 }]}>
                    DINE-IN • {context.section} • Table {context.tableNo}
                  </Text>
                ) : (
                  <Text style={[styles.contextText, !isLandscape && { fontSize: 11 }]}>
                    TAKEAWAY • Order {context.takeawayNo}
                  </Text>
                )}
              </View>
            </View>

            {/* MAIN CONTENT AREA */}
            <View style={[styles.mainContent, isLandscape && styles.mainContentLandscape]}>
              
              {/* LIST */}
              <View style={[styles.listContainer, isLandscape && styles.listContainerLandscape]}>
                <FlatList
                  data={cart}
                  showsVerticalScrollIndicator={false}
                  keyExtractor={(item, index) => item.id + index}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  renderItem={({ item }) => (
                    <View style={styles.row}>
                      <View style={styles.rowContent}>
                        <Text style={styles.name}>
                          {item.name}
                        </Text>

                        <View style={styles.subInfoRow}>
                          <Text style={styles.qty}>Qty: {item.qty}</Text>
                          {(item.spicy && item.spicy !== "Medium") ||
                          (item.oil && item.oil !== "Normal") ||
                          (item.salt && item.salt !== "Normal") ||
                          (item.sugar && item.sugar !== "Normal") ||
                          item.note ? (
                            <Text style={styles.sub}>
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

              {/* TOTALS RECEIPT CARD */}
              <View style={[styles.receiptContainer, isLandscape && styles.receiptContainerLandscape]}>
                <View style={styles.receiptCard}>
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

                  {/* DASHED DIVIDER */}
                  <View style={styles.dashedDivider}>
                    <View style={styles.dashLine} />
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.grandLabel}>Grand Total</Text>
                    <Text style={styles.grandValue}>${grandTotal.toFixed(2)}</Text>
                  </View>

                  {/* CHECKOUT BUTTON */}
                  <Pressable
                    style={styles.proceedBtn}
                    onPress={() => router.push("/payment")}
                  >
                    <Ionicons
                      name="card"
                      size={24}
                      color="#052b12"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.proceedText}>Proceed to Payment</Text>
                  </Pressable>
                </View>
              </View>

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
    height: 60,
    alignItems: "center",
  },
  iconBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    height: 44,
    minWidth: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginRight: 10,
    flexDirection: "row",
  },
  backBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  headerTitleContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: -1, // Keep it behind buttons so tapping buttons works
  },
  contextText: {
    color: "#d7ff9a",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  mainContent: {
    flex: 1,
    flexDirection: "column",
  },
  mainContentLandscape: {
    flexDirection: "row",
    marginTop: 10,
  },

  listContainer: {
    flex: 1,
    marginTop: 16,
  },
  listContainerLandscape: {
    marginRight: 20,
    marginTop: 0,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.65)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderLeftWidth: 4,
    borderLeftColor: "#9ef01a", // Accent strip
  },
  rowContent: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 12,
  },
  name: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 17,
    marginBottom: 4,
  },
  subInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  qty: {
    color: "#9ef01a",
    fontWeight: "900",
    fontSize: 14,
    marginRight: 10,
    backgroundColor: "rgba(158, 240, 26, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
  sub: {
    color: "#a1a1aa",
    fontSize: 13,
    flex: 1,
    fontWeight: "500",
    lineHeight: 18,
  },
  price: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },

  receiptContainer: {
    width: "100%",
  },
  receiptContainerLandscape: {
    width: 360, // Fixed width for right-side totals on tablet
  },
  receiptCard: {
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: 24,
    padding: 24,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    color: "#a1a1aa",
    fontWeight: "600",
    fontSize: 15,
  },
  summaryValue: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  dashedDivider: {
    height: 1,
    width: "100%",
    overflow: "hidden",
    marginVertical: 16,
  },
  dashLine: {
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    margin: -1,
    marginBottom: 0,
  },
  grandLabel: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
    textTransform: "uppercase",
  },
  grandValue: {
    color: "#4ade80",
    fontWeight: "900",
    fontSize: 26,
  },

  proceedBtn: {
    flexDirection: "row",
    backgroundColor: "#22c55e",
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    marginTop: 20,
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  proceedText: {
    color: "#052b12",
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: 0.5,
  },
});

