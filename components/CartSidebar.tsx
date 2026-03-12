import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  DimensionValue,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { OrderItem, useActiveOrdersStore } from "../app/activeOrdersStore";
import { CartItem, useCartStore } from "../app/cartStore";
import { useOrderContextStore } from "../app/orderContextStore";
import { getNextOrderId } from "../app/orderIdStore";
import { setTableActive } from "../app/tableStatusStore";

interface CartSidebarProps {
  width?: DimensionValue;
}

export default function CartSidebar({ width = 350 }: CartSidebarProps) {
  const router = useRouter();

  // Zustand Hooks
  const orderContext = useOrderContextStore((state) => state.currentOrder);
  const carts = useCartStore((state) => state.carts);
  const currentContextId = useCartStore((state) => state.currentContextId);
  const removeFromCartGlobal = useCartStore((state) => state.removeFromCartGlobal);
  const addToCartGlobal = useCartStore((state) => state.addToCartGlobal);
  const clearCart = useCartStore((state) => state.clearCart);

  const cart = currentContextId ? carts[currentContextId] || [] : [];

  const activeOrders = useActiveOrdersStore((state) => state.activeOrders);
  const appendOrder = useActiveOrdersStore((state) => state.appendOrder);
  const markItemsSent = useActiveOrdersStore((state) => state.markItemsSent);

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

  // COMBINE SENT ITEMS AND NEW ITEMS FOR THE TICKET VIEW
  const displayItems = useMemo(() => {
    const sentItems: (OrderItem | CartItem)[] = activeOrder?.items || [];
    return [...sentItems, ...cart];
  }, [activeOrder, cart]);

  const subtotal = useMemo(() => {
    return displayItems.reduce((sum, item) => {
      return sum + (item.price || 0) * item.qty;
    }, 0);
  }, [displayItems]);

  if (!orderContext) {
    return (
      <View style={[styles.container, { width }]}>
        <View style={styles.surface}>
            <Text style={styles.emptyText}>No Active Order Context</Text>
        </View>
      </View>
    );
  }

  /* ================= SEND ORDER ================= */
  const sendOrder = () => {
    const context = orderContext;
    if (!context || cart.length === 0) return;

    let targetOrderId = activeOrder?.orderId;
    if (!targetOrderId) {
      targetOrderId = getNextOrderId();
    }

    appendOrder(targetOrderId, context, cart);
    markItemsSent(targetOrderId);

    if (context.orderType === "DINE_IN") {
      setTableActive(context.section!, context.tableNo!, targetOrderId);
      clearCart();
      router.replace(`/(tabs)/category?section=${context.section}`);
    } else if (context.orderType === "TAKEAWAY") {
      setTableActive("TAKEAWAY", context.takeawayNo!, targetOrderId);
      clearCart();
      router.replace(`/(tabs)/category?section=TAKEAWAY`);
    } else {
      clearCart();
      router.replace("/(tabs)/category");
    }
  };

  return (
    <View style={[styles.container, { width }]}>
      <View style={styles.surface}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.holdListBtn}
            onPress={() => router.push("/heldOrders")}
          >
            <Text style={styles.holdText}>Held Orders</Text>
          </Pressable>

          <View style={styles.topRightGroup}>
            <Pressable style={styles.clear} onPress={() => clearCart()}>
              <Text style={styles.topBtnText}>Clear Cart</Text>
            </Pressable>
          </View>
        </View>

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
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Cart is Empty</Text>
          }
          renderItem={({ item }) => {
            const isSent = "status" in item && item.status === "SENT";

            return (
              <View style={styles.row}>
                <View style={styles.itemInfo}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
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

                {!isSent && (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => removeFromCartGlobal(item.lineItemId!)}
                    >
                      <Ionicons name="remove" size={20} color="#f3f4f6" />
                    </Pressable>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => {
                        const { qty, lineItemId, ...rest } = item as CartItem;
                        addToCartGlobal(rest);
                      }}
                    >
                      <Ionicons name="add" size={20} color="#f3f4f6" />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
        />

        {/* SUMMARY & CHECKOUT */}
        <View style={styles.bottomBlock}>
          <Text style={styles.subtotalText}>
            Subtotal: ${subtotal.toFixed(2)}
          </Text>

          <View style={styles.checkoutRow}>
            {cart.length > 0 && (
              <>
                <Pressable
                  style={[styles.checkoutBtn, { backgroundColor: "rgba(249,115,22,0.85)" }]}
                  onPress={() => {
                     const { holdOrder } = require("../app/heldOrdersStore");
                     let targetOrderId = activeOrder?.orderId;
                     if (!targetOrderId) {
                       targetOrderId = getNextOrderId();
                     }
                     holdOrder(targetOrderId, cart, orderContext);
                     if (orderContext.orderType === "DINE_IN") {
                       router.replace(`/(tabs)/category?section=${orderContext.section}`);
                     } else if (orderContext.orderType === "TAKEAWAY") {
                       router.replace(`/(tabs)/category?section=TAKEAWAY`);
                     } else {
                       router.replace("/(tabs)/category");
                     }
                  }}
                >
                  <Text style={styles.checkoutBtnText}>Hold</Text>
                </Pressable>
                <Pressable
                  style={[styles.checkoutBtn, { backgroundColor: "rgba(34,197,94,0.85)" }]}
                  onPress={sendOrder}
                >
                  <Text style={[styles.checkoutBtnText, { color: "#052b12" }]}>
                    Send
                  </Text>
                </Pressable>
              </>
            )}

            {(activeOrder?.items.length || 0) > 0 && cart.length === 0 && (
              <Pressable
                style={[styles.checkoutBtn, { backgroundColor: "rgba(14,165,233,0.85)" }]}
                onPress={() => router.push("/summary")}
              >
                <Text style={styles.checkoutBtnText}>Proceed</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    padding: 12,
  },
  surface: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.85)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  topRightGroup: {
    flexDirection: "row",
    gap: 8,
  },
  holdListBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F97316",
  },
  holdText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  clear: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  topBtnText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 14,
  },
  contextText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  title: {
    color: "#e5e7eb",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    color: "#f3f4f6",
    fontWeight: "800",
    fontSize: 16,
  },
  sentName: {
    color: "#6b7280",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 6,
  },
  sentBadgeText: { color: "#a7f3d0", fontSize: 12, fontWeight: "800", marginLeft: 2 },
  newBadgeText: { color: "#93c5fd", fontSize: 12, fontWeight: "800", marginLeft: 2 },
  modifierContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  modifierText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
  },
  qty: {
    color: "#6b7280",
    marginTop: 2,
    fontSize: 14,
    fontWeight: "600",
  },
  price: {
    color: "#059669",
    fontWeight: "800",
    fontSize: 15,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomBlock: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginTop: 10,
  },
  subtotalText: {
    color: "#f3f4f6",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right",
    marginBottom: 16,
  },
  checkoutRow: {
    flexDirection: "row",
    gap: 12,
  },
  checkoutBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutBtnText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 18,
  },
});
