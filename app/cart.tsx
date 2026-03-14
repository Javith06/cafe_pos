import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
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

import { CartItem, useCartStore } from "./cartStore";
import { getNextOrderId } from "./orderIdStore";
import { updateTableStatus, getTables } from "./tableStatusStore";


import { OrderItem, useActiveOrdersStore } from "./activeOrdersStore";

import { useOrderContextStore } from "./orderContextStore";

export default function CartScreen() {
  const router = useRouter();
  
  // Zustand Hooks
  const orderContext = useOrderContextStore((state) => state.currentOrder);
  const carts = useCartStore((state) => state.carts);
  const currentContextId = useCartStore((state) => state.currentContextId);
  const clearCart = useCartStore((state) => state.clearCart);
  const removeFromCartGlobal = useCartStore((state) => state.removeFromCartGlobal);
  const addToCartGlobal = useCartStore((state) => state.addToCartGlobal);

  const cart = currentContextId ? carts[currentContextId] || [] : [];
  
  const activeOrders = useActiveOrdersStore((state) => state.activeOrders);
  const appendOrder = useActiveOrdersStore((state) => state.appendOrder);
  const markItemsSent = useActiveOrdersStore((state) => state.markItemsSent);

  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

  // Find active order for this context
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

  const currentTableData = useMemo(() => {
    if (orderContext?.orderType !== "DINE_IN") return undefined;
    const tables = getTables();
    return tables.find(t => t.section === orderContext.section && t.tableNo === orderContext.tableNo);
  }, [orderContext]);


  // COMBINE SENT ITEMS AND NEW ITEMS FOR THE TICKET VIEW
  const displayItems = useMemo(() => {
    // Cast to slightly generic type to handle both
    const sentItems: (OrderItem | CartItem)[] = activeOrder?.items || [];
    return [...sentItems, ...cart];
  }, [activeOrder, cart]);

  const subtotal = useMemo(() => {
    return displayItems.reduce((sum, item) => {
      return sum + (item.price || 0) * item.qty;
    }, 0);
  }, [displayItems]);

  if (!orderContext) {
    router.replace("/(tabs)/category");
    return null;
  }

  /* ================= SEND ORDER ================= */

  const sendOrder = () => {
    const context = orderContext;

    if (!context || cart.length === 0) return;

    // Use append logic. If there's an active order, append. Else create new one.
    let targetOrderId = activeOrder?.orderId;
    if (!targetOrderId) {
      targetOrderId = getNextOrderId();
    }

    appendOrder(targetOrderId, context, cart);
    markItemsSent(targetOrderId);

    /* mark table active */
    if (context.orderType === "DINE_IN") {
      updateTableStatus(context.section!, context.tableNo!, targetOrderId, 'SENT');
      clearCart();
      router.replace(`/(tabs)/category?section=${context.section}`);
    } else if (context.orderType === "TAKEAWAY") {
      updateTableStatus("TAKEAWAY", context.takeawayNo!, targetOrderId, 'SENT');
      clearCart();
      router.replace(`/(tabs)/category?section=TAKEAWAY`);
    } else {
      clearCart();
      router.replace("/(tabs)/category");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ImageBackground
        source={require("../assets/images/a13.jpg")}
        style={{ width: SCREEN_W, height: SCREEN_H }}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* TOP BAR */}

          <BlurView intensity={40} tint="dark" style={styles.topBar}>


            <View style={styles.topRightGroup}>
              <Pressable style={styles.back} onPress={() => { clearCart(); router.back(); }}>
                <Text style={styles.topBtnText}>Back</Text>
              </Pressable>

              <Pressable style={styles.clear} onPress={() => clearCart()}>
                <Text style={styles.topBtnText}>Clear Cart</Text>
              </Pressable>
            </View>
          </BlurView>

          {/* ORDER HEADER */}

          {orderContext.orderType === "DINE_IN" && (
            <Text style={styles.contextText}>
              DINE-IN | {orderContext.section} | Table {orderContext.tableNo}
            </Text>
          )}

          {orderContext.orderType === "TAKEAWAY" && (
            <Text style={styles.contextText}>
              TAKEAWAY | Order {orderContext.takeawayNo}
            </Text>
          )}

          <Text style={styles.title}>CART</Text>

          {/* COMBINED ITEMS LIST */}

          <FlatList
            data={displayItems}
            keyExtractor={(i, index) => i.lineItemId + index}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Cart is Empty</Text>
            }
            renderItem={({ item }) => {
              // Quick check if item is from ActiveOrder store (has status prop) or Cart store (missing status prop)
              const isSent = "status" in item && item.status === "SENT";

              return (
                <BlurView intensity={40} tint="dark" style={styles.row}>
                  <View style={styles.itemInfo}>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={[styles.name, isSent && styles.sentName]}>{item.name}</Text>

                      {isSent ? (
                        <View style={styles.badgeRow}>
                          <Ionicons name="checkmark-circle" size={14} color="#a7f3d0" />
                          <Text style={styles.sentBadgeText}>SENT</Text>
                        </View>
                      ) : (
                        <View style={styles.badgeRow}>
                          <Ionicons name="ellipse" size={10} color="#60a5fa" />
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>

                    {/* Modifiers Display Example */}
                    <View style={styles.modifierContainer}>
                       {item.spicy && item.spicy !== "Medium" && <Text style={styles.modifierText}>Spicy: {item.spicy}</Text>}
                       {item.oil && item.oil !== "Normal" && <Text style={styles.modifierText}>Oil: {item.oil}</Text>}
                       {item.salt && item.salt !== "Normal" && <Text style={styles.modifierText}>Salt: {item.salt}</Text>}
                       {item.sugar && item.sugar !== "Normal" && <Text style={styles.modifierText}>Sugar: {item.sugar}</Text>}
                       {item.note && <Text style={styles.modifierText}>Note: {item.note}</Text>}
                    </View>

                    <Text style={styles.qty}>Qty: {item.qty}</Text>

                    <Text style={styles.price}>
                      ${(item.price || 0).toFixed(2)}
                    </Text>
                  </View>

                  {/* Actions: Only allow editing for NEW unsent items */}
                  {!isSent && (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={styles.plus}
                        onPress={() => addToCartGlobal(item as CartItem)}
                      >
                        <Ionicons name="add" size={24} color="#fff" />
                      </Pressable>

                      <Pressable
                        style={styles.minus}
                        onPress={() => removeFromCartGlobal(item.lineItemId)}
                      >
                        <Ionicons name="remove" size={24} color="#fff" />
                      </Pressable>
                    </View>
                  )}
                </BlurView>
              );
            }}
          />

          <View style={styles.divider} />

          {/* SUBTOTAL */}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cart Total</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.divider} />

          {/* ACTION BUTTONS */}

          <View style={styles.bottomButtons}>
            {/* If cart has items, show Hold and Send */}
            {cart.length > 0 && (
              <>
                <Pressable
                  style={[styles.holdBtn, { backgroundColor: "#3b82f6" }]} // BLUE for HOLD
                  onPress={() => {
                    let targetOrderId = activeOrder?.orderId;
                    if (!targetOrderId) {
                      targetOrderId = getNextOrderId();
                    }
                    if (orderContext.orderType === "DINE_IN") {
                      updateTableStatus(orderContext.section!, orderContext.tableNo!, targetOrderId, 'HOLD');
                      router.replace(`/(tabs)/category?section=${orderContext.section}`);
                    } else if (orderContext.orderType === "TAKEAWAY") {
                      router.replace(`/(tabs)/category?section=TAKEAWAY`);
                    } else {
                      router.replace("/(tabs)/category");
                    }
                  }}
                >
                  <Text style={styles.sendText}>Hold</Text>
                </Pressable>
 
                <Pressable
                  style={styles.sendBtn}
                  onPress={sendOrder}
                >
                  <Text style={styles.sendText}>Send</Text>
                </Pressable>
              </>
            )}
 
            {/* If no new items, check table status for Checkout or Proceed */}
            {cart.length === 0 && activeOrder && (
              <>
                {(!currentTableData || currentTableData.status === 'SENT' || currentTableData.status === 'HOLD') ? (
                  <Pressable
                    style={[styles.holdBtn, { backgroundColor: "#f59e0b" }]} // YELLOW for Checkout
                    onPress={() => {
                      if (orderContext.orderType === "DINE_IN") {
                        updateTableStatus(orderContext.section!, orderContext.tableNo!, activeOrder.orderId, 'BILL_REQUESTED');
                        router.replace(`/(tabs)/category?section=${orderContext.section}`);
                      } else {
                        router.push("/summary");
                      }
                    }}
                  >
                    <Text style={styles.sendText}>Checkout</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.billBtn}
                    onPress={() => router.push("/summary")}
                  >
                    <Text style={styles.billText}>Proceed</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>

        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    padding: 20,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },

  topRightGroup: {
    flexDirection: "row",
    gap: 10,
  },

  back: {
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  clear: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  topBtnText: {
    color: "#fff",
    fontWeight: "700",
  },

  holdListBtn: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },

  holdText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 20,
  },

  contextText: {
    color: "#9ef01a",
    marginTop: 10,
    fontWeight: "800",
  },

  title: {
    color: "#9ef01a",
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 15,
  },

  emptyText: {
    color: "#fff",
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
    overflow: "hidden",
  },

  itemInfo: {
    flex: 1,
  },

  name: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  
  sentName: {
     color: "#a3a3a3",
  },

  qty: {
    color: "#9ef01a",
    marginTop: 5,
  },

  price: {
    color: "#fff",
    marginTop: 4,
    fontWeight: "900",
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },

  plus: {
    backgroundColor: "#22c55e",
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  minus: {
    backgroundColor: "#ef4444",
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 10,
  },
  
  sentBadgeText: {
    color: "#a7f3d0",
    marginLeft: 4,
    fontWeight: "bold",
    fontSize: 12,
  },
  
  newBadgeText: {
    color: "#93c5fd",
    marginLeft: 4,
    fontWeight: "bold",
    fontSize: 12,
  },

  modifierContainer: {
     marginTop: 4,
     marginBottom: 4,
  },
  
  modifierText: {
     color: "#9ca3af",
     fontSize: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 15,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  summaryLabel: {
    color: "#fff",
    fontWeight: "700",
  },

  summaryValue: {
    color: "#9ef01a",
    fontWeight: "900",
  },

  bottomButtons: {
    flexDirection: "row",
    gap: 12,
  },

  holdBtn: {
    flex: 1,
    backgroundColor: "#f59e0b",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  sendBtn: {
    flex: 1,
    backgroundColor: "#22c55e",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  
  disabledBtn: {
    backgroundColor: "#166534",
    opacity: 0.5,
  },

  billBtn: {
    flex: 1,
    backgroundColor: "#3b82f6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  sendText: {
    color: "#052b12",
    fontWeight: "900",
    fontSize: 20,
  },

  billText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 20,
  },
});
