import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  findActiveOrder,
  useActiveOrdersStore,
} from "../stores/activeOrdersStore";
import { clearCart } from "../stores/cartStore";
import {
  clearOrderContext,
  getOrderContext,
} from "../stores/orderContextStore";
import { useTableStatusStore } from "../stores/tableStatusStore";

const API_URL = "https://cafepos-production-3428.up.railway.app";

export default function PaymentScreen() {
  const closeActiveOrder = useActiveOrdersStore((s) => s.closeActiveOrder);
  const clearTable = useTableStatusStore((s) => s.clearTable);
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTabletPortrait = width >= 768 && width < 1024 && height > width;
  const showOrderPanel = !isMobile && !isTabletPortrait;

  const context = getOrderContext();
  const activeOrder = context ? findActiveOrder(context) : undefined;

  const cart = useMemo(
    () => (activeOrder ? activeOrder.items : []),
    [activeOrder],
  );

  const discount = activeOrder?.discount;

  const [method, setMethod] = useState("CASH");
  const [cashInput, setCashInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [time, setTime] = useState(new Date());

  /* ================= CALCULATIONS ================= */

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0),
    [cart],
  );

  const GST_RATE = 0.09;

  const discountAmount = useMemo(() => {
    if (!discount?.applied) return 0;

    if (discount.type === "percentage") {
      return (subtotal * discount.value) / 100;
    } else {
      return discount.value;
    }
  }, [discount, subtotal]);

  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * GST_RATE;
  const total = discountedSubtotal + tax;

  const paidNum = parseFloat(cashInput) || 0;
  const change = Math.max(0, paidNum - total);

  const quickCash = [20, 50, 100, 200, 500, 1000];

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  /* ================= TEST API ================= */
  const testAPI = async () => {
    try {
      console.log("🧪 Testing API connection...");
      Alert.alert("Testing", "Checking API connection...");
      
      // Test basic endpoint
      const response = await fetch(`${API_URL}/test`);
      const data = await response.text();
      console.log("✅ Test endpoint response:", data);
      
      // Test save endpoint with dummy data
      const testSave = await fetch(`${API_URL}/api/sales/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "TEST-" + Date.now(),
          orderType: "TEST",
          tableNo: "TEST",
          section: "TEST",
          items: [{ dishId: "test", name: "Test Item", qty: 1, price: 10 }],
          subTotal: 10,
          taxAmount: 0.9,
          discountAmount: 0,
          totalAmount: 10.9,
          paymentMethod: "CASH",
          cashierId: "FFA46DDA-2871-42BB-BE6D-A547AE9C1B88"
        })
      });
      
      const testResult = await testSave.json();
      console.log("✅ Save test result:", testResult);
      
      Alert.alert("API Test", `Success!\n${JSON.stringify(testResult)}`);
    } catch (error: any) {
      console.error("❌ Test error:", error);
      Alert.alert("API Test Failed", error.message);
    }
  };

  /* ================= SAVE SALE TO DATABASE ================= */

  const saveSaleToDatabase = async () => {
    try {
      console.log("💾 Saving sale to database...");
      console.log("Order ID:", activeOrder?.orderId);
      console.log("Total Amount:", total);
      console.log("Payment Method:", method);
      
      const saleData = {
        orderId: activeOrder?.orderId,
        orderType: context?.orderType,
        tableNo: context?.tableNo || context?.takeawayNo,
        section: context?.section,
        items: cart.map(item => ({
          dishId: item.id,
          name: item.name,
          qty: item.qty,
          price: item.price
        })),
        subTotal: subtotal,
        taxAmount: tax,
        discountAmount: discountAmount,
        totalAmount: total,
        paymentMethod: method,
        cashierId: "FFA46DDA-2871-42BB-BE6D-A547AE9C1B88"
      };
      
      console.log("Sending data:", JSON.stringify(saleData, null, 2));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_URL}/api/sales/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response data:", result);
      
      if (result.success) {
        console.log("✅ Sale saved successfully:", result.settlementId);
        return true;
      } else {
        console.log("⚠️ Sale save failed:", result);
        return false;
      }
    } catch (error: any) {
      console.error("❌ Failed to save sale:", error);
      if (error.name === 'AbortError') {
        console.log("Request timeout");
      }
      return false;
    }
  };

  /* ================= PAYMENT ================= */

  const confirmPayment = async () => {
    if (method === "CASH" && paidNum < total) {
      Alert.alert("Insufficient Payment", `Please enter at least $${total.toFixed(2)}`);
      return;
    }

    setProcessing(true);

    console.log("🟢 Starting payment confirmation...");
    console.log("📦 Order ID:", activeOrder?.orderId);
    console.log("💰 Total amount:", total);
    console.log("💳 Payment method:", method);

    // 🔥 SAVE SALE TO DATABASE
    console.log("💾 Calling saveSaleToDatabase...");
    const saved = await saveSaleToDatabase();
    console.log("✅ saveSaleToDatabase completed, success:", saved);

    const printBill = () => {
      const html = `
        <html>
          <body>
            <h2>POS BILL</h2>
            <p>Order: ${activeOrder?.orderId}</p>
            <hr/>
            ${cart
              .map(
                (i) => `
              <p>${i.qty} x ${i.name} - $${((i.price || 0) * i.qty).toFixed(2)}</p>
            `,
              )
              .join("")}
            <hr/>
            <p>Subtotal: $${subtotal.toFixed(2)}</p>
            <p>Discount: -$${discountAmount.toFixed(2)}</p>
            <p>Tax: $${tax.toFixed(2)}</p>
            <p><b>Total: $${total.toFixed(2)}</b></p>
            <p>Paid: $${paidNum.toFixed(2)}</p>
            <p>Change: $${change.toFixed(2)}</p>
            <h4>Thank You!</h4>
          </body>
        </html>
      `;

      if (Platform.OS === "web") {
        const win = window.open("", "", "width=300,height=600");
        if (win) {
          win.document.write(html);
          win.document.close();
          win.print();
        }
      } else {
        console.log("Printing not available natively without expo-print package.");
      }
    };

    printBill();

    setTimeout(() => {
      router.replace({
        pathname: "/payment_success",
        params: {
          total: total.toFixed(2),
          paidNum: paidNum.toFixed(2),
          change: change.toFixed(2),
          method,
          orderId: activeOrder?.orderId ?? "",
          tableNo: context?.tableNo ?? "",
          section: context?.section ?? "",
          orderType: context?.orderType ?? "",
        },
      });

      if (activeOrder) {
        closeActiveOrder(activeOrder.orderId);
        console.log("✅ Closed order:", activeOrder.orderId);
      }

      if (context) {
        if (
          context.orderType === "DINE_IN" &&
          context.section &&
          context.tableNo
        ) {
          clearTable(context.section, context.tableNo);
          console.log("✅ Cleared table:", context.section, context.tableNo);
        }

        if (context.orderType === "TAKEAWAY" && context.takeawayNo) {
          clearTable("TAKEAWAY", context.takeawayNo);
          console.log("✅ Cleared takeaway:", context.takeawayNo);
        }
      }

      clearCart();
      clearOrderContext();

      setProcessing(false);
    }, 800);
  };

  /* ================= RENDER ================= */

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemRow}>
      <Text style={styles.itemQty}>{item.qty}x</Text>
      <Text style={styles.itemName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.itemPrice}>
        ${(item.price * item.qty).toFixed(2)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ImageBackground
        source={require("../assets/images/a4.jpg")}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.orderInfo}>
              <Text style={styles.orderTitle}>
                Order #{activeOrder?.orderId}
              </Text>
              <Text style={styles.orderSub}>
                {context?.orderType === "DINE_IN"
                  ? `Table ${context?.tableNo} • ${context?.section}`
                  : `Takeaway • ${context?.section}`}
              </Text>
            </View>

            <View style={styles.rightHeader}>
              <TouchableOpacity
                style={styles.testBtn}
                onPress={testAPI}
              >
                <Text style={styles.testBtnText}>Test</Text>
              </TouchableOpacity>
              <Text style={styles.dateTime}>
                {time.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>

          {/* MAIN */}
          <View
            style={[styles.mainLayout, !showOrderPanel && styles.mobileLayout]}
          >
            {/* LEFT */}
            <BlurView intensity={40} tint="dark" style={styles.leftPane}>
              <Text style={styles.sectionLabel}>Grand Total</Text>
              <Text style={styles.grandTotal}>${total.toFixed(2)}</Text>

              <View style={styles.breakdown}>
                <View style={styles.breakRow}>
                  <Text style={styles.breakLabel}>Subtotal</Text>
                  <Text style={styles.breakValue}>${subtotal.toFixed(2)}</Text>
                </View>

                {discount?.applied && (
                  <View style={styles.breakRow}>
                    <Text style={[styles.breakLabel, { color: "#ff4444" }]}>
                      Discount
                    </Text>
                    <Text style={[styles.breakValue, { color: "#ff4444" }]}>
                      -${discountAmount.toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.breakRow}>
                  <Text style={styles.breakLabel}>Tax (9%)</Text>
                  <Text style={styles.breakValue}>${tax.toFixed(2)}</Text>
                </View>
              </View>
            </BlurView>

            {/* CENTER */}
            <BlurView intensity={40} tint="dark" style={styles.centerPane}>
              <Text style={styles.sectionLabel}>Payment Method</Text>

              <View style={styles.methodRow}>
                {[
                  { id: "CASH", icon: "money-bill-wave" },
                  { id: "CARD", icon: "credit-card" },
                  { id: "NETS", icon: "exchange-alt" },
                  { id: "PAYNOW", icon: "qrcode" },
                ].map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.methodCard,
                      method === m.id && styles.activeMethod,
                    ]}
                    onPress={() => setMethod(m.id)}
                  >
                    <FontAwesome5
                      name={m.icon}
                      size={22}
                      color={method === m.id ? "#052b12" : "#94a3b8"}
                    />
                    <Text
                      style={[
                        styles.methodText,
                        method === m.id && { color: "#052b12" },
                      ]}
                    >
                      {m.id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {method === "CASH" && (
                <>
                  <View style={styles.cashInputBox}>
                    <Text style={styles.currency}>$</Text>
                    <TextInput
                      style={styles.cashInput}
                      keyboardType="numeric"
                      value={cashInput}
                      onChangeText={setCashInput}
                      placeholder="20.00"
                      placeholderTextColor="#475569"
                    />
                  </View>

                  <View style={styles.quickGrid}>
                    {quickCash.map((v) => (
                      <TouchableOpacity
                        key={v}
                        style={styles.quickBtn}
                        onPress={() => setCashInput(v.toFixed(2))}
                      >
                        <Text style={styles.quickText}>${v}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.changeBox}>
                    <Text style={styles.changeLabel}>Change</Text>
                    <Text style={styles.changeValue}>${change.toFixed(2)}</Text>
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  method === "CASH" && paidNum < total && styles.disabled,
                ]}
                disabled={processing || (method === "CASH" && paidNum < total)}
                onPress={confirmPayment}
              >
                {processing ? (
                  <ActivityIndicator color="#052b12" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#052b12"
                    />
                    <Text style={styles.confirmText}>Confirm Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </BlurView>

            {/* RIGHT */}
            {showOrderPanel && (
              <BlurView intensity={40} tint="dark" style={styles.rightPane}>
                <Text style={styles.receiptTitle}>Order Items</Text>

                <FlatList
                  data={cart}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={renderItem}
                  showsVerticalScrollIndicator={false}
                />

                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Total</Text>
                  <Text style={styles.receiptTotalValue}>
                    ${total.toFixed(2)}
                  </Text>
                </View>
              </BlurView>
            )}
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: "#fff", fontWeight: "700" },
  orderInfo: { alignItems: "center" },
  orderTitle: { color: "#fff", fontWeight: "900", fontSize: 16 },
  orderSub: { color: "#94a3b8", fontSize: 12 },
  rightHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  testBtn: {
    backgroundColor: "rgba(255,165,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  testBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  dateTime: { color: "#94a3b8" },

  mainLayout: { flex: 1, flexDirection: "row", gap: 16 },
  mobileLayout: { flexDirection: "column" },

  leftPane: { flex: 0.7, padding: 16, borderRadius: 18 },
  centerPane: { flex: 2, padding: 16, borderRadius: 18 },
  rightPane: { flex: 1, padding: 16, borderRadius: 18 },

  sectionLabel: { color: "#94a3b8", marginBottom: 6 },
  grandTotal: { fontSize: 40, fontWeight: "900", color: "#22c55e" },

  breakdown: { flexDirection: "column", gap: 12, marginTop: 24, paddingRight: 8 },
  breakRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakLabel: { color: "#64748b", fontSize: 16 },
  breakValue: { color: "#fff", fontSize: 18, fontWeight: "800" },

  methodRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  methodCard: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  activeMethod: { backgroundColor: "#22c55e" },
  methodText: {
    marginTop: 4,
    fontWeight: "800",
    fontSize: 12,
    color: "#94a3b8",
  },

  cashInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  currency: { color: "#94a3b8", fontSize: 24 },
  cashInput: { flex: 1, color: "#fff", fontSize: 30, fontWeight: "900" },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  quickBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: "30%",
    alignItems: "center",
  },
  quickText: { color: "#fff", fontWeight: "900", fontSize: 18 },

  changeBox: { marginBottom: 12 },
  changeLabel: { color: "#94a3b8" },
  changeValue: { fontSize: 36, fontWeight: "900", color: "#22c55e" },

  confirmBtn: {
    backgroundColor: "#22c55e",
    height: 64,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmText: { color: "#052b12", fontWeight: "900", fontSize: 16 },
  disabled: { backgroundColor: "rgba(34,197,94,0.4)" },

  receiptTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  itemQty: { width: 30, color: "#94a3b8" },
  itemName: { flex: 1, color: "#fff" },
  itemPrice: { color: "#22c55e", fontWeight: "800" },

  receiptTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 10,
  },
  receiptTotalLabel: { color: "#fff", fontWeight: "800" },
  receiptTotalValue: { color: "#22c55e", fontWeight: "900", fontSize: 18 },
});