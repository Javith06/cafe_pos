import { create } from "zustand";
import { CartItem } from "./cartStore";
import { OrderContext } from "./orderContextStore";

/* ================= TYPES ================= */

export type OrderItem = CartItem & {
  status: "NEW" | "SENT";
  sentAt?: number;
};

export type ActiveOrder = {
  orderId: string;
  context: OrderContext;
  items: OrderItem[];
  createdAt: number;
};

type ActiveOrdersState = {
  activeOrders: ActiveOrder[];
  appendOrder: (
    orderId: string,
    context: OrderContext,
    cartItems: CartItem[],
  ) => void;
  markItemsSent: (orderId: string) => void;
  closeActiveOrder: (orderId: string) => void;
};

/* ================= STORE ================= */

export const useActiveOrdersStore = create<ActiveOrdersState>((set, get) => ({
  activeOrders: [],

  /* ================= APPEND ORDER ================= */

  appendOrder: (orderId, context, cartItems) => {
    const { activeOrders } = get();

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

    /* CREATE NEW ORDER */

    if (existingOrderIndex === -1) {
      const newOrder: ActiveOrder = {
        orderId,
        context,
        items: cartItems.map((i) => ({
          ...i,
          status: "NEW",
        })),
        createdAt: Date.now(),
      };

      set({ activeOrders: [...activeOrders, newOrder] });

      return;
    }

    /* ADD ITEMS TO EXISTING ORDER */

    const updatedOrders = [...activeOrders];
    const existingOrder = { ...updatedOrders[existingOrderIndex] };

    existingOrder.items = [...existingOrder.items];

    cartItems.forEach((cartItem) => {
      const itemIndex = existingOrder.items.findIndex(
        (i) => i.lineItemId === cartItem.lineItemId && i.status === "NEW",
      );

      if (itemIndex > -1) {
        existingOrder.items[itemIndex] = {
          ...existingOrder.items[itemIndex],
          qty: existingOrder.items[itemIndex].qty + cartItem.qty,
        };
      } else {
        existingOrder.items.push({
          ...cartItem,
          status: "NEW",
        });
      }
    });

    updatedOrders[existingOrderIndex] = existingOrder;

    set({ activeOrders: updatedOrders });
  },

  /* ================= MARK ITEMS SENT ================= */

  markItemsSent: (orderId) => {
    const { activeOrders } = get();

    const now = Date.now();

    set({
      activeOrders: activeOrders.map((order) => {
        if (order.orderId !== orderId) return order;

        return {
          ...order,

          items: order.items.map((item) => {
            if (item.status === "NEW") {
              return {
                ...item,
                status: "SENT",
                sentAt: now,
              };
            }

            return item;
          }),
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

/* ================= HELPERS ================= */

export const getActiveOrders = () =>
  useActiveOrdersStore.getState().activeOrders;

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
