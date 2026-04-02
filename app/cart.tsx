import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";

import {
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { OrderItem, useActiveOrdersStore } from "../stores/activeOrdersStore";
import { CartItem, useCartStore } from "../stores/cartStore";
import { holdOrder } from "../stores/heldOrdersStore";
import { useOrderContextStore } from "../stores/orderContextStore";
import { getNextOrderId } from "../stores/orderIdStore";
import { useTableStatusStore } from "../stores/tableStatusStore";

const STABLE_EMPTY_ARRAY: any[] = [];

export default function CartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [cancelPassword, setCancelPassword] = React.useState("");
  
  const [editingItem, setEditingItem] = React.useState<CartItem | null>(null);
  const [editQty, setEditQty] = React.useState(1);
  const [editNote, setEditNote] = React.useState("");

  const orderContext = useOrderContextStore((s) => s.currentOrder);

  const carts = useCartStore((s) => s.carts);
  const currentContextId = useCartStore((s) => s.currentContextId);
  const clearCart = useCartStore((s) => s.clearCart);
  const removeFromCartGlobal = useCartStore((s) => s.removeFromCartGlobal);
  const addToCartGlobal = useCartStore((s) => s.addToCartGlobal);
  const setCartItemsGlobal = useCartStore((s) => s.setCartItems);

  const cart = currentContextId ? carts[currentContextId] || STABLE_EMPTY_ARRAY : STABLE_EMPTY_ARRAY;

  const activeOrders = useActiveOrdersStore((s) => s.activeOrders);
  const appendOrder = useActiveOrdersStore((s) => s.appendOrder);
  const markItemsSent = useActiveOrdersStore((s) => s.markItemsSent);
  const closeActiveOrder = useActiveOrdersStore((s) => s.closeActiveOrder);

  const activeOrder = useMemo(() => {
    if (!orderContext) return undefined;

    return activeOrders.find((o) => {
      if (orderContext.orderType === "DINE_IN") {
        return (
          o.context.orderType === "DINE_IN" &&
          o.context.section === orderContext.section &&
          o.context.tableNo === orderContext.tableNo
        );
      }

      if (orderContext.orderType === "TAKEAWAY") {
        return (
          o.context.orderType === "TAKEAWAY" &&
          o.context.takeawayNo === orderContext.takeawayNo
        );
      }

      return false;
    });
  }, [activeOrders, orderContext]);

  const displayItems = useMemo(() => {
    const sentItems: (OrderItem | CartItem)[] = activeOrder?.items || [];
    return [...sentItems, ...cart];
  }, [activeOrder, cart]);

  const subtotal = useMemo(() => {
    return displayItems.reduce((sum, item) => {
      return sum + (item.price || 0) * item.qty;
    }, 0);
  }, [displayItems]);

  const tables = useTableStatusStore((s) => s.tables);
  const updateTableStatus = useTableStatusStore((s) => s.updateTableStatus);

  const currentTableData = useMemo(() => {
    if (orderContext?.orderType !== "DINE_IN") return undefined;

    return tables.find(
      (t) =>
        t.section === orderContext.section &&
        t.tableNo === orderContext.tableNo,
    );
  }, [orderContext, tables]);

  React.useEffect(() => {
    if (!orderContext) {
      router.replace("/(tabs)/category");
    }
  }, [orderContext, router]);

  if (!orderContext) {
    return null;
  }

  const sendOrder = () => {
    const context = orderContext;

    if (!context || cart.length === 0) return;

    let targetOrderId = activeOrder?.orderId;

    if (!targetOrderId) targetOrderId = getNextOrderId();

    appendOrder(targetOrderId, context, cart);
    markItemsSent(targetOrderId);

    if (context.orderType === "DINE_IN") {
      updateTableStatus(
        context.section!,
        context.tableNo!,
        targetOrderId,
        "SENT",
      );

      clearCart();

      router.replace(`/(tabs)/category?section=${context.section}`);
    } else if (context.orderType === "TAKEAWAY") {
      updateTableStatus("TAKEAWAY", context.takeawayNo!, targetOrderId, "SENT");

      clearCart();

      router.replace(`/(tabs)/category?section=TAKEAWAY`);
    } else {
      clearCart();
      router.replace("/(tabs)/category");
    }
  };

  const handleCancelOrder = () => {
    if (cancelPassword !== "786") {
      Alert.alert("Error", "Incorrect admin password.");
      return;
    }

    if (activeOrder) closeActiveOrder(activeOrder.orderId);
    clearCart();
    if (orderContext.orderType === "DINE_IN" && orderContext.section && orderContext.tableNo) {
      updateTableStatus(orderContext.section, orderContext.tableNo, "", "EMPTY");
    }
    
    setShowCancelModal(false);
    setCancelPassword("");
    router.replace("/(tabs)/category");
  };

  const handleEditItemSave = () => {
    if (!editingItem || !currentContextId) return;
    
    // Create new cart list with updated item
    const updatedCart = cart.map(item => {
      if (item.lineItemId === editingItem.lineItemId) {
        return { ...item, qty: editQty, note: editNote };
      }
      return item;
    });

    setCartItemsGlobal(currentContextId, updatedCart);
    setEditingItem(null);
  };

  const handleEditItemDelete = () => {
    if (!editingItem) return;
    removeFromCartGlobal(editingItem.lineItemId);
    setEditingItem(null);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={require("../assets/images/mesh_bg.png")}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={[styles.container, isTablet && styles.containerTablet]}>
            <View style={styles.topBar}>
              <Pressable
                style={styles.back}
                onPress={() => router.back()}
              >
                <Text style={styles.topBtnText}>Back</Text>
              </Pressable>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable 
                  style={[styles.clear, { backgroundColor: "rgba(239, 68, 68, 0.25)" }]} 
                  onPress={() => setShowCancelModal(true)}
                >
                  <Text style={[styles.topBtnText, { color: "#fca5a5" }]}>Cancel Order</Text>
                </Pressable>
                <Pressable style={styles.clear} onPress={() => clearCart()}>
                  <Text style={styles.topBtnText}>Clear Cart</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.contextText}>
              {orderContext.orderType === "DINE_IN"
                ? `DINE-IN • ${orderContext.section} • Table ${orderContext.tableNo}`
                : `TAKEAWAY • Order ${orderContext.takeawayNo}`}
            </Text>

            <Text style={styles.title}>CART</Text>

            <FlatList
              data={displayItems}
              keyExtractor={(i, index) => i.lineItemId + index}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const isSent = "status" in item && item.status === "SENT";

                return (
                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    disabled={isSent}
                    onPress={() => {
                      setEditingItem(item as CartItem);
                      setEditQty(item.qty);
                      setEditNote(item.note || "");
                    }}
                  >
                    <BlurView intensity={40} tint="dark" style={styles.row}>
                    <View style={styles.itemInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.name, isSent && styles.sentName]}>
                          {item.name}
                        </Text>
                        {isSent ? (
                          <View style={styles.sentBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={12}
                              color="#a7f3d0"
                            />
                            <Text style={styles.sentBadgeText}>SENT</Text>
                          </View>
                        ) : (
                          <View style={styles.newBadge}>
                            <Ionicons name="ellipse" size={8} color="#60a5fa" />
                            <Text style={styles.newBadgeText}>NEW</Text>
                          </View>
                        )}
                      </View>

                      {"spicy" in item &&
                        item.spicy &&
                        item.spicy !== "Medium" && (
                          <Text style={styles.modifier}>
                            Spicy: {item.spicy}
                          </Text>
                        )}

                      {"oil" in item && item.oil && item.oil !== "Normal" && (
                        <Text style={styles.modifier}>Oil: {item.oil}</Text>
                      )}

                      {"salt" in item &&
                        item.salt &&
                        item.salt !== "Normal" && (
                          <Text style={styles.modifier}>Salt: {item.salt}</Text>
                        )}

                      {"sugar" in item &&
                        item.sugar &&
                        item.sugar !== "Normal" && (
                          <Text style={styles.modifier}>
                            Sugar: {item.sugar}
                          </Text>
                        )}

                      {"note" in item && item.note && (
                        <Text style={styles.modifier}>Note: {item.note}</Text>
                      )}

                      {"modifiers" in item && Array.isArray(item.modifiers) && item.modifiers.map((mod: any, idx: number) => (
                        <Text key={`mod-${idx}`} style={styles.modifier}>
                          + {mod.ModifierName}
                          {mod.Price ? ` ($${mod.Price.toFixed(2)})` : ""}
                        </Text>
                      ))}

                      <Text style={styles.qty}>Qty: {item.qty}</Text>

                      <Text style={styles.price}>
                        ${(item.price || 0).toFixed(2)}
                      </Text>
                    </View>

                    {!isSent && (
                      <View style={styles.actionRow}>
                        <Pressable
                          style={styles.plus}
                          onPress={() => addToCartGlobal(item as CartItem)}
                        >
                          <Ionicons name="add" size={22} color="#fff" />
                        </Pressable>

                        <Pressable
                          style={styles.minus}
                          onPress={() => removeFromCartGlobal(item.lineItemId)}
                        >
                          <Ionicons name="remove" size={22} color="#fff" />
                        </Pressable>
                      </View>
                    )}
                  </BlurView>
                </TouchableOpacity>
                );
              }}
            />

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.bottomButtons}>
              {/* If cart has items, show Hold and Send */}
              {cart.length > 0 && (
                <>
                  <Pressable
                    style={[styles.btn, { backgroundColor: "#3b82f6" }]}
                    onPress={() => {
                      let targetOrderId = activeOrder?.orderId;
                      if (!targetOrderId) {
                        targetOrderId = getNextOrderId();
                      }

                      // Update table status to HOLD
                      if (orderContext.orderType === "DINE_IN") {
                        updateTableStatus(orderContext.section!, orderContext.tableNo!, targetOrderId, 'HOLD');
                        holdOrder(targetOrderId, cart, orderContext);
                        clearCart();
                      } else if (orderContext.orderType === "TAKEAWAY") {
                        updateTableStatus("TAKEAWAY", orderContext.takeawayNo!, targetOrderId, 'HOLD');
                        holdOrder(targetOrderId, cart, orderContext);
                        clearCart();
                      }

                      if (orderContext.orderType === "DINE_IN") {
                        router.replace(`/(tabs)/category?section=${orderContext.section}`);
                      } else if (orderContext.orderType === "TAKEAWAY") {
                        router.replace(`/(tabs)/category?section=TAKEAWAY`);
                      } else {
                        router.replace("/(tabs)/category");
                      }
                    }}
                  >
                    <Text style={styles.btnText}>Hold</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.btn, { backgroundColor: "#22c55e" }]}
                    onPress={sendOrder}
                  >
                    <Text style={[styles.btnText, { color: "#052b12" }]}>
                      Send
                    </Text>
                  </Pressable>
                </>
              )}

              {/* If no new items, check table status for Checkout or Proceed */}
              {cart.length === 0 && activeOrder && (
                <>
                  {!currentTableData ||
                  currentTableData.status === "SENT" ||
                  currentTableData.status === "HOLD" ? (
                    <Pressable
                      style={[styles.btn, { backgroundColor: "#f59e0b" }]} 
                      onPress={() => {
                        if (orderContext.orderType === "DINE_IN") {
                          updateTableStatus(
                            orderContext.section!,
                            orderContext.tableNo!,
                            activeOrder.orderId,
                            "BILL_REQUESTED",
                          );
                          router.replace(
                            `/(tabs)/category?section=${orderContext.section}`,
                          );
                        } else {
                          router.push("/summary");
                        }
                      }}
                    >
                      <Text style={styles.btnText}>Checkout</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.btn, { backgroundColor: "#0ea5e9" }]} 
                      onPress={() => router.push("/summary")}
                    >
                      <Text style={styles.btnText}>Proceed</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </ImageBackground>

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

      {/* EDIT ITEM MODAL */}
      <Modal transparent visible={!!editingItem} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editing {editingItem?.name}</Text>
            
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 15 }}>
              <Text style={{ color: "#fff", fontSize: 16 }}>Quantity</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
                <TouchableOpacity 
                  style={[styles.minus, { width: 40, height: 40 }]} 
                  onPress={() => setEditQty(q => Math.max(1, q - 1))}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold", width: 30, textAlign: "center" }}>
                  {editQty}
                </Text>
                <TouchableOpacity 
                  style={[styles.plus, { width: 40, height: 40 }]} 
                  onPress={() => setEditQty(q => q + 1)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={{ color: "#9ca3af", fontSize: 14, marginTop: 10, marginBottom: 5 }}>Special Instructions:</Text>
            <TextInput
              style={[styles.modalInput, { marginBottom: 15 }]}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="e.g. Less spicy, no onions"
              placeholderTextColor="#6b7280"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtnCancel, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]} 
                onPress={handleEditItemDelete}
              >
                <Text style={[styles.modalBtnTextCancel, { color: "#ef4444" }]}>Delete Item</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditingItem(null)}>
                  <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtnConfirm, { backgroundColor: "#3b82f6" }]} onPress={handleEditItemSave}>
                  <Text style={styles.modalBtnTextConfirm}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },

  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },

  containerTablet: {
    maxWidth: 700,
    alignSelf: "center",
    width: "100%",
    paddingTop: 20,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "transparent",
    zIndex: 2,
    elevation: 2,
  },

  back: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  clear: {
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  topBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  contextText: {
    color: "#cbd5e1",
    marginBottom: 6,
    fontWeight: "800",
    fontSize: 14,
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 20,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },

  itemInfo: { flex: 1 },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },

  name: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 17,
  },

  sentName: { color: "#94a3b8" },

  sentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },

  sentBadgeText: { color: "#a7f3d0", fontSize: 10, fontWeight: "900" },

  newBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59,130,246,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },

  newBadgeText: { color: "#93c5fd", fontSize: 10, fontWeight: "900" },

  modifier: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 2,
    fontWeight: "600",
  },

  qty: { color: "#cbd5e1", marginTop: 6, fontWeight: "800", fontSize: 14 },

  price: { color: "#22c55e", marginTop: 4, fontWeight: "900", fontSize: 16 },

  actionRow: { flexDirection: "row", gap: 12 },

  plus: {
    backgroundColor: "#22c55e",
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  minus: {
    backgroundColor: "#ef4444",
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 20,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  summaryLabel: { color: "#fff", fontWeight: "900", fontSize: 16 },

  summaryValue: {
    color: "#22c55e",
    fontWeight: "900",
    fontSize: 22,
  },

  bottomButtons: { flexDirection: "row", gap: 12, marginTop: 10 },

  btn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: { color: "#fff", fontWeight: "900", fontSize: 20 },

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
