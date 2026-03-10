import { BlurView } from "expo-blur";
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

import { useCartStore, CartItem } from "../app/cartStore";
import { getNextOrderId } from "../app/orderIdStore";
import { setTableActive } from "../app/tableStatusStore";
import { useActiveOrdersStore, OrderItem } from "../app/activeOrdersStore";
import { useOrderContextStore } from "../app/orderContextStore";

interface CartSidebarProps {
  width?: DimensionValue;
}

export default function CartSidebar({ width = 350 }: CartSidebarProps) {
  const router = useRouter();

  // Zustand Hooks
  const orderContext = useOrderContextStore((state) => state.currentOrder);
  const cart = useCartStore((state) => state.cart);
  const addToCartGlobal = useCartStore((state) => state.addToCartGlobal);
  const removeFromCartGlobal = useCartStore((state) => state.removeFromCartGlobal);
  const clearCart = useCartStore((state) => state.clearCart);

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
                      <Text style={styles.sentBadge}> ✓ SENT</Text>
                    ) : (
                      <Text style={styles.newBadge}> ● NEW</Text>
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
                      <Text style={styles.actionBtnText}>-</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => {
                        const { qty, lineItemId, ...rest } = item as CartItem;
                        addToCartGlobal(rest);
                      }}
                    >
                      <Text style={styles.actionBtnText}>+</Text>
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
                  style={[styles.checkoutBtn, { backgroundColor: "#f97316" }]}
                  onPress={() => {
                     // Wait, need to import holdOrder
                     // will fix this import or logic later if needed
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
                  style={[styles.checkoutBtn, { backgroundColor: "#22c55e" }]}
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
                style={[styles.checkoutBtn, { backgroundColor: "#0ea5e9" }]}
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    color: "#4b5563",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 10,
  },
  emptyText: {
    color: "#9ca3af",
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
    borderColor: "#f3f4f6",
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 16,
  },
  sentName: {
    color: "#4b5563",
  },
  sentBadge: { color: "#22c55e", fontSize: 12, fontWeight: "800", marginLeft: 4 },
  newBadge: { color: "#3b82f6", fontSize: 12, fontWeight: "800", marginLeft: 4 },
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
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnText: {
    color: "#111827",
    fontWeight: "900",
    fontSize: 18,
  },
  bottomBlock: {
    paddingTop: 16,
    borderTopWidth: 2,
    borderColor: "#e5e7eb",
    marginTop: 10,
  },
  subtotalText: {
    color: "#111827",
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
