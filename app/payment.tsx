import { closeActiveOrder, findActiveOrder } from "./activeOrdersStore";
import { clearCart } from "./cartStore";
import { clearOrderContext, getOrderContext } from "./orderContextStore";
import { clearTable } from "./tableStatusStore";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";

import {
    ActivityIndicator,
    Dimensions,
    ImageBackground,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function PaymentScreen() {
  const router = useRouter();

  const context = getOrderContext();
  const activeOrder = context ? findActiveOrder(context) : undefined;

  const cart = React.useMemo(
    () => (activeOrder ? activeOrder.items : []),
    [activeOrder],
  );

  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

  /* ================= CALCULATIONS ================= */

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0),
    [cart],
  );

  const gst = subtotal * 0.09;
  const total = subtotal + gst;

  /* ================= STATE ================= */

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [cashInput, setCashInput] = useState<string>("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  /* ================= GUARD ================= */

  useEffect(() => {
    if (!context || cart.length === 0) {
      router.replace("/(tabs)/category" as any);
    }
  }, [context, cart.length, router]);

  /* ================= CASH LOGIC ================= */

  const paidAmount = parseFloat(cashInput) || 0;

  const change = paidAmount >= total ? paidAmount - total : 0;
  const remaining = paidAmount < total ? total - paidAmount : 0;

  const isCashValid = selectedMethod !== "CASH" || paidAmount >= total;

  /* ================= TENDER SUGGESTIONS ================= */

  const tenderOptions = useMemo(() => {
    const notes = [10, 20, 50, 100, 200, 500, 1000];
    return notes.filter((note) => note >= total);
  }, [total]);

  /* ================= PAYMENT HANDLER ================= */

  const handleConfirm = () => {
    if (!selectedMethod) return;
    if (selectedMethod === "CASH" && paidAmount < total) return;

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);

      /* CLOSE ACTIVE ORDER */

      if (activeOrder) {
        closeActiveOrder(activeOrder.orderId);
      }

      /* FREE TABLE */

      if (context?.orderType === "DINE_IN") {
        clearTable(context.section!, context.tableNo!);
      }

      setTimeout(() => {
        clearCart();
        clearOrderContext();

        router.replace("/(tabs)/category" as any);
      }, 3000);
    }, 2000);
  };

  /* ================= UI ================= */

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require("../assets/images/003.jpg")}
        style={{ width: SCREEN_W, height: SCREEN_H }}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* SUCCESS SCREEN */}

          {isSuccess && (
            <View style={styles.centerBox}>
              <Text style={styles.successText}>✅ PAYMENT SUCCESSFUL</Text>
              <Text style={styles.successSub}>Order Completed</Text>
            </View>
          )}

          {/* PROCESSING SCREEN */}

          {isProcessing && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#22c55e" />
              <Text style={styles.processingText}>Processing Payment...</Text>
            </View>
          )}

          {!isProcessing && !isSuccess && (
            <>
              {/* TOP BAR WITH BACK BUTTON */}
              <View style={styles.topBar}>
                <Pressable
                  style={styles.backBtn}
                  onPress={() => router.back()}
                >
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
              </View>

              {/* ORDER CONTEXT */}

              {context?.orderType === "DINE_IN" && (
                <Text style={styles.contextText}>
                  DINE-IN | {context.section} | Table {context.tableNo}
                </Text>
              )}

              {context?.orderType === "TAKEAWAY" && (
                <Text style={styles.contextText}>
                  TAKEAWAY | Order {context.takeawayNo}
                </Text>
              )}

              <Text style={styles.totalText}>
                Grand Total: ${total.toFixed(2)}
              </Text>

              {/* PAYMENT METHODS */}

              <View style={styles.methodRow}>
                {["CASH", "NETS", "PAYNOW", "CARD"].map((method) => (
                  <Pressable
                    key={method}
                    style={[
                      styles.methodBtn,
                      selectedMethod === method && styles.methodActive,
                    ]}
                    onPress={() => setSelectedMethod(method)}
                  >
                    <Text style={styles.methodText}>{method}</Text>
                  </Pressable>
                ))}
              </View>

              {/* CASH PAYMENT */}

              {selectedMethod === "CASH" && (
                <View style={styles.cashBox}>
                  <Text style={styles.label}>Customer Pays</Text>

                  <TextInput
                    keyboardType="decimal-pad"
                    value={cashInput}
                    onChangeText={setCashInput}
                    placeholder="0.00"
                    placeholderTextColor="#888"
                    style={styles.input}
                  />

                  {/* Tender Buttons */}

                  <View style={styles.tenderRow}>
                    {tenderOptions.map((amount) => (
                      <Pressable
                        key={amount}
                        style={styles.tenderBtn}
                        onPress={() => setCashInput(amount.toFixed(2))}
                      >
                        <Text style={styles.tenderText}>${amount}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {paidAmount < total && paidAmount > 0 && (
                    <Text style={styles.errorText}>
                      ⚠ Insufficient Amount{"\n"}
                      Remaining: ${remaining.toFixed(2)}
                    </Text>
                  )}

                  {paidAmount >= total && (
                    <Text style={styles.changeText}>
                      Change: ${change.toFixed(2)}
                    </Text>
                  )}
                </View>
              )}

              {/* CONFIRM BUTTON */}

              <Pressable
                style={[
                  styles.confirmBtn,
                  (!selectedMethod || !isCashValid) && styles.disabledBtn,
                ]}
                onPress={handleConfirm}
              >
                <Ionicons name="checkmark-circle-outline" size={24} color="#052b12" style={{marginRight: 8}} />
                <Text style={styles.confirmText}>Confirm Payment</Text>
              </Pressable>
            </>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  contextText: {
    color: "#d7ff9a",
    fontWeight: "800",
    marginBottom: 10,
  },

  topBar: {
    flexDirection: "row",
    marginBottom: 20,
  },

  backBtn: {
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  backText: {
    color: "#fff",
    fontWeight: "700",
  },

  totalText: {
    color: "#22c55e",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 20,
  },

  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  methodBtn: {
    padding: 12,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  methodActive: {
    backgroundColor: "rgba(34,197,94,0.85)",
    borderColor: "rgba(74,222,128,0.5)",
  },

  methodText: {
    color: "#fff",
    fontWeight: "800",
  },

  cashBox: {
    marginBottom: 20,
  },

  label: {
    color: "#e5e7eb",
    marginBottom: 5,
  },

  input: {
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  tenderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },

  tenderBtn: {
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  tenderText: {
    color: "#fff",
    fontWeight: "800",
  },

  errorText: {
    color: "#ef4444",
    fontWeight: "800",
  },

  changeText: {
    color: "#22c55e",
    fontWeight: "900",
  },

  confirmBtn: {
    flexDirection: "row",
    backgroundColor: "rgba(34,197,94,0.85)",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledBtn: {
    backgroundColor: "#555",
  },

  confirmText: {
    color: "#052b12",
    fontWeight: "900",
  },

  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  processingText: {
    marginTop: 10,
    color: "#fff",
    fontWeight: "700",
  },

  successText: {
    color: "#22c55e",
    fontSize: 22,
    fontWeight: "900",
  },

  successSub: {
    color: "#fff",
    marginTop: 10,
  },
});
