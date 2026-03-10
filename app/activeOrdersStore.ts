import { create } from "zustand";
import { CartItem } from "./cartStore";
import { OrderContext } from "./orderContextStore";

/* ================= TYPES ================= */

export type OrderItem = CartItem & {
  status: "NEW" | "SENT";
};

export type ActiveOrder = {
  orderId: string;
  context: OrderContext;
  items: OrderItem[];
  createdAt: number;
};

type ActiveOrdersState = {
  activeOrders: ActiveOrder[];
  appendOrder: (orderId: string, context: OrderContext, cartItems: CartItem[]) => void;
  markItemsSent: (orderId: string) => void;
  closeActiveOrder: (orderId: string) => void;
};

/* ================= STORE ================= */

export const useActiveOrdersStore = create<ActiveOrdersState>((set, get) => ({
  activeOrders: [],

  /* ================= APPEND ORDER (Create OR Add Items) ================= */
  appendOrder: (orderId, context, cartItems) => {
    const { activeOrders } = get();

    // Check if order exists for this context
    const existingOrderIndex = activeOrders.findIndex((o) => {
      if (context.orderType === "DINE_IN") {
        return (
          o.context.orderType === "DINE_IN" &&
          o.context.section === context.section &&
          o.context.tableNo === context.tableNo
        );
      }
      if (context.orderType === "TAKEAWAY") {
        return (
          o.context.orderType === "TAKEAWAY" &&
          o.context.takeawayNo === context.takeawayNo
        );
      }
      return false;
    });

    if (existingOrderIndex === -1) {
      // 1. Order Doesn't Exist -> Create New
      const newOrder: ActiveOrder = {
        orderId,
        context,
        items: cartItems.map((i) => ({ ...i, status: "NEW" })),
        createdAt: Date.now(),
      };
      set({ activeOrders: [...activeOrders, newOrder] });
    } else {
      // 2. Order Exists -> Add items, handling quantity correctly with lineItemId
      const updatedOrders = [...activeOrders];
      const existingOrder = { ...updatedOrders[existingOrderIndex] };
      existingOrder.items = [...existingOrder.items];

      cartItems.forEach((cartItem) => {
        // Look for exact item in NEW status
        const itemIndex = existingOrder.items.findIndex(
          (i) => i.lineItemId === cartItem.lineItemId && i.status === "NEW"
        );

        if (itemIndex > -1) {
          // Increment qty if already added in this round
          existingOrder.items[itemIndex] = {
            ...existingOrder.items[itemIndex],
            qty: existingOrder.items[itemIndex].qty + cartItem.qty,
          };
        } else {
          // Add as new line
          existingOrder.items.push({ ...cartItem, status: "NEW" });
        }
      });

      updatedOrders[existingOrderIndex] = existingOrder;
      set({ activeOrders: updatedOrders });
    }
  },

  /* ================= MARK SENT ================= */
  markItemsSent: (orderId) => {
    const { activeOrders } = get();
    set({
      activeOrders: activeOrders.map((order) => {
        if (order.orderId !== orderId) return order;

        return {
          ...order,
          items: order.items.map((item) =>
            item.status === "NEW" ? { ...item, status: "SENT" } : item
          ),
        };
      }),
    });
  },

  /* ================= CLOSE ORDER ================= */
  closeActiveOrder: (orderId) => {
    const { activeOrders } = get();
    set({
      activeOrders: activeOrders.filter((o) => o.orderId !== orderId),
    });
  },
}));

/* ================= BACKGROUND COMPATIBILITY ================= */

export const getActiveOrders = () => useActiveOrdersStore.getState().activeOrders;

export const findActiveOrder = (context: OrderContext) => {
  return useActiveOrdersStore.getState().activeOrders.find((o) => {
    if (context.orderType === "DINE_IN") {
      return (
        o.context.orderType === "DINE_IN" &&
        o.context.section === context.section &&
        o.context.tableNo === context.tableNo
      );
    }

    if (context.orderType === "TAKEAWAY") {
      return (
        o.context.orderType === "TAKEAWAY" &&
        o.context.takeawayNo === context.takeawayNo
      );
    }

    return false;
  });
};

// Map legacy function to new store logic
export const createActiveOrder = (orderId: string, context: OrderContext, cart: CartItem[]) => {
    useActiveOrdersStore.getState().appendOrder(orderId, context, cart);
};

export const addItemsToActiveOrder = (order: ActiveOrder, items: CartItem[]) => {
    useActiveOrdersStore.getState().appendOrder(order.orderId, order.context, items);
};

export const markItemsSent = (order: ActiveOrder) => {
    useActiveOrdersStore.getState().markItemsSent(order.orderId);
};

export const closeActiveOrder = (orderId: string) => {
    useActiveOrdersStore.getState().closeActiveOrder(orderId);
};
