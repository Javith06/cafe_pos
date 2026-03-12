import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

export type CartItem = {
  lineItemId: string; // Unique ID for this specific cart instance
  id: string; // Product ID
  name: string;
  price?: number;
  qty: number;

  spicy?: string;
  oil?: string;
  salt?: string;
  sugar?: string;
  note?: string;
};

type CartState = {
  carts: Record<string, CartItem[]>;
  currentContextId: string | null;
  setCurrentContext: (contextId: string | null) => void;
  getCart: () => CartItem[];
  addToCartGlobal: (item: Omit<CartItem, "qty" | "lineItemId">) => void;
  removeFromCartGlobal: (lineItemId: string) => void;
  clearCart: () => void;
  clearAllCarts: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  carts: {},
  currentContextId: null,

  setCurrentContext: (contextId) => set({ currentContextId: contextId }),

  getCart: () => {
    const { carts, currentContextId } = get();
    if (!currentContextId) return [];
    return carts[currentContextId] || [];
  },

  addToCartGlobal: (item) => {
    const { carts, currentContextId } = get();
    if (!currentContextId) return; // Prevent adding if no context

    const currentCart = carts[currentContextId] || [];

    const existing = currentCart.find(
      (p) =>
        p.id === item.id &&
        p.spicy === item.spicy &&
        p.oil === item.oil &&
        p.salt === item.salt &&
        p.sugar === item.sugar &&
        p.note === item.note
    );

    if (existing) {
      set({
        carts: {
          ...carts,
          [currentContextId]: currentCart.map((p) =>
            p.lineItemId === existing.lineItemId
              ? { ...p, qty: p.qty + 1 }
              : p
          ),
        },
      });
    } else {
      set({
        carts: {
          ...carts,
          [currentContextId]: [...currentCart, { ...item, qty: 1, lineItemId: uuidv4() }],
        },
      });
    }
  },

  removeFromCartGlobal: (lineItemId) => {
    const { carts, currentContextId } = get();
    if (!currentContextId) return;

    const currentCart = carts[currentContextId] || [];
    const item = currentCart.find((p) => p.lineItemId === lineItemId);

    if (!item) return;

    if (item.qty > 1) {
      set({
        carts: {
          ...carts,
          [currentContextId]: currentCart.map((p) =>
            p.lineItemId === lineItemId ? { ...p, qty: p.qty - 1 } : p
          ),
        },
      });
    } else {
      set({
         carts: {
           ...carts,
           [currentContextId]: currentCart.filter((p) => p.lineItemId !== lineItemId),
         },
      });
    }
  },

  clearCart: () => {
    const { carts, currentContextId } = get();
    if (!currentContextId) return;
    
    set({
      carts: {
        ...carts,
        [currentContextId]: [],
      },
    });
  },

  clearAllCarts: () => set({ carts: {}, currentContextId: null }),
}));

// Helper to generate context ID
export const getContextId = (context?: { orderType: string, section?: string, tableNo?: string, takeawayNo?: string } | null) => {
  if (!context) return null;
  if (context.orderType === "DINE_IN") return `DINE_IN_${context.section}_${context.tableNo}`;
  if (context.orderType === "TAKEAWAY") return `TAKEAWAY_${context.takeawayNo}`;
  return null;
}

// Backwards compatibility functions, though it's recommended to use hooks directly in React components.
export const getCart = () => useCartStore.getState().getCart();
export const addToCartGlobal = (item: Omit<CartItem, "qty" | "lineItemId">) => useCartStore.getState().addToCartGlobal(item);
export const removeFromCartGlobal = (lineItemId: string) => useCartStore.getState().removeFromCartGlobal(lineItemId);
export const clearCart = () => useCartStore.getState().clearCart();
export const setCurrentContext = (contextId: string | null) => useCartStore.getState().setCurrentContext(contextId);

export const subscribeCart = (listener: () => void) => {
  return useCartStore.subscribe(listener);
};
