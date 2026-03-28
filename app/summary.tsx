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
  Modal,
  TextInput,
  Alert,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import DiscountModal from "../components/DiscountModal";
import { findActiveOrder, useActiveOrdersStore } from "../stores/activeOrdersStore";
import { useCartStore } from "../stores/cartStore";
import { getOrderContext } from "../stores/orderContextStore";
import { useTableStatusStore } from "../stores/tableStatusStore";

export default function SummaryScreen() {
  const router = useRouter();

  const context = getOrderContext();
  const activeOrder = context ? findActiveOrder(context) : undefined;

  const [showDiscount, setShowDiscount] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPassword, setCancelPassword] = useState("");

  const cart = useMemo(() => {
    return activeOrder ? activeOrder.items : [];
  }, [activeOrder]);

  const discountInfo = useCartStore((s) => {
    const id = s.currentContextId;
    return id ? s.discounts[id] : null;
  });

  const applyDiscount = useCartStore((s) => s.applyDiscount);
  const clearCart = useCartStore((s) => s.clearCart);
  const updateOrderDiscount = useActiveOrdersStore((s) => s.updateOrderDiscount);
  const closeActiveOrder = useActiveOrdersStore((s) => s.closeActiveOrder);
  const updateTableStatus = useTableStatusStore((s) => s.updateTableStatus);

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

  const handleCancelOrder = () => {
    if (cancelPassword !== "786") {
      Alert.alert("Error", "Incorrect admin password.");
      return;
    }

    if (context && activeOrder) {
      closeActiveOrder(activeOrder.orderId);
      clearCart();
      if (context.orderType === "DINE_IN" && context.section && context.tableNo) {
        updateTableStatus(context.section, context.tableNo, "", "EMPTY");
      }
    }
    
    setShowCancelModal(false);
    setCancelPassword("");
    router.replace("/(tabs)/category");
  };

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
              <View style={styles.headerLeft}>
                <Pressable style={styles.iconBtn} onPress={() => router.back()}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </Pressable>

                <View style={styles.headerTitleContainer}>
                  <Text style={[styles.title, !isLandscape && { fontSize: 16 }]} numberOfLines={1}>ORDER SUMMARY</Text>
                  {context.orderType === "DINE_IN" ? (
                    <Text style={[styles.contextText, !isLandscape && { fontSize: 10 }]} numberOfLines={1}>
                      DINE-IN • {context.section} • Table {context.tableNo}
                    </Text>
                  ) : (
                    <Text style={[styles.contextText, !isLandscape && { fontSize: 10 }]} numberOfLines={1}>
                      TAKEAWAY • Order {context.takeawayNo}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "rgba(239, 68, 68, 0.25)", marginRight: 6 }]}
                  onPress={() => setShowCancelModal(true)}
                >
                  <Ionicons name="trash-outline" size={18} color="#fca5a5" />
                  {isLandscape && <Text style={[styles.actionBtnText, { color: "#fca5a5" }]}>Cancel</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "rgba(34,197,94,0.15)" }]}
                  onPress={() => router.push("/kds")}
                >
                  <Ionicons name="tv-outline" size={18} color="#22c55e" />
                  {isLandscape && <Text style={[styles.actionBtnText, { color: "#22c55e" }]}>KDS</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "rgba(255,215,0,0.15)" }]}
                  onPress={() => setShowDiscount(true)}
                >
                  <Ionicons name="pricetag-outline" size={18} color="#ffd700" />
                  {isLandscape && <Text style={[styles.actionBtnText, { color: "#ffd700" }]}>Discount</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}
                  onPress={handleFOC}
                >
                  <Ionicons name="gift-outline" size={18} color="#ef4444" />
                  {isLandscape && <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>FOC</Text>}
                </TouchableOpacity>
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

      {/* CANCEL MODAL */}
      <Modal transparent visible={showCancelModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order?</Text>
            <Text style={styles.modalDesc}>Please enter admin password to cancel.</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              autoFocus
              keyboardType="number-pad"
              value={cancelPassword}
              onChangeText={setCancelPassword}
              placeholder="Admin Password"
              placeholderTextColor="#6b7280"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setShowCancelModal(false); setCancelPassword(""); }}>
                <Text style={styles.modalBtnTextCancel}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleCancelOrder}>
                <Text style={styles.modalBtnTextConfirm}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    alignItems: "center",
    height: 60,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
    justifyContent: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnText: {
    fontWeight: "700",
    fontSize: 13,
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

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1f2937",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  modalDesc: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "rgba(0,0,0,0.3)",
    color: "#fff",
    padding: 14,
    borderRadius: 8,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  modalBtnTextCancel: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalBtnConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
  },
  modalBtnTextConfirm: {
    color: "#fff",
    fontWeight: "bold",
  },
});

